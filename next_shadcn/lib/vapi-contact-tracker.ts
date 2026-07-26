/**
 * Vapi Contact Tracker
 *
 * Manages the complete lifecycle of contacts from form submission through
 * Vapi call dispatch, polling, and retry logic using Google Sheets for persistence.
 *
 * Configuration: Read from environment variables
 * Sheet structure (14 columns):
 * A: ID | B: Phone | C: Name | D: Email | E: Channel (voice/sms) | F: Status | G: Attempt Count
 * H: Submitted | I: Last Attempt | J: Next Retry | K: Resolved | L: Vapi Call ID | M: Notes | N: Timezone
 */

import * as SheetUtils from './googleSheetUtils';
import * as crypto from 'crypto';
import { startOfDay, setHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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
// Area Code to Timezone Lookup
// ============================================================================

/**
 * Mapping of US area codes to timezones
 * Covers major area codes; uses primary timezone for region
 */
const AREA_CODE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time Zone
  '201': 'America/New_York', '202': 'America/New_York', '203': 'America/New_York',
  '212': 'America/New_York', '220': 'America/New_York', '223': 'America/New_York',
  '231': 'America/New_York', '240': 'America/New_York', '248': 'America/New_York',
  '260': 'America/New_York', '267': 'America/New_York', '301': 'America/New_York',
  '302': 'America/New_York', '303': 'America/New_York', '304': 'America/New_York',
  '305': 'America/New_York', '307': 'America/Denver', '308': 'America/Denver',
  '309': 'America/Chicago', '310': 'America/Los_Angeles', '312': 'America/Chicago',
  '313': 'America/Detroit', '314': 'America/Chicago', '315': 'America/New_York',
  '316': 'America/Chicago', '317': 'America/Indiana/Indianapolis', '318': 'America/Chicago',
  '319': 'America/Chicago', '320': 'America/Chicago', '321': 'America/New_York',
  '323': 'America/Los_Angeles', '325': 'America/Chicago', '330': 'America/New_York',
  '334': 'America/Chicago', '336': 'America/New_York', '337': 'America/Chicago',
  '339': 'America/New_York', '340': 'America/Virgin', '347': 'America/New_York',
  '351': 'America/New_York', '352': 'America/New_York', '360': 'America/Los_Angeles',
  '361': 'America/Chicago', '364': 'America/Chicago', '380': 'America/New_York',
  '385': 'America/Denver', '386': 'America/New_York', '401': 'America/New_York',
  '402': 'America/Chicago', '404': 'America/New_York', '405': 'America/Chicago',
  '406': 'America/Denver', '407': 'America/New_York', '408': 'America/Los_Angeles',
  '409': 'America/Chicago', '410': 'America/New_York', '412': 'America/New_York',
  '413': 'America/New_York', '414': 'America/Chicago', '415': 'America/Los_Angeles',
  '417': 'America/Chicago', '419': 'America/New_York', '423': 'America/Chicago',
  '424': 'America/Los_Angeles', '425': 'America/Los_Angeles', '430': 'America/Chicago',
  '432': 'America/Chicago', '434': 'America/New_York', '435': 'America/Denver',
  '440': 'America/New_York', '441': 'America/Bermuda', '442': 'America/Los_Angeles',
  '443': 'America/New_York', '445': 'America/New_York', '458': 'America/Los_Angeles',
  '460': 'America/Chicago', '463': 'America/Indiana/Indianapolis', '464': 'America/Chicago',
  '469': 'America/Chicago', '470': 'America/New_York', '472': 'America/Chicago',
  '475': 'America/New_York', '478': 'America/New_York', '479': 'America/Chicago',
  '480': 'America/Phoenix', '484': 'America/New_York', '501': 'America/Chicago',
  '502': 'America/Kentucky/Louisville', '503': 'America/Los_Angeles', '504': 'America/Chicago',
  '505': 'America/Denver', '507': 'America/Chicago', '508': 'America/New_York',
  '509': 'America/Los_Angeles', '510': 'America/Los_Angeles', '512': 'America/Chicago',
  '513': 'America/New_York', '515': 'America/Chicago', '516': 'America/New_York',
  '517': 'America/Detroit', '518': 'America/New_York', '520': 'America/Phoenix',
  '530': 'America/Los_Angeles', '540': 'America/New_York', '541': 'America/Los_Angeles',
  '551': 'America/New_York', '557': 'America/Chicago', '559': 'America/Los_Angeles',
  '561': 'America/New_York', '562': 'America/Los_Angeles', '563': 'America/Chicago',
  '567': 'America/New_York', '570': 'America/New_York', '571': 'America/New_York',
  '573': 'America/Chicago', '575': 'America/Denver', '580': 'America/Chicago',
  '585': 'America/New_York', '586': 'America/Detroit', '601': 'America/Chicago',
  '602': 'America/Phoenix', '603': 'America/New_York', '605': 'America/Chicago',
  '606': 'America/Kentucky/Louisville', '607': 'America/New_York', '608': 'America/Chicago',
  '609': 'America/New_York', '610': 'America/New_York', '612': 'America/Chicago',
  '613': 'America/Toronto', '614': 'America/New_York', '615': 'America/Chicago',
  '616': 'America/Detroit', '617': 'America/New_York', '618': 'America/Chicago',
  '619': 'America/Los_Angeles', '620': 'America/Chicago', '623': 'America/Phoenix',
  '626': 'America/Los_Angeles', '628': 'America/Los_Angeles', '629': 'America/Chicago',
  '630': 'America/Chicago', '631': 'America/New_York', '636': 'America/Chicago',
  '640': 'America/Los_Angeles', '641': 'America/Chicago', '646': 'America/New_York',
  '650': 'America/Los_Angeles', '651': 'America/Chicago', '660': 'America/Chicago',
  '661': 'America/Los_Angeles', '662': 'America/Chicago', '667': 'America/New_York',
  '669': 'America/Los_Angeles', '671': 'America/Guam', '678': 'America/New_York',
  '680': 'America/New_York', '681': 'America/New_York', '682': 'America/Chicago',
  '684': 'America/Samoa', '689': 'America/New_York', '700': 'America/New_York',
  '701': 'America/Chicago', '702': 'America/Los_Angeles', '703': 'America/New_York',
  '704': 'America/New_York', '705': 'America/Toronto', '706': 'America/New_York',
  '707': 'America/Los_Angeles', '708': 'America/Chicago', '709': 'America/St_Johns',
  '710': 'America/Chicago', '712': 'America/Chicago', '713': 'America/Chicago',
  '714': 'America/Los_Angeles', '715': 'America/Chicago', '716': 'America/New_York',
  '717': 'America/New_York', '718': 'America/New_York', '719': 'America/Denver',
  '720': 'America/Denver', '724': 'America/New_York', '725': 'America/Los_Angeles',
  '727': 'America/New_York', '730': 'America/Chicago', '731': 'America/Chicago',
  '732': 'America/New_York', '734': 'America/Detroit', '737': 'America/Chicago',
  '740': 'America/New_York', '743': 'America/New_York', '747': 'America/Los_Angeles',
  '754': 'America/New_York', '757': 'America/New_York', '760': 'America/Los_Angeles',
  '762': 'America/New_York', '763': 'America/Chicago', '765': 'America/Indiana/Indianapolis',
  '769': 'America/Chicago', '770': 'America/New_York', '771': 'America/New_York',
  '772': 'America/New_York', '773': 'America/Chicago', '774': 'America/New_York',
  '775': 'America/Los_Angeles', '776': 'America/New_York', '778': 'America/Vancouver',
  '779': 'America/Chicago', '781': 'America/New_York', '786': 'America/New_York',
  '801': 'America/Denver', '802': 'America/New_York', '803': 'America/New_York',
  '804': 'America/New_York', '805': 'America/Los_Angeles', '806': 'America/Chicago',
  '808': 'Pacific/Honolulu', '809': 'America/Puerto_Rico', '810': 'America/Detroit',
  '812': 'America/Indiana/Indianapolis', '813': 'America/New_York', '814': 'America/New_York',
  '815': 'America/Chicago', '816': 'America/Chicago', '817': 'America/Chicago',
  '818': 'America/Los_Angeles', '820': 'America/Chicago', '825': 'America/Los_Angeles',
  '828': 'America/New_York', '830': 'America/Chicago', '831': 'America/Los_Angeles',
  '832': 'America/Chicago', '835': 'America/New_York', '843': 'America/New_York',
  '844': 'America/New_York', '845': 'America/New_York', '847': 'America/Chicago',
  '848': 'America/New_York', '850': 'America/Chicago', '856': 'America/New_York',
  '857': 'America/New_York', '858': 'America/Los_Angeles', '859': 'America/Kentucky/Louisville',
  '860': 'America/New_York', '862': 'America/New_York', '863': 'America/New_York',
  '864': 'America/New_York', '865': 'America/Chicago', '866': 'America/New_York',
  '867': 'America/Anchorage', '868': 'America/Toronto', '869': 'America/New_York',
  '870': 'America/Chicago', '878': 'America/New_York', '880': 'America/New_York',
  '881': 'America/New_York', '882': 'America/New_York', '883': 'America/New_York',
  '884': 'America/New_York', '885': 'America/Los_Angeles', '886': 'America/New_York',
  '887': 'America/New_York', '888': 'America/New_York', '900': 'America/New_York',
  '901': 'America/Chicago', '902': 'America/Halifax', '903': 'America/Chicago',
  '904': 'America/New_York', '905': 'America/Toronto', '906': 'America/Detroit',
  '907': 'America/Anchorage', '908': 'America/New_York', '909': 'America/Los_Angeles',
  '910': 'America/New_York', '912': 'America/New_York', '913': 'America/Chicago',
  '914': 'America/New_York', '915': 'America/Denver', '916': 'America/Los_Angeles',
  '917': 'America/New_York', '918': 'America/Chicago', '919': 'America/New_York',
  '920': 'America/Chicago', '925': 'America/Los_Angeles', '928': 'America/Phoenix',
  '929': 'America/New_York', '930': 'America/New_York', '931': 'America/Chicago',
  '932': 'America/New_York', '934': 'America/New_York', '936': 'America/Chicago',
  '937': 'America/New_York', '938': 'America/Chicago', '939': 'America/Puerto_Rico',
  '940': 'America/Chicago', '941': 'America/New_York', '942': 'America/Los_Angeles',
  '943': 'America/New_York', '945': 'America/Denver', '947': 'America/Detroit',
  '948': 'America/Chicago', '949': 'America/Los_Angeles', '950': 'America/New_York',
  '951': 'America/Los_Angeles', '952': 'America/Chicago', '953': 'America/Chicago',
  '954': 'America/New_York', '955': 'America/Chicago', '956': 'America/Chicago',
  '957': 'America/Denver', '958': 'America/Denver', '959': 'America/New_York',
  '960': 'America/New_York', '961': 'America/Chicago', '962': 'America/Denver',
  '963': 'America/New_York', '964': 'America/Los_Angeles', '965': 'America/Los_Angeles',
  '970': 'America/Denver', '971': 'America/Los_Angeles', '972': 'America/Chicago',
  '973': 'America/New_York', '975': 'America/New_York', '976': 'America/Chicago',
  '978': 'America/New_York', '979': 'America/Chicago', '980': 'America/New_York',
  '981': 'America/New_York', '982': 'America/New_York', '983': 'America/Chicago',
  '984': 'America/New_York', '985': 'America/Chicago', '986': 'America/Los_Angeles',
  '989': 'America/Detroit',
};

