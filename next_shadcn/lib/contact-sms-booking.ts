/**
 * Contact SMS + Email + Availability Booking
 *
 * Handles the sequential contact flow:
 * 1. SMS confirmation after form submission
 * 2. Email with availability checking & booking
 * 3. Supports retry attempts with different messaging
 */

import { sendFollowupEmail, sendInformationalEmail } from './contact-email-sender';

interface SMSConfig {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
}

interface BookingParams {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
}

function getSmsConfig(): SMSConfig {
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing SMS config: ${missing.join(', ')}`);
  }

  return {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
  };
}

/**
 * Send SMS confirmation to contact
 */
export async function sendConfirmationSms(
  phone: string,
  name: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getSmsConfig();
    const message = `Hi ${name}! We received your form submission. We'll be in touch soon to schedule a call. Thanks!`;

    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + config.TWILIO_ACCOUNT_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: new URLSearchParams({
        'From': config.TWILIO_PHONE_NUMBER,
        'To': phone,
        'Body': message,
      }).toString(),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    console.log(`✅ SMS sent to ${phone} (SID: ${data.sid})`);
    return { success: true, messageId: data.sid };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send SMS to ${phone}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Check availability by calling /api/vapi-tools
 */
export async function checkAvailability(
  timezone: string = 'UTC'
): Promise<{ success: boolean; slots?: string; error?: string }> {
  try {
    const response = await fetch('/api/vapi-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          toolCall: {
            name: 'check_availability',
            parameters: { timezone },
          },
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    console.log(`✅ Availability slots found: ${data.result}`);
    return { success: true, slots: data.result };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to check availability:', errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Book a meeting using the first available slot
 */
export async function bookMeetingForContact(
  params: BookingParams
): Promise<{ success: boolean; bookingInfo?: string; error?: string }> {
  try {
    // First, get available slots
    const availabilityResult = await checkAvailability(params.timezone || 'UTC');

    if (!availabilityResult.success || !availabilityResult.slots) {
      throw new Error('No availability found');
    }

    // Extract first available datetime from slots string
    // Slots format: "2024-01-15T10:00:00Z, 2024-01-15T14:00:00Z, ..."
    const slots = availabilityResult.slots.split(',').map(s => s.trim());
    const selectedDatetime = slots[0];

    if (!selectedDatetime) {
      throw new Error('No available slots');
    }

    // Book the meeting
    const response = await fetch('/api/vapi-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          toolCall: {
            name: 'book_meeting',
            parameters: {
              name: params.name,
              email: params.email,
              datetime: selectedDatetime,
              timezone: params.timezone || 'UTC',
            },
          },
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    console.log(`✅ Meeting booked for ${params.name}: ${data.result}`);
    return { success: true, bookingInfo: data.result };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to book meeting for ${params.name}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Complete SMS + booking flow for a new contact
 */
export async function processSmsAndBooking(
  formData: {
    phone: string;
    fullName: string;
    email: string;
    company: string;
    challenge: string;
  },
  timezone?: string
): Promise<{
  smsSuccess: boolean;
  bookingSuccess: boolean;
  smsMessageId?: string;
  bookingInfo?: string;
  errors: { sms?: string; booking?: string };
}> {
  const errors: { sms?: string; booking?: string } = {};

  // Send confirmation SMS
  const smsResult = await sendConfirmationSms(formData.phone, formData.fullName);
  if (!smsResult.success) {
    errors.sms = smsResult.error;
  }

  // Try to book meeting (non-blocking if SMS succeeds)
  let bookingSuccess = false;
  let bookingInfo: string | undefined;

  const bookingResult = await bookMeetingForContact({
    name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    timezone,
  });

  if (bookingResult.success) {
    bookingSuccess = true;
    bookingInfo = bookingResult.bookingInfo;
  } else {
    errors.booking = bookingResult.error;
  }

  return {
    smsSuccess: smsResult.success,
    bookingSuccess,
    smsMessageId: smsResult.messageId,
    bookingInfo,
    errors,
  };
}

/**
 * Send email at different stages
 */
export async function sendStageEmail(
  stage: 'initial' | 'followup',
  formData: {
    phone: string;
    fullName: string;
    email: string;
    company: string;
    challenge: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (stage === 'initial') {
      return await sendInformationalEmail(
        formData.fullName,
        formData.email,
        formData.company,
        formData.challenge
      );
    } else {
      return await sendFollowupEmail(formData.fullName, formData.email);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Complete sequential flow: SMS → Email → Booking
 */
export async function processSequentialFlow(
  formData: {
    phone: string;
    fullName: string;
    email: string;
    company: string;
    challenge: string;
  },
  timezone?: string
): Promise<{
  smsSuccess: boolean;
  emailSuccess: boolean;
  bookingSuccess: boolean;
  smsMessageId?: string;
  emailMessageId?: string;
  bookingInfo?: string;
  errors: { sms?: string; email?: string; booking?: string };
}> {
  const errors: { sms?: string; email?: string; booking?: string } = {};

  // 1. Send initial SMS
  const smsResult = await sendConfirmationSms(formData.phone, formData.fullName);
  if (!smsResult.success) {
    errors.sms = smsResult.error;
  }

  // 2. Send initial email
  let emailSuccess = false;
  let emailMessageId: string | undefined;
  const emailResult = await sendStageEmail('initial', formData);
  if (emailResult.success) {
    emailSuccess = true;
    emailMessageId = emailResult.messageId;
  } else {
    errors.email = emailResult.error;
  }

  // 3. Try to book meeting (non-blocking)
  let bookingSuccess = false;
  let bookingInfo: string | undefined;
  const bookingResult = await bookMeetingForContact({
    name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    timezone,
  });

  if (bookingResult.success) {
    bookingSuccess = true;
    bookingInfo = bookingResult.bookingInfo;
  } else {
    errors.booking = bookingResult.error;
  }

  return {
    smsSuccess: smsResult.success,
    emailSuccess,
    bookingSuccess,
    smsMessageId: smsResult.messageId,
    emailMessageId,
    bookingInfo,
    errors,
  };
}

export default {
  sendConfirmationSms,
  checkAvailability,
  bookMeetingForContact,
  processSmsAndBooking,
  sendStageEmail,
  processSequentialFlow,
};
