/**
 * Vapi Contact Tracker
 *
 * Manages the complete lifecycle of contacts from form submission through
 * Vapi call dispatch, polling, and retry logic using Google Sheets for persistence.
 *
 * Configuration: Read from environment variables
 * Sheet structure (12 columns):
 * A: ID | B: Phone | C: Name | D: Channel (voice/sms) | E: Status | F: Attempt Count
 * G: Submitted | H: Last Attempt | I: Next Retry | J: Resolved | K: Vapi Call ID | L: Notes
 */

import * as SheetUtils from './googleSheetUtils';

// ============================================================================
// Configuration from Environment Variables
// ============================================================================

interface Config {
  GOOGLE_SHEET_ID: string;
  VAPI_API_KEY: string;
  VAPI_PHONE_NUMBER_ID: string;
  VAPI_ASSISTANT_ID: string;
  RETRY_DELAYS_MINUTES: number[];
  MAX_ATTEMPTS: number;
  POLL_INTERVAL_SECONDS: number;
  SHEET_NAME: string;
}

function loadConfig(): Config {
  const required = [
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'VAPI_API_KEY',
    'VAPI_PHONE_NUMBER_ID',
    'VAPI_ASSISTANT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID!,
    VAPI_API_KEY: process.env.VAPI_API_KEY!,
    VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID!,
    VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID!,
    RETRY_DELAYS_MINUTES: process.env.RETRY_DELAYS_MINUTES
      ? JSON.parse(process.env.RETRY_DELAYS_MINUTES)
      : [0, 5, 15, 60],
    MAX_ATTEMPTS: parseInt(process.env.MAX_ATTEMPTS || '4'),
    POLL_INTERVAL_SECONDS: parseInt(process.env.POLL_INTERVAL_SECONDS || '30'),
    SHEET_NAME: process.env.SHEET_NAME || 'Sheet1',
  };
}

let config: Config | null = null;

function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

// ============================================================================
// State Constants
// ============================================================================

enum ContactStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
}

enum Channel {
  VOICE = 'voice',
  SMS = 'sms',
}

// ============================================================================
// Types
// ============================================================================

interface FormData {
  phone: string;
  fullName: string;
  email: string;
  company: string;
  challenge: string;
  [key: string]: string;
}

interface VapiResponse {
  success: boolean;
  callId?: string;
  error?: string;
}

interface VapiStatus {
  status: 'queued' | 'in-progress' | 'completed' | 'failed';
  endedReason?: string;
  error?: string;
  transcript?: string;
  duration?: number;
}

// ============================================================================
// Contact Submission Handler
// ============================================================================

/**
 * Called when a form is submitted. Creates a new tracking row.
 */
export async function onFormSubmit(
  formData: FormData,
  channel: Channel = Channel.VOICE
): Promise<string> {
  const cfg = getConfig();
  const now = new Date();
  const id = generateId();

  const row: (string | number)[] = [
    id, // A: ID
    formData.phone, // B: Phone
    formData.fullName, // C: Name
    channel, // D: Channel
    ContactStatus.PENDING, // E: Status
    0, // F: Attempt Count
    now.toISOString(), // G: Submitted
    '', // H: Last Attempt
    now.toISOString(), // I: Next Retry (immediately)
    '', // J: Resolved
    '', // K: Vapi Call ID
    `Form submitted: ${formData.email} | Challenge: ${formData.challenge}`, // L: Notes
  ];

  try {
    await SheetUtils.createContactRow(
      cfg.GOOGLE_SHEET_ID,
      row,
      cfg.SHEET_NAME
    );
    console.log(`✅ Contact created: ${id} (${formData.phone})`);
    return id;
  } catch (err) {
    console.error(`❌ Failed to create contact: ${err}`);
    throw err;
  }
}

// ============================================================================
// Main Processing Loop
// ============================================================================

/**
 * Main processor - runs on a scheduled trigger.
 * Dispatches pending contacts and polls in-progress ones.
 */
