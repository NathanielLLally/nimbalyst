import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { google } from 'googleapis';
import { onFormSubmit } from '@/lib/vapi-contact-tracker';
import { sendEmail } from '#lib/contact-email-sender';
import { formatContactSubmissionEmail } from '#lib/format-contact-submission-email';

const execFileAsync = promisify(execFile);

const CONTACT_NOTIFICATION_EMAIL = 'www@happytailspawcare.com';

interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  businessType: string;
  challenge: string;
  message: string;
  receiveMessages: boolean;
  recaptchaToken: string;
  timezone?: string;
  submittedAt?: string;
}

function formatTimestampInTimezone(isoString: string, timezone: string): string {
  try {
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
    });
    const formatted = formatter.format(date);
    return formatted;
  } catch (e) {
    return isoString;
  }
}

// Per-value validation cache. Re-submitting with an unchanged email/phone
// reuses the prior result instead of repeating the slow mxCheck / paid Twilio
// network calls — so a check only re-runs when that field's text changed.
// Module-scoped with a short TTL; keyed by the raw input value.
const VALIDATION_CACHE_TTL_MS = 10 * 60 * 1000;
type EmailValidationResult = { email: string; mxError: string; mxServer: string | null } | null;
type PhoneValidationResult = { formatted?: string; errorBody?: unknown };
const emailValidationCache = new Map<string, { result: EmailValidationResult; ts: number }>();
const phoneValidationCache = new Map<string, { result: PhoneValidationResult; ts: number }>();

