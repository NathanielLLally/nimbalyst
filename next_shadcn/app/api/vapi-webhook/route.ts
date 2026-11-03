import { NextRequest, NextResponse } from 'next/server';
import { onVapiWebhook } from '@/lib/vapi-contact-tracker';
import * as SheetUtils from '@/lib/googleSheetUtils';

/**
 * Vapi End-of-Call Webhook Handler
 *
 * Receives call completion reports from Vapi and updates tracker sheet.
 * Vapi will POST to this endpoint with call details when a call ends.
 *
 * Request signature verification (optional):
 * Set VAPI_WEBHOOK_SECRET in .env to validate X-Vapi-Signature header
 *
 * POST /api/vapi-webhook
 * Headers: X-Vapi-Signature (optional, for verification)
 * Body: Vapi call report
 */

// ============================================================================
// Types
// ============================================================================

interface VapiCallReport {
  id: string;
  callId?: string;
  type?: string; // 'end-of-call-report'
  status?: string;
  timestamp?: number;
  startedAt?: string;
  endedAt?: string;
  endedReason?:
    | 'customer_ended'
    | 'assistant_ended'
    | 'voicemail_reached'
    | 'voicemail'
    | 'max_duration_reached'
    | 'assistant_error'
    | 'inbound_call_received'
    | 'customer_did_not_answer'
    | 'phone_number_not_found'
    | 'unknown';
  durationSeconds?: number;
  durationMs?: number;
  duration?: number;
  transcript?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  summary?: string;
  error?: string;
  errorMessage?: string;
  cost?: number;
  analysis?: {
    summary?: string;
    structuredData?: {
      outcome?: string;
      aiDetection?: string;
      aiImprovement?: string;
    };
    successEvaluation?: string;
  };
  artifact?: {
    transcript?: string;
    recordingUrl?: string;
    messages?: Array<{ role: string; message: string; time?: number }>;
  };
  call?: {
    id: string;
    customer?: { number: string };
  };
  customer?: {
    number: string;
  };
  variables?: Record<string, any>;
  variableValues?: Record<string, any>;
}

interface CallMetrics {
  duration: number;
  transcript: string;
  summary: string;
  recordingUrl?: string;
  endReason: string;
  success: boolean;
}

