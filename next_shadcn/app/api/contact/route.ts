import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { onFormSubmit, dispatchContactDirectly } from '@/lib/vapi-contact-tracker';

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

function validateE164Format(phone: string): { valid: boolean; formatted?: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  const trimmed = phone.trim();

  let toFormat = trimmed;
  if (!trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
      toFormat = '+1' + digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      toFormat = '+' + digits;
    } else {
      return { valid: false, error: 'Invalid phone number format. Use +1234567890 or 10-digit US number' };
    }
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(toFormat)) {
    return {
      valid: false,
      error: `Invalid E.164 format. Expected: +[country code][number]. Got: ${toFormat}`
    };
  }

  return { valid: true, formatted: toFormat };
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();
    console.log('📝 Form submission received:', { name: data.fullName, email: data.email, phone: data.phone, company: data.company });

    // Verify reCAPTCHA token
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

    // Validate phone number
    const phoneValidation = validateE164Format(data.phone);
    if (!phoneValidation.valid) {
      console.log('❌ Phone number validation failed:', phoneValidation.error);
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 400 }
      );
    }

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

    // Save form data to "contact" sheet
    const values = [
      [
        new Date().toISOString(),
        data.fullName,
        data.email,
        data.phone,
        data.company,
        data.website,
        data.businessType,
        data.challenge,
        data.message,
        data.receiveMessages ? 'Yes' : 'No',
        data.timezone || 'Unknown',
      ],
    ];

    console.log('📊 Saving to contact sheet...');
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'contact!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    console.log('✅ Form data saved to contact sheet');

    // Also create tracking entry for Vapi dispatch
    try {
      const { id: contactId, row } = await onFormSubmit({
        phone: phoneValidation.formatted!,
        fullName: data.fullName,
        email: data.email,
        company: data.company,
        challenge: data.challenge,
      });

      console.log(`✅ Tracking entry created: ${contactId}`);

      // Dispatch to Vapi
      try {
        await dispatchContactDirectly(row);
        console.log('✅ Contact dispatched to Vapi:', contactId);
      } catch (dispatchError) {
        const errMsg = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
        console.warn('⚠️ Dispatch failed:', errMsg);
      }
    } catch (trackingErr) {
      const errMsg = trackingErr instanceof Error ? trackingErr.message : String(trackingErr);
      console.warn('⚠️ Failed to create tracking entry:', errMsg);
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
