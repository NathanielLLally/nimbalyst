/**
 * Vapi Contact Tracker
 *
 * Manages the complete lifecycle of contacts from form submission through
 * Vapi call dispatch, polling, and retry logic using Google Sheets for persistence.
 *
 * Sheet structure (12 columns):
 * A: ID | B: Phone | C: Name | D: Channel (voice/sms) | E: Status | F: Attempt Count
 * G: Submitted | H: Last Attempt | I: Next Retry | J: Resolved | K: Vapi Call ID | L: Notes
 */

const CONFIG = {
  GOOGLE_SHEET_ID: 'YOUR_SHEET_ID',
  GOOGLE_API_KEY: 'YOUR_API_KEY',
  VAPI_API_KEY: 'YOUR_VAPI_API_KEY',
  VAPI_PHONE_NUMBER_ID: 'YOUR_PHONE_NUMBER_ID',
  VAPI_ASSISTANT_ID: 'YOUR_ASSISTANT_ID',

  // Retry configuration (minutes between attempts)
  RETRY_DELAYS_MINUTES: [0, 5, 15, 60],
  MAX_ATTEMPTS: 4,

  // Poll interval in seconds (how often to check Vapi status)
  POLL_INTERVAL_SECONDS: 30,
};

// ============================================================================
// State Constants
// ============================================================================

const STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
};

const CHANNELS = {
  VOICE: 'voice',
  SMS: 'sms',
};

// ============================================================================
// Form Submission Handler
// ============================================================================

/**
 * Called when a form is submitted. Creates a new row in the sheet.
 *
 * @param {Object} formData - Contact data from form submission
 * @param {string} formData.phone - Phone number (E.164 format)
 * @param {string} formData.name - Contact name
 * @param {string} formData.email - Contact email
 * @param {string} formData.company - Company name
 * @param {string} formData.challenge - Business challenge
 * @param {string} channel - 'voice' or 'sms'
 */
async function onFormSubmit(formData, channel = CHANNELS.VOICE) {
  const now = new Date();
  const id = generateId();

  const row = [
    id,                           // A: ID
    formData.phone,               // B: Phone
    formData.name,                // C: Name
    channel,                      // D: Channel
    STATES.PENDING,               // E: Status
    0,                            // F: Attempt Count
    now.toISOString(),            // G: Submitted
    '',                           // H: Last Attempt
    now.toISOString(),            // I: Next Retry (immediately)
    '',                           // J: Resolved
    '',                           // K: Vapi Call ID
    `Form submitted: ${formData.email} | Challenge: ${formData.challenge}`, // L: Notes
  ];

  await appendToSheet(row);
  console.log(`✅ Contact created: ${id} (${formData.phone})`);

  return id;
}

// ============================================================================
// Main Processing Loop
// ============================================================================

/**
 * Main processor - runs on a scheduled trigger.
 * Dispatches pending contacts and polls in-progress ones.
 */