export async function processContacts(): Promise<void> {
  const cfg = getConfig();

  try {
    const rows = await SheetUtils.getTrackerData(
      cfg.GOOGLE_SHEET_ID,
      cfg.SHEET_NAME
    );

    if (rows.length < 2) {
      console.log('No contacts to process');
      return;
    }

    const now = new Date();

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as SheetUtils.ContactRow;
      const rowIndex = i + 1;
      const status = row[4] as unknown as ContactStatus;

      try {
        if (
          status === ContactStatus.PENDING ||
          status === ContactStatus.FAILED
        ) {
          const nextRetry = new Date(row[8]);

          // Check if it's time to retry
          if (nextRetry <= now) {
            await dispatchContact(rowIndex, row);
          }
        } else if (status === ContactStatus.IN_PROGRESS) {
          await pollInProgress(rowIndex, row);
        }
      } catch (err) {
        console.error(`Error processing row ${rowIndex}:`, err);
        const errMsg = err instanceof Error ? err.message : String(err);
        await SheetUtils.appendContactNote(
          cfg.GOOGLE_SHEET_ID,
          cfg.GOOGLE_API_KEY,
          rowIndex,
          `Error: ${errMsg}`,
          cfg.SHEET_NAME
        );
      }
    }
  } catch (err) {
    console.error('❌ processContacts error:', err);
  }
}

// ============================================================================
// Dispatch Logic
// ============================================================================

async function dispatchContact(
  rowIndex: number,
  row: SheetUtils.ContactRow
): Promise<void> {
  const cfg = getConfig();
  const id = row[0];
  const phone = row[1];
  const name = row[2];
  const channel = row[3];
  const attemptCount = parseInt(String(row[5])) || 0;

  console.log(
    `📞 Dispatching ${id} (attempt ${attemptCount + 1}/${cfg.MAX_ATTEMPTS})`
  );

  try {
    const vapiResponse = await makeVapiCall(phone, name, channel);

    if (!vapiResponse.success) {
      throw new Error(vapiResponse.error || 'Unknown Vapi error');
    }

    const now = new Date();
    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [4]: ContactStatus.IN_PROGRESS, // Status
        [5]: attemptCount + 1, // Attempt Count
        [7]: now.toISOString(), // Last Attempt
        [10]: vapiResponse.callId || '', // Vapi Call ID
      } as Partial<SheetUtils.ContactRow>,
      cfg.SHEET_NAME
    );

    await SheetUtils.appendContactNote(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      `Dispatched to Vapi (call ID: ${vapiResponse.callId})`,
      cfg.SHEET_NAME
    );

    console.log(
      `✅ Dispatch successful: ${id} (call ID: ${vapiResponse.callId})`
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Dispatch failed for ${id}: ${errMsg}`);
    await markFailed(rowIndex, row, errMsg);
  }
}

/**
 * Call Vapi API to initiate voice call or SMS.
 */
async function makeVapiCall(
  phone: string,
  name: string,
  channel: string
): Promise<VapiResponse> {
  const cfg = getConfig();
  const url = 'https://api.vapi.ai/call';

  const payload = {
    phoneNumberId: cfg.VAPI_PHONE_NUMBER_ID,
    customerPhoneNumber: phone,
    assistantId: cfg.VAPI_ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        customerName: name,
        channel,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cfg.VAPI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      callId: data.id || data.callId,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errMsg,
    };
  }
}

// ============================================================================
// Polling Logic
// ============================================================================

async function pollInProgress(
  rowIndex: number,
  row: SheetUtils.ContactRow
): Promise<void> {
  const cfg = getConfig();
  const id = row[0];
  const vapiCallId = row[10];

  if (!vapiCallId) {
    console.warn(`No Vapi Call ID for ${id}, marking failed`);
    await markFailed(rowIndex, row, 'Missing Vapi Call ID');
    return;
  }

  try {
    const status = await getVapiCallStatus(vapiCallId);

    console.log(`📊 ${id} status: ${status.status}`);

    if (status.status === 'completed') {
      if (
        status.endedReason === 'customer_ended' ||
        status.endedReason === 'assistant_ended'
      ) {
        await markSuccess(rowIndex, row, status);
      } else {
        await markFailed(rowIndex, row, `Ended: ${status.endedReason}`);
      }
    } else if (status.status === 'failed') {
      await markFailed(rowIndex, row, status.error || 'Vapi call failed');
    }
    // If still 'queued' or 'in-progress', wait for next poll
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Error polling ${id}: ${errMsg}`);
  }
}

/**
 * Get Vapi call status.
 */
async function getVapiCallStatus(callId: string): Promise<VapiStatus> {
  const cfg = getConfig();
  const url = `https://api.vapi.ai/call/${callId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': cfg.VAPI_API_KEY,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return {
      status: data.status,
      endedReason: data.endedReason,
      error: data.error,
      transcript: data.transcript,
      duration: data.duration,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to poll Vapi: ${errMsg}`);
  }
}

// ============================================================================
// State Transitions
// ============================================================================

