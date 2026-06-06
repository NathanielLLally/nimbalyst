# Vapi Contact Tracker

Complete lifecycle tracking for voice calls and SMS through Vapi, with Google Sheets persistence and intelligent retry logic.

## How It Works

### Lifecycle Flow

```
Form Submit → PENDING
  ↓ (retry due)
IN_PROGRESS  ← Vapi dispatched (call ID stored)
  ↓ (poll or webhook)
SUCCESS      ← Call completed successfully
              OR
FAILED       → Retry scheduled (exponential backoff)
              → back to PENDING
              OR
RETRY_EXHAUSTED → All attempts consumed
```

### Sheet Structure

12 columns track each contact end-to-end:

| Col | Name | Purpose |
|-----|------|---------|
| A | ID | Unique contact identifier |
| B | Phone | Phone number (E.164 format) |
| C | Name | Contact name |
| D | Channel | `voice` or `sms` |
| E | Status | PENDING, IN_PROGRESS, SUCCESS, FAILED, RETRY_EXHAUSTED |
| F | Attempt Count | Number of dispatch attempts |
| G | Submitted | ISO timestamp of form submission |
| H | Last Attempt | ISO timestamp of last dispatch |
| I | Next Retry | ISO timestamp when to retry (if FAILED) |
| J | Resolved | ISO timestamp when resolved (SUCCESS or RETRY_EXHAUSTED) |
| K | Vapi Call ID | ID from Vapi API response |
| L | Notes | State transition log with timestamps |

### Key Functions

| Function | Purpose |
|----------|---------|
| `onFormSubmit(data, channel)` | Create initial row from form payload |
| `processContacts()` | Main loop: dispatch due contacts, poll in-progress ones |
| `dispatchContact()` | Send to Vapi, move to IN_PROGRESS |
| `pollInProgress()` | Check Vapi status, advance to SUCCESS or FAILED |
| `markFailed()` | Schedule retry with exponential backoff or exhaust |
| `markSuccess()` | Mark resolved with timestamps |
| `onVapiWebhook()` | Handle push updates from Vapi (replaces polling) |
| `doPost()` | Unified webhook for form submits + Vapi callbacks |

## Retry Logic

Configurable exponential backoff:

```javascript
RETRY_DELAYS_MINUTES: [0, 5, 15, 60]  // minutes between attempts
MAX_ATTEMPTS: 4                        // total attempts (including initial)
```

**Timeline example:**
- Attempt 1 at T+0 → fails
- Attempt 2 at T+5 min → fails
- Attempt 3 at T+20 min (5+15) → fails
- Attempt 4 at T+80 min (5+15+60) → fails/success
- → RETRY_EXHAUSTED if all fail

Change these in `CONFIG` at the top of the file.

## Deployment

### Option 1: Google Apps Script (Recommended)

Best for: Low volume, serverless, tied to Google Sheets.

1. Create a new Apps Script project at https://script.google.com
2. Replace the entire `Code.gs` with the tracker code
3. Update the 5 config values at the top:
   ```javascript
   GOOGLE_SHEET_ID: 'paste-your-sheet-id-here',
   GOOGLE_API_KEY: 'paste-your-api-key',
   VAPI_API_KEY: 'paste-your-vapi-key',
   VAPI_PHONE_NUMBER_ID: 'paste-your-phone-id',
   VAPI_ASSISTANT_ID: 'paste-your-assistant-id',
   ```
4. Run `installTriggers()` once in the editor (it sets up a 1-minute recurring trigger)
5. Deploy → New Deployment → Type: Web App → Execute as: your account
6. Copy the deployment URL for webhooks

### Option 2: Node.js Server

Best for: High volume, custom logic, more control.

```bash
npm install node-fetch dotenv
```

Create `index.js`:
```javascript
require('dotenv').config();
const tracker = require('./lib/vapi-contact-tracker');

// Update config from env
tracker.CONFIG.GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
tracker.CONFIG.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
// ... etc

// Express server
const express = require('express');
const app = express();
app.use(express.json());

// Form submission endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const contactId = await tracker.onFormSubmit(req.body.formData, req.body.channel);
    res.json({ success: true, contactId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vapi webhook endpoint
app.post('/api/vapi-webhook', async (req, res) => {
  try {
    await tracker.onVapiWebhook(req.body.event);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Process loop (run every 30 seconds)
setInterval(() => {
  tracker.processContacts().catch(err => console.error(err));
}, 30000);

app.listen(3000);
```

## Configuration

### VAPI Setup

1. **Get Vapi credentials:**
   - API Key: Dashboard → Settings → API Keys
   - Phone Number ID: Phone Numbers → select number → copy ID
   - Assistant ID: Assistants → select assistant → copy ID