async function processContacts() {
  try {
    const sheet = await getSheet();
    const rows = sheet.data.values || [];

    if (rows.length < 2) {
      console.log('No contacts to process');
      return;
    }

    const now = new Date();

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = row[4]; // Column E

      try {
        if (status === STATES.PENDING || status === STATES.FAILED) {
          const nextRetry = new Date(row[8]); // Column I

          // Check if it's time to retry
          if (nextRetry <= now) {
            await dispatchContact(i + 1, row, sheet); // +1 for 1-indexed
          }
        } else if (status === STATES.IN_PROGRESS) {
          await pollInProgress(i + 1, row, sheet);
        }
      } catch (err) {
        console.error(`Error processing row ${i + 1}:`, err);
        await updateNotes(i + 1, `Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('❌ processContacts error:', err);
  }
}

// ============================================================================
// Dispatch Logic
// ============================================================================

/**
 * Dispatch a contact to Vapi (voice call or SMS).
 */
async function dispatchContact(rowIndex, row, sheet) {
  const id = row[0];
  const phone = row[1];
  const name = row[2];
  const channel = row[3];
  const attemptCount = parseInt(row[5]) || 0;

  console.log(`📞 Dispatching ${id} (attempt ${attemptCount + 1}/${CONFIG.MAX_ATTEMPTS})`);

  try {
    // Make the Vapi call
    const vapiResponse = await makeVapiCall(phone, name, channel);

    if (!vapiResponse.success) {
      throw new Error(vapiResponse.error || 'Unknown Vapi error');
    }

    const now = new Date();
    const updated = [...row];
    updated[4] = STATES.IN_PROGRESS;        // Status
    updated[5] = attemptCount + 1;          // Attempt Count
    updated[7] = now.toISOString();         // Last Attempt
    updated[10] = vapiResponse.callId;      // Vapi Call ID

    await updateRow(rowIndex, updated);
    await updateNotes(
      rowIndex,
      `Dispatched to Vapi (call ID: ${vapiResponse.callId})`
    );

    console.log(`✅ Dispatch successful: ${id} (call ID: ${vapiResponse.callId})`);
  } catch (err) {
    console.error(`❌ Dispatch failed for ${id}:`, err.message);
    await markFailed(rowIndex, row, err.message);
  }
}

/**
 * Call Vapi API to initiate voice call or SMS.
 */
async function makeVapiCall(phone, name, channel) {
  const url = 'https://api.vapi.ai/call';

  const payload = {
    phoneNumberId: CONFIG.VAPI_PHONE_NUMBER_ID,
    customerPhoneNumber: phone,
    assistantId: CONFIG.VAPI_ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        customerName: name,
        channel: channel,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CONFIG.VAPI_API_KEY,
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
    return {
      success: false,
      error: err.message,
    };
  }
}

// ============================================================================
// Polling Logic
// ============================================================================

/**
 * Poll Vapi for status of an in-progress call.
 */
async function pollInProgress(rowIndex, row, sheet) {
  const id = row[0];
  const vapiCallId = row[10]; // Vapi Call ID

  if (!vapiCallId) {
    console.warn(`No Vapi Call ID for ${id}, marking failed`);
    await markFailed(rowIndex, row, 'Missing Vapi Call ID');
    return;
  }

  try {
    const status = await getVapiCallStatus(vapiCallId);

    console.log(`📊 ${id} status: ${status.status}`);

    if (status.status === 'completed') {
      if (status.endedReason === 'customer_ended' || status.endedReason === 'assistant_ended') {
        await markSuccess(rowIndex, row, status);
      } else {
        await markFailed(rowIndex, row, `Ended: ${status.endedReason}`);
      }
    } else if (status.status === 'failed') {
      await markFailed(rowIndex, row, status.error || 'Vapi call failed');
    }
    // If still 'queued' or 'in-progress', wait for next poll
  } catch (err) {
    console.error(`Error polling ${id}:`, err.message);
  }
}

/**
 * Get Vapi call status.
 */
async function getVapiCallStatus(callId) {
  const url = `https://api.vapi.ai/call/${callId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': CONFIG.VAPI_API_KEY,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return {
      status: data.status, // queued, in-progress, completed, failed
      endedReason: data.endedReason,
      error: data.error,
      transcript: data.transcript,
      duration: data.duration,
    };
  } catch (err) {
    throw new Error(`Failed to poll Vapi: ${err.message}`);
  }
}

// ============================================================================
// State Transitions
// ============================================================================

/**
 * Mark a contact as successful.
 */
async function markSuccess(rowIndex, row, vapiStatus) {
  const now = new Date();
  const updated = [...row];

  updated[4] = STATES.SUCCESS;              // Status
  updated[9] = now.toISOString();           // Resolved

  await updateRow(rowIndex, updated);

  let notes = `✅ SUCCESS at ${now.toISOString()}`;
  if (vapiStatus.duration) {
    notes += ` | Duration: ${vapiStatus.duration}s`;
  }
  if (vapiStatus.transcript) {
    notes += ` | Transcript: ${vapiStatus.transcript.substring(0, 100)}...`;
  }

  await updateNotes(rowIndex, notes);
  console.log(`✅ Contact ${row[0]} marked SUCCESS`);
}

/**
 * Mark a contact as failed and schedule retry.
 */
async function markFailed(rowIndex, row, reason) {
  const attemptCount = parseInt(row[5]) || 0;
  const now = new Date();
  const updated = [...row];

  if (attemptCount >= CONFIG.MAX_ATTEMPTS) {
    // No more retries
    updated[4] = STATES.RETRY_EXHAUSTED;
    updated[9] = now.toISOString();
    await updateRow(rowIndex, updated);
    await updateNotes(rowIndex, `❌ RETRY_EXHAUSTED: ${reason}`);
    console.log(`❌ Contact ${row[0]} exhausted all retries`);
  } else {
    // Schedule retry
    const delayMinutes = CONFIG.RETRY_DELAYS_MINUTES[attemptCount] || 60;
    const nextRetry = new Date(now.getTime() + delayMinutes * 60000);

    updated[4] = STATES.FAILED;
    updated[8] = nextRetry.toISOString();   // Next Retry

    await updateRow(rowIndex, updated);
    await updateNotes(
      rowIndex,
      `⏱️ FAILED (retry ${attemptCount + 1}/${CONFIG.MAX_ATTEMPTS}): ${reason} | Next retry: ${nextRetry.toISOString()}`
    );
    console.log(`⏱️ Contact ${row[0]} scheduled for retry at ${nextRetry.toISOString()}`);
  }
}

// ============================================================================
// Webhook Handler (Vapi Callback)
// ============================================================================

/**
 * Handle incoming webhook from Vapi (alternative to polling).
 * This replaces polling if Vapi supports webhooks.
 */
async function onVapiWebhook(vapiEvent) {
  const callId = vapiEvent.callId || vapiEvent.id;

  console.log(`📨 Vapi webhook: ${callId} | Status: ${vapiEvent.status}`);

  try {
    const sheet = await getSheet();
    const rows = sheet.data.values || [];

    // Find row by Vapi Call ID
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][10] === callId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(`No row found for call ID ${callId}`);
      return;
    }

    const row = rows[rowIndex - 1];

    if (vapiEvent.status === 'completed' && vapiEvent.endedReason) {
      if (['customer_ended', 'assistant_ended'].includes(vapiEvent.endedReason)) {
        await markSuccess(rowIndex, row, vapiEvent);
      } else {
        await markFailed(rowIndex, row, `Ended: ${vapiEvent.endedReason}`);
      }
    } else if (vapiEvent.status === 'failed') {
      await markFailed(rowIndex, row, vapiEvent.error || 'Vapi call failed');
    }
  } catch (err) {
    console.error('❌ onVapiWebhook error:', err);
  }
}