async function markSuccess(
  rowIndex: number,
  row: SheetUtils.ContactRow,
  vapiStatus: VapiStatus
): Promise<void> {
  const cfg = getConfig();
  const now = new Date();

  await SheetUtils.updateContactRow(
    cfg.GOOGLE_SHEET_ID,
    cfg.GOOGLE_API_KEY,
    rowIndex,
    {
      [4]: ContactStatus.SUCCESS, // Status
      [9]: now.toISOString(), // Resolved
    } as Partial<SheetUtils.ContactRow>,
    cfg.SHEET_NAME
  );

  let notes = `✅ SUCCESS at ${now.toISOString()}`;
  if (vapiStatus.duration) {
    notes += ` | Duration: ${vapiStatus.duration}s`;
  }
  if (vapiStatus.transcript) {
    notes += ` | Transcript: ${vapiStatus.transcript.substring(0, 100)}...`;
  }

  await SheetUtils.appendContactNote(
    cfg.GOOGLE_SHEET_ID,
    cfg.GOOGLE_API_KEY,
    rowIndex,
    notes,
    cfg.SHEET_NAME
  );
  console.log(`✅ Contact ${row[0]} marked SUCCESS`);
}

async function markFailed(
  rowIndex: number,
  row: SheetUtils.ContactRow,
  reason: string
): Promise<void> {
  const cfg = getConfig();
  const attemptCount = parseInt(String(row[5])) || 0;
  const now = new Date();

  if (attemptCount >= cfg.MAX_ATTEMPTS) {
    // No more retries
    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [4]: ContactStatus.RETRY_EXHAUSTED,
        [9]: now.toISOString(),
      } as Partial<SheetUtils.ContactRow>,
      cfg.SHEET_NAME
    );

    await SheetUtils.appendContactNote(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      `❌ RETRY_EXHAUSTED: ${reason}`,
      cfg.SHEET_NAME
    );
    console.log(`❌ Contact ${row[0]} exhausted all retries`);
  } else {
    // Schedule retry
    const delayMinutes = cfg.RETRY_DELAYS_MINUTES[attemptCount] || 60;
    const nextRetry = new Date(now.getTime() + delayMinutes * 60000);

    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [4]: ContactStatus.FAILED,
        [8]: nextRetry.toISOString(), // Next Retry
      } as Partial<SheetUtils.ContactRow>,
      cfg.SHEET_NAME
    );

    await SheetUtils.appendContactNote(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      `⏱️ FAILED (retry ${attemptCount + 1}/${cfg.MAX_ATTEMPTS}): ${reason} | Next retry: ${nextRetry.toISOString()}`,
      cfg.SHEET_NAME
    );
    console.log(
      `⏱️ Contact ${row[0]} scheduled for retry at ${nextRetry.toISOString()}`
    );
  }
}

// ============================================================================
// Webhook Handler (Vapi Callback)
// ============================================================================

/**
 * Handle incoming webhook from Vapi (alternative to polling).
 */
export async function onVapiWebhook(vapiEvent: {
  callId?: string;
  id?: string;
  status: string;
  endedReason?: string;
  error?: string;
}): Promise<void> {
  const cfg = getConfig();
  const callId = vapiEvent.callId || vapiEvent.id;

  console.log(
    `📨 Vapi webhook: ${callId} | Status: ${vapiEvent.status}`
  );

  try {
    // Find row by Vapi Call ID
    const matches = await SheetUtils.findContactRows(
      cfg.GOOGLE_SHEET_ID,
      10, // Column K (Vapi Call ID)
      callId!,
      cfg.SHEET_NAME
    );

    if (matches.length === 0) {
      console.warn(`No row found for call ID ${callId}`);
      return;
    }

    const { rowIndex, row } = matches[0];

    if (
      vapiEvent.status === 'completed' &&
      vapiEvent.endedReason
    ) {
      if (
        ['customer_ended', 'assistant_ended'].includes(
          vapiEvent.endedReason
        )
      ) {
        await markSuccess(rowIndex, row, {
          status: 'completed',
          endedReason: vapiEvent.endedReason,
        });
      } else {
        await markFailed(
          rowIndex,
          row,
          `Ended: ${vapiEvent.endedReason}`
        );
      }
    } else if (vapiEvent.status === 'failed') {
      await markFailed(
        rowIndex,
        row,
        vapiEvent.error || 'Vapi call failed'
      );
    }
  } catch (err) {
    console.error('❌ onVapiWebhook error:', err);
  }
}

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return `contact_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;
}

// ============================================================================
// Exports
// ============================================================================

export {
  ContactStatus,
  Channel,
  getConfig,
};