2. **Configure assistant variables:**
   - In Vapi dashboard, add variables to your assistant:
     - `customerName` (string)
     - `channel` (string: "voice" or "sms")
   - Use these in your assistant's system prompt for personalization

3. **Set up webhook (optional, for faster updates):**
   - In Vapi dashboard, go to Assistant → Webhooks
   - Add webhook URL pointing to your deployment
   - Event: `call.ended`
   - This replaces polling with real-time updates

### Google Sheets Setup

1. Create a new Google Sheet with these headers (row 1):
   ```
   ID | Phone | Name | Channel | Status | Attempt Count | Submitted | 
   Last Attempt | Next Retry | Resolved | Vapi Call ID | Notes
   ```

2. Share the sheet with your service account email (if using service account auth)
3. Copy the Sheet ID from the URL: `docs.google.com/spreadsheets/d/{SHEET_ID}/`

### Credentials

**Apps Script:** Uses built-in `ScriptApp` for Google auth. Vapi API key is in the code.

**Node.js:** Use environment variables:
```bash
GOOGLE_SHEET_ID=your-sheet-id
GOOGLE_API_KEY=your-api-key
VAPI_API_KEY=your-vapi-key
VAPI_PHONE_NUMBER_ID=your-phone-id
VAPI_ASSISTANT_ID=your-assistant-id
```

## Monitoring

### Logs

The tracker logs events with clear prefixes:
- ✅ Success
- ❌ Error
- 📞 Dispatch
- 📊 Poll
- 📨 Webhook
- ⏱️ Retry scheduled

### Sheet Analysis

**Find all contacts needing action:**
```
Status = "PENDING" OR Status = "FAILED"
```

**See retry schedule:**
Filter by `Status = "FAILED"` and sort by `Next Retry` ascending.

**Audit recent changes:**
Look at `Notes` column — each state transition is timestamped.

**Success rate:**
```
COUNT(Status = "SUCCESS") / (COUNT(Status = "SUCCESS") + COUNT(Status = "RETRY_EXHAUSTED"))
```

## Customization

### Change Retry Delays

In `CONFIG`:
```javascript
RETRY_DELAYS_MINUTES: [0, 10, 30, 120],  // 10, 30, 120 minutes
MAX_ATTEMPTS: 4,                         // 4 total attempts
```

### Custom Status Messages

In `markFailed()`, customize the note format:
```javascript
await updateNotes(
  rowIndex,
  `⏱️ FAILED (attempt ${attemptCount + 1}): ${reason}`
);
```

### Add SMS Support

Already built in — just pass `channel: CHANNELS.SMS` to `onFormSubmit()`. The tracker stores channel and passes it to Vapi's assistant.

### Poll vs Webhook

**Polling** (default):
- `processContacts()` runs every 1 minute (Apps Script) or 30 seconds (Node.js)
- Checks status of IN_PROGRESS rows
- Works everywhere, slightly delayed (~1 min latency)

**Webhook** (faster):
- Vapi calls your endpoint when call ends
- Near-instant status update
- Requires public URL and Vapi webhook setup
- Call `onVapiWebhook()` directly from your webhook handler

You can use both — webhook for real-time, polling as fallback.

## Example Integration with Happy Tails Form

In your `/api/contact` endpoint:

```javascript
import { onFormSubmit } from '@/lib/vapi-contact-tracker';

export async function POST(request: NextRequest) {
  const data = await request.json();

  // ... Google Sheets save ...

  // Track in Vapi contact sheet
  try {
    const contactId = await onFormSubmit(
      {
        phone: data.phone,
        name: data.fullName,
        email: data.email,
        company: data.company,
        challenge: data.challenge,
      },
      'voice' // or 'sms'
    );
    console.log(`Tracking contact: ${contactId}`);
  } catch (err) {
    console.error('Failed to track contact:', err);
    // Don't block form submission on tracking error
  }

  return NextResponse.json({ success: true });
}
```

## Troubleshooting

**No contacts being dispatched?**
- Check `processContacts()` is running (Apps Script trigger installed, or Node.js interval active)
- Verify sheet has rows with status PENDING or FAILED
- Check Next Retry timestamp hasn't passed

**Calls not updating to SUCCESS?**
- Verify Vapi Call ID is being saved (column K)
- Check Vapi assistant is actually hanging up (not leaving calls pending)
- Enable polling logs: add `console.log()` in `pollInProgress()`

**Retries not triggering?**
- Verify `RETRY_DELAYS_MINUTES` config
- Check `Next Retry` column has valid ISO timestamps
- Look at Notes column for why it failed

**Authentication errors?**
- For Google Sheets: verify API key has Sheets API enabled
- For Vapi: verify API key is correct (not truncated)
- For Apps Script: run `installTriggers()` to set permissions

---

**Full Source:** `lib/vapi-contact-tracker.js`
**Ready to deploy!** Update CONFIG and deploy via Apps Script or your server.