// ============================================================================
// Sheet Operations
// ============================================================================

/**
 * Get the sheet data.
 */
async function getSheet() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEET_ID}/values/Sheet1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.GOOGLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status}`);
  }

  return response.json();
}

/**
 * Append a row to the sheet.
 */
async function appendToSheet(row) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEET_ID}/values/Sheet1!A:L:append?valueInputOption=RAW`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.GOOGLE_API_KEY}`,
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to append row: ${response.status}`);
  }
}

/**
 * Update a specific row.
 */
async function updateRow(rowIndex, rowData) {
  const range = `Sheet1!A${rowIndex}:L${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.GOOGLE_API_KEY}`,
    },
    body: JSON.stringify({
      values: [rowData],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update row: ${response.status}`);
  }
}

/**
 * Append a note to the Notes column (L).
 */
async function updateNotes(rowIndex, note) {
  const sheet = await getSheet();
  const row = sheet.data.values[rowIndex - 1];
  const existing = row[11] || '';
  const timestamp = new Date().toISOString().substring(0, 19);
  const newNote = existing ? `${existing}\n[${timestamp}] ${note}` : note;

  row[11] = newNote;
  await updateRow(rowIndex, row);
}

// ============================================================================
// Utilities
// ============================================================================

function generateId() {
  return `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// Google Apps Script Integration (Optional)
// ============================================================================

/**
 * Install time-based trigger (run once in Apps Script editor).
 */
function installTriggers() {
  ScriptApp.newTrigger('processContacts')
    .timeBased()
    .everyMinutes(1)
    .create();

  console.log('✅ Trigger installed: processContacts runs every minute');
}

/**
 * Unified webhook endpoint for form submissions and Vapi callbacks.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'vapi_webhook') {
      onVapiWebhook(data.event);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (data.type === 'form_submit') {
      const contactId = onFormSubmit(data.formData, data.channel || CHANNELS.VOICE);
      return ContentService.createTextOutput(JSON.stringify({ success: true, contactId }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    console.error('❌ doPost error:', err);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// Exports (for Node.js/testing)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    STATES,
    CHANNELS,
    onFormSubmit,
    processContacts,
    onVapiWebhook,
    makeVapiCall,
    getVapiCallStatus,
  };
}