function getCached<T>(cache: Map<string, { result: T; ts: number }>, key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < VALIDATION_CACHE_TTL_MS) return hit.result;
  if (hit) cache.delete(key);
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();
    console.log('📝 Form submission received:', { name: data.fullName, email: data.email, phone: data.phone, company: data.company });

    // Verify reCAPTCHA first — this gates the slower, paid email/phone checks
    // behind the bot score so automated submissions can't trigger them.
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    if (!isLocalhost) {
      console.log('🔍 Verifying reCAPTCHA...');
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${data.recaptchaToken}`,
      });

      const recaptchaData = await recaptchaResponse.json();
      console.log('✅ reCAPTCHA verification result:', { success: recaptchaData.success, score: recaptchaData.score });

      if (!recaptchaData.success || recaptchaData.score < 0.5) {
        console.log('❌ reCAPTCHA verification failed');
        return NextResponse.json(
          { error: 'reCAPTCHA verification failed' },
          { status: 400 }
        );
      }
    } else {
      console.log('⏭️  Skipping reCAPTCHA verification (localhost)');
    }

    // Validate email and phone together (in parallel) so that if both are wrong
    // the user is shown — and can fix — both at once, instead of one at a time.
    const scriptPath = path.join(process.cwd(), 'scripts', 'mxCheck.pl');

    // MX-level email verification via mxCheck.pl. Returns the emailValidation
    // payload on failure, or null when the address verifies.
    const runEmailCheck = async (): Promise<EmailValidationResult> => {
      try {
        console.log(`📧 Calling mxCheck.pl for ${data.email}...`);
        const { stdout } = await execFileAsync('perl', [scriptPath, '--email', data.email], { timeout: 30000 });
        const mxResults = JSON.parse(stdout);
        const mxResult = mxResults[0];
        console.log(`📧 mxCheck.pl returned: verified=${mxResult?.verified ? 1 : 0} mx=${mxResult?.mx_server ?? '-'} error=${mxResult?.error ?? '-'}`);
        // A "false positive check failed" error means the MX host is catch-all:
        // it accepts RCPT TO for any local part, so the mailbox can't be proven
        // to exist — but that doesn't prove it doesn't. Treat it as valid.
        const mxError: string = mxResult?.error ?? '';
        if (!mxResult?.verified && mxError.startsWith('false positive check failed')) {
          console.log(`📧 Catch-all domain for ${data.email} — accepting as valid (${mxError})`);
          return null;
        }
        if (!mxResult?.verified) {
          console.error(`❌ MX verification failed: email=${data.email} error=${mxResult?.error ?? 'unverified'}`);
          return { email: data.email, mxError: mxResult?.error ?? 'unverified', mxServer: mxResult?.mx_server ?? null };
        }
        return null;
      } catch (mxErr) {
        const errMsg = mxErr instanceof Error ? mxErr.message : String(mxErr);
        console.error('❌ mxCheck.pl call failed:', errMsg);
        return { email: data.email, mxError: errMsg, mxServer: null };
      }
    };

    // Only re-run the check when the email text changed (cache miss).
    const validateEmail = async (): Promise<EmailValidationResult> => {
      const cached = getCached(emailValidationCache, data.email ?? '');
      if (cached !== undefined) {
        console.log(`📧 mxCheck cache hit for ${data.email} — skipping check`);
        return cached;
      }
      const result = await runEmailCheck();
      emailValidationCache.set(data.email ?? '', { result, ts: Date.now() });
      return result;
    };

    // Validate the phone number with libphonenumber-js only — if it parses as a
    // valid number it's accepted. Default region US (the form is a US pet-care
    // business); an explicit +country code still parses correctly. Returns the
    // E.164 number on success, or a phoneValidation error payload on failure.
    const validatePhone = async (): Promise<PhoneValidationResult> => {
      const cached = getCached(phoneValidationCache, data.phone ?? '');
      if (cached !== undefined) {
        console.log(`📞 phone validation cache hit for ${data.phone} — skipping check`);
        return cached;
      }

      const parsedPhone = parsePhoneNumberFromString(data.phone ?? '', 'US');
      let result: PhoneValidationResult;
      if (!parsedPhone || !parsedPhone.isValid()) {
        console.log(`❌ Phone number failed libphonenumber-js validation: ${data.phone}`);
        result = { errorBody: { phone: data.phone, detail: 'Not a valid phone number' } };
      } else {
        console.log(`📞 Phone number valid: ${parsedPhone.number}`);
        result = { formatted: parsedPhone.number }; // E.164, e.g. +15551234567
      }

      phoneValidationCache.set(data.phone ?? '', { result, ts: Date.now() });
      return result;
    };

    const [emailValidation, phoneResult] = await Promise.all([validateEmail(), validatePhone()]);
    if (emailValidation || phoneResult.errorBody) {
      const body: {
        error: string;
        emailValidation?: typeof emailValidation;
        phoneValidation?: unknown;
      } = {
        error:
          emailValidation && phoneResult.errorBody
            ? 'Invalid Email and Phone Number'
            : emailValidation
              ? 'Invalid Email'
              : 'Invalid Phone Number',
      };
      if (emailValidation) body.emailValidation = emailValidation;
      if (phoneResult.errorBody) body.phoneValidation = phoneResult.errorBody;
      return NextResponse.json(body, { status: 400 });
    }

    const phoneValidation = { valid: true as const, formatted: phoneResult.formatted! };

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Format timestamp in user's timezone
    const submittedAtStr = data.submittedAt || new Date().toISOString();
    const userTimezone = data.timezone || 'UTC';
    const localTimestamp = formatTimestampInTimezone(submittedAtStr, userTimezone);

    // Save form data to "contact" sheet (initially with empty tracking ID, column L)
    const values = [
      [
        localTimestamp,
        data.fullName,
        data.email,
        data.phone,
        data.company,
        data.website,
        data.businessType,
        data.challenge,
        data.message,
        data.receiveMessages ? 'Yes' : 'No',
        userTimezone,
        '', // L: Contact Tracking ID (will be updated after creating tracking entry)
      ],
    ];

    console.log('📊 Saving to contact sheet...');
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'contact!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    console.log('✅ Form data saved to contact sheet');

    // Notify the business of the new lead by email (fire-and-forget, non-blocking)
    // This is a transactional email with form data and request metadata. We don't
    // wait for it so the user's form response comes back quickly — mail sending
    // can take seconds, and user-facing latency matters more than synchronous
    // confirmation. Email errors are logged but don't fail the form submission.
    const emailTask = (async () => {
      try {
        // Capture env vars
        const originalFromEmail = process.env.FROM_EMAIL;
        const originalFromName = process.env.FROM_NAME;

        // Temporarily override FROM_EMAIL and FROM_NAME for this transactional email
        process.env.FROM_EMAIL = 'noreply@happytailspawcare.com';
        process.env.FROM_NAME = 'Happy Tails Paw Care';

        const notificationText = formatContactSubmissionEmail(
          {
            ...data,
            timezone: userTimezone,
            submittedAt: submittedAtStr,
          },
          request
        );

        const notificationResult = await sendEmail(
          CONTACT_NOTIFICATION_EMAIL,
          `New Contact Form Submission - ${data.fullName}`,
          notificationText
        );

        // Restore original FROM_EMAIL and FROM_NAME
        if (originalFromEmail) {
          process.env.FROM_EMAIL = originalFromEmail;
        } else {
          delete process.env.FROM_EMAIL;
        }
        if (originalFromName) {
          process.env.FROM_NAME = originalFromName;
        } else {
          delete process.env.FROM_NAME;
        }

        if (notificationResult.success) {
          console.log(`✅ Notification email sent to ${CONTACT_NOTIFICATION_EMAIL}`);
        } else {
          console.warn(`⚠️ Notification email failed: ${notificationResult.error}`);
        }
      } catch (emailErr) {
        const emailErrMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.warn('⚠️ Failed to send notification email:', emailErrMsg);
      }
    })();
    // Don't await emailTask — let it run in the background

    // Extract row number from the append response (e.g., "contact!A2:L2" -> row 2)
    const updatedRange = appendResponse.data.updates?.updatedRange || '';
    const rowMatch = updatedRange.match(/!A(\d+):/);
    const contactSheetRowIndex = rowMatch ? parseInt(rowMatch[1]) : null;

    // Create tracking entry for Vapi dispatch (only when explicitly enabled)
    if (process.env.HTPC_CONTACT_TRACKER_ENABLED === 'true') {
      try {
        const { id: contactId } = await onFormSubmit(
          {
            phone: phoneValidation.formatted!,
            fullName: data.fullName,
            email: data.email,
            company: data.company,
            challenge: data.challenge,
          },
          undefined,
          data.timezone
        );

        console.log(`✅ Tracking entry created: ${contactId}`);

        // Update contact sheet with tracking ID
        if (contactSheetRowIndex) {
          try {
            await sheets.spreadsheets.values.update({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: `contact!L${contactSheetRowIndex}`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[contactId]],
              },
            });
            console.log(`✅ Updated contact sheet row ${contactSheetRowIndex} with tracking ID`);
          } catch (updateErr) {
            const updateErrMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
            console.warn('⚠️ Failed to update contact sheet with tracking ID:', updateErrMsg);
          }
        }

        // No call here: the contact tracker worker dispatches PENDING rows on
        // its next tick, recording the attempt and next retry like every call
      } catch (trackingErr) {
        const errMsg = trackingErr instanceof Error ? trackingErr.message : String(trackingErr);
        console.warn('⚠️ Failed to create tracking entry:', errMsg);
      }
    } else {
      console.log('⏭️  Skipping contact tracker in production');
    }

    console.log('✨ Form submission completed successfully');
    return NextResponse.json(
      { message: 'Form submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Contact form submission error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
