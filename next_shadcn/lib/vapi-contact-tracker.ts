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

  const cfg = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID!,
    VAPI_API_KEY: process.env.VAPI_API_KEY!,
    VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID!,
    VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID!,
    RETRY_DELAYS_MINUTES: process.env.RETRY_DELAYS_MINUTES
      ? JSON.parse(process.env.RETRY_DELAYS_MINUTES)
      : [2, 5, 15, 60],
    MAX_ATTEMPTS: parseInt(process.env.MAX_ATTEMPTS || '4'),
    POLL_INTERVAL_SECONDS: parseInt(process.env.POLL_INTERVAL_SECONDS || '30'),
    SHEET_NAME: process.env.SHEET_NAME || 'Sheet1',
  };

  console.log('⚙️ Config loaded:', {
    MAX_ATTEMPTS: cfg.MAX_ATTEMPTS,
    RETRY_DELAYS_MINUTES: cfg.RETRY_DELAYS_MINUTES,
    POLL_INTERVAL_SECONDS: cfg.POLL_INTERVAL_SECONDS,
    SHEET_NAME: cfg.SHEET_NAME,
  });

  if (cfg.RETRY_DELAYS_MINUTES.every((d: number) => d === 0)) {
    console.warn('⚠️  WARNING: All RETRY_DELAYS_MINUTES are 0 - retries will be immediate');
  }

  return cfg;
}

let config: Config | null = null;
let callMachineMessages: Map<number, string> | null = null;

function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