// ============================================================================
// Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-vapi-signature');

    // Parse the incoming JSON
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Vapi wraps the call report in a "message" field
    // Extract the actual report from the message
    const body: VapiCallReport = rawBody.message || rawBody;

    console.log(`📨 Vapi Webhook: ${body.id || body.callId} | Type: ${body.type || 'unknown'} | Status: ${body.status}`);

    // Optional: Verify signature
    if (process.env.VAPI_WEBHOOK_SECRET && signature) {
      if (!verifyVapiSignature(signature, request)) {
        console.warn('❌ Invalid Vapi webhook signature');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Validate required fields (Vapi end-of-call-report has different structure)
    const callId = body.id || body.callId || body.call?.id;
    if (!callId) {
      console.warn('⚠️ No call ID found in webhook payload');
      return NextResponse.json(
        { success: false, error: 'Missing call ID' },
        { status: 400 }
      );
    }

    // Process the call report
    await processCallReport(body);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Vapi webhook error:', errMsg);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Processing Logic
// ============================================================================

/**
 * Process call report and update contact tracker
 * Always stores call data, with or without matching contact
 */
async function processCallReport(report: VapiCallReport): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.SHEET_NAME || 'Sheet1';

  if (!sheetId) {
    console.error('Missing GOOGLE_SHEET_ID');
    return;
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
    return;
  }

  try {
    const callId = report.id || report.callId || report.call?.id;
    if (!callId) {
      console.warn('No call ID in report');
      return;
    }

    const metrics = extractMetrics(report);

    // Try to find and update matching contact
    const matches = await SheetUtils.findContactRows(
      sheetId,
      11, // Column L: Vapi Call ID (index 10 is Resolved — never matched)
      callId,
      sheetName
    );

    if (matches.length === 0) {
      // No contact found, but still log the call data
      console.warn(`⚠️ No contact found for call ID: ${callId}`);
      try {
        await logCallDetails(sheetId, report);
        console.log(`📊 Call data stored for unmatched call ${callId}`);
      } catch (logErr) {
        console.warn(`⚠️ Could not log call details:`, logErr);
      }
      return;
    }

    if (matches.length > 1) {
      console.warn(
        `⚠️ Multiple contacts found for call ID: ${callId}, using first`
      );
    }

    const { rowIndex, row } = matches[0];
    console.log(`🔄 Updating contact ${row[0]} with call results`);

    // Call vapi-contact-tracker to handle status update
    await onVapiWebhook({
      callId,
      status: report.status || (metrics.success ? 'completed' : 'failed'),
      endedReason: report.endedReason,
      error: report.error || report.errorMessage,
    });

    // Log detailed call metrics to separate sheet
    await logCallDetails(sheetId, report);

    console.log(`✅ Contact ${row[0]} updated with call results`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to process call report: ${errMsg}`);
    throw err;
  }
}


/**
 * Extract call metrics from report
 */
function extractMetrics(report: VapiCallReport): CallMetrics {
  // Vapi sends transcript in multiple places, check all
  const transcript =
    report.transcript ||
    report.artifact?.transcript ||
    report.analysis?.summary ||
    '';

  // Recording URL can be in multiple places
  const recordingUrl =
    report.recordingUrl ||
    report.artifact?.recordingUrl ||
    report.stereoRecordingUrl ||
    '';

  // Duration might be in seconds or milliseconds
  const duration = report.durationSeconds || Math.round((report.durationMs || 0) / 1000) || report.duration || 0;

  // Check if call was successful
  // Voicemail is considered "reached" (not failed, but not successful)
  const isSuccess =
    report.endedReason === 'customer_ended' ||
    report.endedReason === 'assistant_ended';

  return {
    duration,
    transcript: sanitizeTranscript(transcript),
    summary:
      report.summary ||
      report.analysis?.summary ||
      extractSummaryFromTranscript(transcript),
    recordingUrl,
    endReason: report.endedReason || 'unknown',
    success: isSuccess,
  };
}

/**
 * Sanitize transcript (remove PII, limit length)
 */
function sanitizeTranscript(transcript: string): string {
  let sanitized = transcript;

  // Remove potential phone numbers (basic)
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

  // Remove potential email addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );

  // Limit to 500 chars
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized;
}

/**
 * Extract summary from transcript if not provided by Vapi
 */
function extractSummaryFromTranscript(transcript: string): string {
  if (!transcript) return '';

  // Take first 200 chars as summary
  const maxLength = 200;
  if (transcript.length > maxLength) {
    // Try to break at sentence boundary
    const truncated = transcript.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 100) {
      return truncated.substring(0, lastPeriod + 1);
    }
    return truncated + '...';
  }

  return transcript;
}

/**
 * Log call details to a separate sheet for analytics
 * (Optional: create a "Call Details" sheet for this)
 */
// Nested report objects whose fields become columns; everything else nested
// (assistant, artifact, costBreakdown, phoneNumber, ...) is too large to log
const FLATTENED_OBJECTS = ['analysis', 'customer'];

/**
 * Flatten an end-of-call report into { key path: value } in Vapi's key order:
 * top-level text/number/boolean fields, every field under FLATTENED_OBJECTS,
 * and call.id. Arrays are skipped. dashboardUrl follows recordingUrl because
 * recordingUrl points at Vapi's private HIPAA storage and never opens.
 */
function callDetailFields(report: VapiCallReport): Map<string, string | number | boolean> {
  const fields = new Map<string, string | number | boolean>();
  const isScalar = (v: unknown): v is string | number | boolean =>
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
  const flatten = (value: unknown, path: string) => {
    if (isScalar(value)) fields.set(path, value);
    else if (value && typeof value === 'object' && !Array.isArray(value))
      for (const [k, v] of Object.entries(value)) flatten(v, `${path}.${k}`);
  };

  const callId = report.call?.id || report.id || report.callId;
  for (const [key, value] of Object.entries(report)) {
    if (isScalar(value)) fields.set(key, value);
    else if (FLATTENED_OBJECTS.includes(key)) flatten(value, key);
    else if (key === 'call' && callId) fields.set('call.id', callId);

    if (key === 'recordingUrl' && callId) fields.set('dashboardUrl', `https://dashboard.vapi.ai/calls/${callId}`);
  }
  return fields;
}

async function logCallDetails(sheetId: string, report: VapiCallReport): Promise<void> {
  try {
    // Use configured sheet name or default to "Vapi Calls"
    const callDetailsSheetName = process.env.VAPI_CALL_DETAILS_SHEET || 'Vapi Calls';
    const fields = callDetailFields(report);

    const header = await syncCallDetailsHeader(sheetId, callDetailsSheetName, [...fields.keys()]);
    const row = header.map((key) => {
      const value = fields.get(key);
      return value === undefined ? '' : typeof value === 'boolean' ? String(value) : value;
    });

    await SheetUtils.createContactRow(sheetId, row, callDetailsSheetName, header.length);

    console.log(`📊 Call details logged for ${fields.get('call.id') ?? 'unknown'} in "${callDetailsSheetName}" sheet`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Could not log call details: ${errMsg}`);
    // Don't fail the webhook if details logging fails
  }
}

/**
 * Keep row 1 as the header: existing columns stay where they are and keys
 * the sheet hasn't seen are appended, so every row stays aligned by key.
 * Returns the full header.
 */
async function syncCallDetailsHeader(sheetId: string, sheetName: string, keys: string[]): Promise<string[]> {
  const rows = await SheetUtils.getTrackerData(sheetId, sheetName);
  const header = ((rows[0] ?? []) as unknown as unknown[]).map(String);
  const added = keys.filter((key) => !header.includes(key));
  if (added.length === 0) return header;

  await SheetUtils.updateContactRow(
    sheetId,
    1,
    Object.fromEntries(added.map((key, i) => [header.length + i, key])) as any,
    sheetName
  );
  return [...header, ...added];
}

// ============================================================================
// Signature Verification (Optional)
// ============================================================================

/**
 * Verify Vapi webhook signature
 * (Vapi provides X-Vapi-Signature header for verification)
 *
 * For now, we accept all verified requests.
 * In production, you may want to:
 * 1. Store webhook secret from Vapi dashboard
 * 2. Verify HMAC-SHA256 signature
 */
function verifyVapiSignature(signature: string, request: NextRequest): boolean {
  // If no secret configured, skip verification
  if (!process.env.VAPI_WEBHOOK_SECRET) {
    return true;
  }

  // TODO: Implement HMAC-SHA256 verification
  // For now, just check that signature header exists
  return !!signature;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check endpoint to verify webhook is running
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Vapi webhook endpoint is running',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