/**
 * Infer timezone from phone number's area code
 * E.164 format: +1[areacode][number]
 */
export function inferTimezoneFromPhone(phone: string): string | null {
  try {
    // Extract area code from E.164 format: +1 [areacode] [number]
    // Example: +16464507917 -> area code is 646
    const match = phone.match(/^\+1(\d{3})/);
    if (!match) return null;

    const areaCode = match[1];
    return AREA_CODE_TIMEZONE_MAP[areaCode] || null;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// Schedule Planning Helper
// ============================================================================

/**
 * Calculate earliest and latest call times (10am–4pm) in the lead's timezone
 * Returns Unix timestamps in milliseconds for Vapi schedulePlan
 */
function calculateScheduleWindow(timezone: string): {
  earliestAtMs: number;
  latestAtMs: number;
} | null {
  try {
    const now = new Date();
    // Convert current UTC time to the lead's timezone to get "today" in their zone
    const zonedNow = toZonedTime(now, timezone);

    // Create 10am and 4pm in the lead's timezone
    const earliestTime = setHours(zonedNow, 10);
    const latestTime = setHours(zonedNow, 16); // 4pm is 16:00

    // Convert back to UTC timestamps
    const earliestMs = earliestTime.getTime();
    const latestMs = latestTime.getTime();

    // If the times have already passed today, use tomorrow's window
    if (latestMs < now.getTime()) {
      const tomorrow = new Date(zonedNow);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowEarliest = setHours(tomorrow, 10);
      const tomorrowLatest = setHours(tomorrow, 16);

      return {
        earliestAtMs: tomorrowEarliest.getTime(),
        latestAtMs: tomorrowLatest.getTime(),
      };
    }

    // If before 10am, move earliest to tomorrow at 10am if needed
    if (earliestMs < now.getTime()) {
      const tomorrow = new Date(zonedNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowEarliest = setHours(tomorrow, 10);

      return {
        earliestAtMs: tomorrowEarliest.getTime(),
        latestAtMs: latestMs,
      };
    }

    return {
      earliestAtMs: earliestMs,
      latestAtMs: latestMs,
    };
  } catch (err) {
    console.error(`Failed to calculate schedule window for timezone ${timezone}:`, err);
    return null;
  }
}

// ============================================================================
// HMAC Signature Helper
// ============================================================================

/**
 * Generate HMAC-SHA512 signature for API requests
 * Format: timestamp.body where both timestamp and signature are base64 encoded
 */
function generateHmacSignature(
  payload: object
): { signature: string; timestamp: string } | null {
  const secret = process.env.VAPI_HMAC_PSK;
  if (!secret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  const message = `${timestamp}.${body}`;

  try {
    const secretBuffer = Buffer.from(secret, 'base64');
    const signature = crypto
      .createHmac('sha512', secretBuffer)
      .update(message)
      .digest('base64');

    return { signature, timestamp };
  } catch (err) {
    console.error('Failed to generate HMAC signature:', err);
    return null;
  }
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
  channel: Channel = Channel.VOICE,
  timezone?: string
): Promise<{ id: string; row: SheetUtils.ContactRow }> {
  const cfg = getConfig();
  const now = new Date();
  const id = generateId();

  // Determine timezone: explicit > inferred from area code > UTC
  let finalTimezone = timezone;
  if (!finalTimezone) {
    const inferredTz = inferTimezoneFromPhone(formData.phone);
    finalTimezone = inferredTz || 'UTC';
  }

  if (!timezone && finalTimezone !== 'UTC') {
    console.log(`📍 Inferred timezone from area code: ${finalTimezone}`);
  }

  const row: (string | number)[] = [
    id, // A: ID
    formData.phone, // B: Phone
    formData.fullName, // C: Name
    formData.email, // D: Email
    channel, // E: Channel
    ContactStatus.PENDING, // F: Status
    0, // G: Attempt Count
    now.toISOString(), // H: Submitted
    '', // I: Last Attempt
    '', // J: Next Retry (empty until first dispatch attempt)
    '', // K: Resolved
    '', // L: Vapi Call ID
    `Challenge: ${formData.challenge} | Company: ${formData.company}`, // M: Notes
    finalTimezone, // N: Timezone
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
      const status = row[5] as unknown as ContactStatus;
      const attemptCount = parseInt(String(row[6])) || 0;
      const nextRetryStr = String(row[9]);
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
                [5]: ContactStatus.RETRY_EXHAUSTED,
                [10]: now.toISOString(),
              } as any,
              cfg.SHEET_NAME
            );
            console.log(`⚠️ Contact ${row[0]} exhausted (${attemptCount}/${cfg.MAX_ATTEMPTS} attempts)`);
          }
        } else if (status === ContactStatus.IN_PROGRESS) {
          // Poll the live Vapi call and resolve it to SUCCESS/FAILED. Without
          // this, in-progress calls only ever resolved via the webhook.
          await pollInProgress(rowIndex, row);
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
  const channel = row[4];
  const timezone = row[13] as string | undefined; // N: Timezone

  console.log(`📞 Dispatching ${id} immediately (${phone})`);

  try {
    // Get the row count to find the index
    const allRows = await SheetUtils.getTrackerData(cfg.GOOGLE_SHEET_ID, cfg.SHEET_NAME);
    const rowIndex = allRows.length; // Last row is the one we just created

    const messages = await getCallMachineMessages();
    const callMachineMessage = messages.get(1);
    const vapiResponse = await makeVapiCall(phone as string, name as string, channel as string, 1, callMachineMessage, timezone);

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
          [5]: ContactStatus.IN_PROGRESS, // Status
          [11]: vapiResponse.callId, // Vapi Call ID
          [8]: now.toISOString(), // Last Attempt
        } as any,
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
  const channel = row[4];
  const attemptCount = parseInt(String(row[6])) || 0;
  const timezone = row[13] as string | undefined; // N: Timezone

  console.log(
    `📞 Dispatching ${id} (attempt ${attemptCount + 1}/${cfg.MAX_ATTEMPTS})`
  );

  try {
    const messages = await getCallMachineMessages();
    const callMachineMessage = messages.get(attemptCount + 1);
    const vapiResponse = await makeVapiCall(phone, name, channel, attemptCount + 1, callMachineMessage, timezone);

    if (!vapiResponse.success) {
      throw new Error(vapiResponse.error || 'Unknown Vapi error');
    }

    const now = new Date();
    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [5]: ContactStatus.IN_PROGRESS, // Status
        [6]: attemptCount + 1, // Attempt Count
        [8]: now.toISOString(), // Last Attempt
        [11]: vapiResponse.callId || '', // Vapi Call ID
      } as any,
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
  callMachineMessage?: string,
  timezone?: string
): Promise<VapiResponse> {
  const cfg = getConfig();
  const url = 'https://api.vapi.ai/call';

  const payload: Record<string, any> = {
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

  // Add scheduling constraints if timezone is provided
  if (timezone) {
    const scheduleWindow = calculateScheduleWindow(timezone);
    if (scheduleWindow) {
      payload.schedulePlan = {
        earliestAtMs: scheduleWindow.earliestAtMs,
        latestAtMs: scheduleWindow.latestAtMs,
      };
    }
  }

  if (process.env.DEBUG) {
    console.log('🔍 DEBUG: Outgoing Vapi payload:', JSON.stringify(payload, null, 2));
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.VAPI_API_KEY}`,
    };

    // Add HMAC signature if PSK is configured
    const hmac = generateHmacSignature(payload);
    if (hmac) {
      headers['x-timestamp'] = hmac.timestamp;
      headers['x-signature'] = hmac.signature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let data: any = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { message: rawBody };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.message || rawBody || `HTTP ${response.status}`,
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
  const vapiCallId = row[11];

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
        'Authorization': `Bearer ${cfg.VAPI_API_KEY}`,
      },
    });

    const rawBody = await response.text();
    let data: any = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { message: rawBody };
    }

    if (!response.ok) {
      throw new Error(data.message || rawBody || `HTTP ${response.status}`);
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
      [5]: ContactStatus.SUCCESS, // Status
      [10]: now.toISOString(), // Resolved
    } as any,
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

  // Use the in-memory row's attempt count instead of re-reading the whole
  // sheet. Within a pass each row is touched once, and the attempt count is
  // only bumped on a *successful* dispatch (which never calls markFailed), so
  // row[6] still matches the sheet here. Saves a full-sheet read per failure.
  const attemptCount = parseInt(String(row[6])) || 0;
  const now = new Date();

  if (attemptCount >= cfg.MAX_ATTEMPTS) {
    // No more retries
    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [5]: ContactStatus.RETRY_EXHAUSTED,
        [10]: now.toISOString(),
      } as any,
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
    const delayIndex = Math.min(Math.max(0, attemptCount - 1), cfg.RETRY_DELAYS_MINUTES.length - 1);
    const rawDelayValue = cfg.RETRY_DELAYS_MINUTES[delayIndex];
    const delayMinutes = rawDelayValue !== undefined && rawDelayValue !== null ? rawDelayValue : 60;
    const delayMs = delayMinutes * 60000;
    const nextRetryTime = now.getTime() + delayMs;
    const nextRetry = new Date(nextRetryTime);

    if (process.env.DEBUG) {
      console.log(`🔍 DEBUG markFailed: config=${JSON.stringify(cfg.RETRY_DELAYS_MINUTES)}, attemptCount=${attemptCount}, delayIndex=${delayIndex}, rawValue=${rawDelayValue}, delayMinutes=${delayMinutes}, delayMs=${delayMs}`);
    }

    console.log(`📋 markFailed for ${row[0]}: attemptCount=${attemptCount}, delayIndex=${delayIndex}, delayMinutes=${delayMinutes}, nextRetry=${nextRetry.toISOString()}`);

    await SheetUtils.updateContactRow(
      cfg.GOOGLE_SHEET_ID,
      rowIndex,
      {
        [5]: ContactStatus.FAILED,
        [9]: nextRetry.toISOString(), // Next Retry (column J)
      } as any,
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
    // Find row by Vapi Call ID (column L, index 11). Index 10 is Resolved —
    // searching there meant the webhook never matched a row.
    const matches = await SheetUtils.findContactRows(
      cfg.GOOGLE_SHEET_ID,
      11,
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