async function getCallMachineMessages(): Promise<Map<number, string>> {
  if (!callMachineMessages) {
    callMachineMessages = await loadCallMachineMessages();
  }
  return callMachineMessages;
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
// Configuration Helpers
// ============================================================================

/**
 * Load call machine messages from vapi_config sheet
 * Expected format: column A = "CALL_MACHINE_MESSAGE", column B = message for attempt 1, C = attempt 2, etc.
 */
async function loadCallMachineMessages(): Promise<Map<number, string>> {
  const cfg = getConfig();
  const messages = new Map<number, string>();

  try {
    const data = await SheetUtils.getTrackerData(
      cfg.GOOGLE_SHEET_ID,
      'vapi_config'
    );

    if (data.length < 2) {
      console.warn('⚠️ vapi_config sheet is empty or missing');
      return messages;
    }

    // Find row with "CALL_MACHINE_MESSAGE"
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as unknown as any[];
      if (String(row[0])?.trim() === 'CALL_MACHINE_MESSAGE') {
        // Columns B, C, D, E map to attempts 1, 2, 3, 4
        for (let col = 1; col < Math.min(row.length, 5); col++) {
          const attemptNum = col;
          const message = String(row[col])?.trim();
          if (message) {
            messages.set(attemptNum, message);
          }
        }
        break;
      }
    }

    console.log(`📋 Loaded ${messages.size} call machine messages`);
    return messages;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ Failed to load call machine messages: ${errMsg}`);
    return messages;
  }
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
): Promise<{ id: string; row: SheetUtils.ContactRow }> {
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
    '', // I: Next Retry (empty until first dispatch attempt)
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
    return { id, row: row as unknown as SheetUtils.ContactRow };
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
      const attemptCount = parseInt(String(row[5])) || 0;
      const nextRetryStr = String(row[8]);
      const nextRetryTime = nextRetryStr ? new Date(nextRetryStr).getTime() : 0;
      const nowTime = now.getTime();

      try {
        if (
          status === ContactStatus.PENDING ||
          status === ContactStatus.FAILED
        ) {
          const canRetry = attemptCount < cfg.MAX_ATTEMPTS;
          const nextRetryIsEmpty = !nextRetryStr || nextRetryTime === 0;
          const isTimeToRetry = nextRetryIsEmpty || nextRetryTime <= nowTime;

          if (isTimeToRetry && canRetry) {
            const context = nextRetryIsEmpty ? 'first dispatch' : `attempt ${attemptCount + 1}/${cfg.MAX_ATTEMPTS}`;
            console.log(`📤 ${row[0]}: ${context}`);
            await dispatchContact(rowIndex, row);
          } else if (!isTimeToRetry && canRetry && nextRetryTime > 0) {
            const waitMs = nextRetryTime - nowTime;
            const waitMin = Math.ceil(waitMs / 60000);
            console.log(`⏳ ${row[0]} scheduled in ${waitMin}min (next: ${new Date(nextRetryTime).toISOString()})`);
          } else if (attemptCount >= cfg.MAX_ATTEMPTS && status === ContactStatus.FAILED) {
            // Mark as exhausted if we've hit the limit
            await SheetUtils.updateContactRow(
              cfg.GOOGLE_SHEET_ID,
              rowIndex,
              {
                [4]: ContactStatus.RETRY_EXHAUSTED,
                [9]: now.toISOString(),
              } as Partial<SheetUtils.ContactRow>,
              cfg.SHEET_NAME
            );
            console.log(`⚠️ Contact ${row[0]} exhausted (${attemptCount}/${cfg.MAX_ATTEMPTS} attempts)`);
          }
        }
      } catch (err) {
        console.error(`Error processing row ${rowIndex}:`, err);
        const errMsg = err instanceof Error ? err.message : String(err);
        await SheetUtils.appendContactNote(
          cfg.GOOGLE_SHEET_ID,
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

export async function dispatchContactDirectly(row: SheetUtils.ContactRow): Promise<void> {
  const cfg = getConfig();
  const id = row[0];
  const phone = row[1];
  const name = row[2];
  const channel = row[3];

  console.log(`📞 Dispatching ${id} immediately (${phone})`);

  try {
    // Get the row count to find the index
    const allRows = await SheetUtils.getTrackerData(cfg.GOOGLE_SHEET_ID, cfg.SHEET_NAME);
    const rowIndex = allRows.length; // Last row is the one we just created

    const messages = await getCallMachineMessages();
    const callMachineMessage = messages.get(1);
    const vapiResponse = await makeVapiCall(phone as string, name as string, channel as string, 1, callMachineMessage);

    if (!vapiResponse.success) {
      throw new Error(vapiResponse.error || 'Unknown Vapi error');
    }

    console.log(`📊 Found ${allRows.length - 1} contacts, new contact is at row ${rowIndex}`);

    const now = new Date();
    console.log(`📝 Updating row ${rowIndex} with Vapi Call ID: ${vapiResponse.callId}`);

    try {
      await SheetUtils.updateContactRow(
        cfg.GOOGLE_SHEET_ID,
        rowIndex,
        {
          [4]: ContactStatus.IN_PROGRESS, // Status
          [10]: vapiResponse.callId, // Vapi Call ID
          [7]: now.toISOString(), // Last Attempt
        } as Partial<SheetUtils.ContactRow>,
        cfg.SHEET_NAME
      );
      console.log(`✅ Contact ${id} dispatched with Call ID: ${vapiResponse.callId}`);
    } catch (updateErr) {
      const updateErrMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      console.error(`❌ Failed to update contact row ${rowIndex}:`, updateErrMsg);
      throw updateErr;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to dispatch contact ${id}:`, errMsg);

    // Mark as failed with retry delay on initial dispatch error
    try {
      const allRows = await SheetUtils.getTrackerData(cfg.GOOGLE_SHEET_ID, cfg.SHEET_NAME);
      const rowIndex = allRows.length;
      if (rowIndex > 0) {
        const currentRow = allRows[rowIndex - 1] as SheetUtils.ContactRow;
        await markFailed(rowIndex, currentRow, `Initial dispatch failed: ${errMsg}`);
      }
    } catch (markErr) {
      console.error(`Failed to mark contact as failed:`, markErr);
    }

    throw err;
  }
}

