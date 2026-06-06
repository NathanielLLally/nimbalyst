import { NextRequest, NextResponse } from 'next/server';
import { onFormSubmit, onVapiWebhook } from '@/lib/vapi-contact-tracker';

/**
 * API endpoint for Vapi contact tracking.
 * Handles form submissions and webhook callbacks.
 *
 * Loads configuration from environment variables.
 *
 * POST /api/vapi-track
 * Body: { type: 'form_submit', formData: {...}, channel: 'voice' }
 *
 * POST /api/vapi-track (webhook from Vapi)
 * Body: { type: 'vapi_webhook', event: {...} }
 */

interface FormSubmitRequest {
  type: 'form_submit';
  formData: {
    phone: string;
    fullName: string;
    email: string;
    company: string;
    challenge: string;
  };
  channel?: string;
}

interface VapiWebhookRequest {
  type: 'vapi_webhook';
  event: {
    callId?: string;
    id?: string;
    status: string;
    endedReason?: string;
    error?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as FormSubmitRequest | VapiWebhookRequest;
    console.log('📨 /api/vapi-track request:', data.type);

    if (data.type === 'form_submit') {
      const req = data as FormSubmitRequest;
      const contactId = await onFormSubmit(req.formData, req.channel as any);
      return NextResponse.json({ success: true, contactId }, { status: 200 });
    } else if (data.type === 'vapi_webhook') {
      const req = data as VapiWebhookRequest;
      await onVapiWebhook(req.event);
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown request type' },
        { status: 400 }
      );
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ /api/vapi-track error:', errMsg);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
