import { NextRequest, NextResponse } from 'next/server';
import { onFormSubmit, dispatchContactById } from '@/lib/vapi-contact-tracker';

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
    const isLocalhost = process.env.NODE_ENV === 'development' && request.headers.get('host')?.includes('localhost');

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

    // Create contact in tracking sheet
    const timezone = data.timezone || 'Unknown';
    const submittedAt = data.submittedAt || new Date().toISOString();

    const contactId = await onFormSubmit({
      phone: phoneValidation.formatted!,
      fullName: data.fullName,
      email: data.email,
      company: data.company,
      challenge: data.challenge,
    });

    console.log(`✅ Contact created: ${contactId} | Timezone: ${timezone} | Submitted: ${submittedAt}`);

    // Dispatch to Vapi immediately
    try {
      await dispatchContactById(contactId);
      console.log('✅ Contact dispatched to Vapi:', contactId);
    } catch (dispatchError) {
      const errMsg = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
      console.warn('⚠️ Dispatch failed, but contact created:', errMsg);
      // Don't fail the form submission if dispatch fails
    }

    console.log('✨ Form submission completed successfully');
    return NextResponse.json(
      { message: 'Form submitted successfully', contactId },
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