export async function dispatchContactById(contactId: string, retries: number = 3): Promise<void> {
  const cfg = getConfig();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const rows = await SheetUtils.getTrackerData(
        cfg.GOOGLE_SHEET_ID,
        cfg.SHEET_NAME
      );

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as SheetUtils.ContactRow;
        if (row[0] === contactId) {
          await dispatchContact(i + 1, row);
          return;
        }
      }

      // Not found, retry after a delay
      if (attempt < retries - 1) {
        console.log(`⏳ Contact not found (attempt ${attempt + 1}/${retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      throw new Error(`Contact not found: ${contactId}`);
    } catch (err) {
      if (attempt === retries - 1) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to dispatch contact ${contactId}:`, errMsg);
        throw err;
      }
    }
  }
}

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
    const messages = await getCallMachineMessages();
    const callMachineMessage = messages.get(attemptCount + 1);
    const vapiResponse = await makeVapiCall(phone, name, channel, attemptCount + 1, callMachineMessage);

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
export async function makeVapiCall(
  phone: string,
  name: string,
  channel: string,
  attemptNumber: number = 1,
  callMachineMessage?: string
): Promise<VapiResponse> {
  const cfg = getConfig();
  const url = 'https://api.vapi.ai/call';

  const payload = {
    phoneNumberId: cfg.VAPI_PHONE_NUMBER_ID,
    customerPhoneNumber: phone,
    assistantId: cfg.VAPI_ASSISTANT_ID,
    assistantOverrides: {
      ...(callMachineMessage && { voicemailMessage: callMachineMessage }),
      variableValues: {
        customerName: name,
        channel,
        attemptNumber,
      },
    },
  };

  if (process.env.DEBUG) {
    console.log('🔍 DEBUG: Outgoing Vapi payload:', JSON.stringify(payload, null, 2));
  }

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

  // Fetch current row from sheet to get updated attempt count
  const allRows = await SheetUtils.getTrackerData(cfg.GOOGLE_SHEET_ID, cfg.SHEET_NAME);
  const currentRow = allRows[rowIndex - 1] as SheetUtils.ContactRow;
  const attemptCount = parseInt(String(currentRow[5])) || 0;
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
    // Schedule retry with delay from RETRY_DELAYS_MINUTES
    // Use attemptCount - 1 because attemptCount is 1-indexed but array is 0-indexed
    // After attempt 1 fails (attemptCount=1): use RETRY_DELAYS_MINUTES[0]
    // After attempt 2 fails (attemptCount=2): use RETRY_DELAYS_MINUTES[1], etc.
    const delayIndex = Math.min(attemptCount - 1, cfg.RETRY_DELAYS_MINUTES.length - 1);
    const delayMinutes = cfg.RETRY_DELAYS_MINUTES[delayIndex] ?? 60;
    const delayMs = delayMinutes * 60000;
    const nextRetryTime = now.getTime() + delayMs;
    const nextRetry = new Date(nextRetryTime);

    console.log(`📋 markFailed for ${row[0]}: attemptCount=${attemptCount}, delayIndex=${delayIndex}, delayMinutes=${delayMinutes}, nextRetry=${nextRetry.toISOString()}`);

    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [4]: ContactStatus.FAILED,
        [8]: nextRetry.toISOString(), // Next Retry (column I)
      } as Partial<SheetUtils.ContactRow>,
      cfg.SHEET_NAME
    );

    await SheetUtils.appendContactNote(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      `⏱️ FAILED (attempt ${attemptCount + 1}/${cfg.MAX_ATTEMPTS}): ${reason} | Retry in ${delayMinutes || 60}min at ${nextRetry.toISOString()}`,
      cfg.SHEET_NAME
    );
    console.log(
      `⏱️ ${row[0]}: scheduled retry in ${delayMinutes ?? 60}min (${nextRetry.toISOString()})`
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
