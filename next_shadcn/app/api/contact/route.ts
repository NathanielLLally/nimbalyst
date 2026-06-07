import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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
}

function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

function validateE164Format(phone: string): { valid: boolean; formatted?: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  const trimmed = phone.trim();

  // If doesn't start with +, assume US number and add +1
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

  // Validate E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(toFormat)) {
    return {
      valid: false,
      error: `Invalid E.164 format. Expected: +[country code][number]. Got: ${toFormat}`
    };
  }

  return { valid: true, formatted: toFormat };
}

async function makeVapiCall(data: ContactFormData, phoneNumberE164: string) {
  try {
    // Validate API key
    if (!process.env.VAPI_API_KEY) {
      console.warn('⚠️  VAPI_API_KEY not configured, skipping Vapi call');
      return;
    }

    const apiKeyLength = process.env.VAPI_API_KEY.length;
    const apiKeyPreview = process.env.VAPI_API_KEY.substring(0, 10) + '...';
    console.log(`🔑 API Key found (length: ${apiKeyLength}, preview: ${apiKeyPreview})`);

    if (!process.env.VAPI_PHONE_NUMBER_ID) {
      console.warn('⚠️  VAPI_PHONE_NUMBER_ID not configured, skipping Vapi call');
      return;
    }

    if (!process.env.VAPI_ASSISTANT_ID) {
      console.warn('⚠️  VAPI_ASSISTANT_ID not configured, skipping Vapi call');
      return;
    }

    console.log('📞 Phone Number ID:', process.env.VAPI_PHONE_NUMBER_ID);
    console.log('🔄 Calling Vapi API for phone:', phoneNumberE164);

    const requestBody = {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customerPhoneNumber: phoneNumberE164,
      assistantId: process.env.VAPI_ASSISTANT_ID,
      assistantOverrides: {
        variableValues: {
          fullName: data.fullName,
          company: data.company,
          businessType: data.businessType,
          challenge: data.challenge,
          email: data.email,
        },
      },
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.VAPI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status, response.statusText);

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('📥 Response body:', responseData);

    if (response.ok) {
      console.log('✅ Vapi call initiated successfully:', responseData);
    } else {
      console.warn(`❌ Vapi call failed with status ${response.status}:`, responseData);
    }
  } catch (error) {
    console.error('❌ Vapi call error:', error);
    // Don't fail the form submission if Vapi call fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();
    console.log('📝 Form submission received:', { name: data.fullName, email: data.email, phone: data.phone, company: data.company });

    // Verify reCAPTCHA token (skip on localhost)
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
      ],
    ];

    // Remove recaptchaToken from data before logging
    const { recaptchaToken, ...cleanData } = data;

    console.log('📊 Appending to Google Sheets...');
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'contact!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    console.log('✅ Successfully saved to Google Sheets');

    // Make Vapi phone call if phone number is valid E.164 format
    const phoneValidation = validateE164Format(data.phone);
    if (phoneValidation.valid && phoneValidation.formatted) {
      console.log('📞 Valid E.164 phone number detected:', phoneValidation.formatted);
      await makeVapiCall(data, phoneValidation.formatted);
    } else {
      console.log('⏭️  Phone number validation failed:', phoneValidation.error);
    }

    console.log('✨ Form submission completed successfully');
    return NextResponse.json(
      { message: 'Form submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
