# Vapi Contact Tracker - Quick Start

Get the tracker running in 15 minutes.

## Prerequisites

- Node.js 16+ with TypeScript support
- Environment variables configured (see `.env.example`)
- Google Sheets API enabled with an API key
- Vapi account with phone numbers and assistants configured

## Step 1: Create the Tracker Sheet (2 min)

1. Go to https://docs.google.com/sheets
2. Create new sheet, name it "Vapi Contact Tracker"
3. Add these column headers in row 1:
   ```
   A: ID
   B: Phone
   C: Name
   D: Channel
   E: Status
   F: Attempt Count
   G: Submitted
   H: Last Attempt
   I: Next Retry
   J: Resolved
   K: Vapi Call ID
   L: Notes
   ```
4. Copy the Sheet ID from URL: `docs.google.com/spreadsheets/d/{SHEET_ID}/`

## Step 2: Get Vapi Credentials (3 min)

1. Go to https://dashboard.vapi.ai
2. Settings → API Keys → copy your API key
3. Phone Numbers → select your phone → copy Phone Number ID
4. Assistants → select your assistant → copy Assistant ID

## Step 3: Deploy Tracker (10 min)

### Option A: Google Apps Script (Easiest)

1. Go to https://script.google.com
2. Create new project
3. Paste the entire code from `lib/vapi-contact-tracker.js`
4. Update the CONFIG at the top:
   ```javascript
   const CONFIG = {
     GOOGLE_SHEET_ID: 'paste-your-sheet-id',
     GOOGLE_API_KEY: 'paste-your-api-key',
     VAPI_API_KEY: 'paste-your-vapi-key',
     VAPI_PHONE_NUMBER_ID: 'paste-your-phone-id',
     VAPI_ASSISTANT_ID: 'paste-your-assistant-id',
     // ... rest stays same
   };
   ```
5. Save
6. Click "Run" next to `installTriggers` function
   - Grant permissions when prompted
   - You should see "Trigger installed" in logs
7. Deploy → New Deployment → Type: Web App
   - Execute as: Your account
   - Who has access: Anyone
8. Copy the deployment URL (you'll use this for webhooks)

### Option B: Node.js Server

1. Add to `package.json`:
   ```json
   "dependencies": {
     "node-fetch": "^2.7.0",
     "dotenv": "^16.0.0"
   }
   ```
2. Create `.env.local`:
   ```
   GOOGLE_SHEET_ID=your-sheet-id
   GOOGLE_API_KEY=your-api-key
   VAPI_API_KEY=your-vapi-key
   VAPI_PHONE_NUMBER_ID=your-phone-id
   VAPI_ASSISTANT_ID=your-assistant-id
   ```
3. Create `scripts/start-tracker.js`:
   ```javascript
   require('dotenv').config();
   const tracker = require('../lib/vapi-contact-tracker');
   
   // Update config from env
   Object.assign(tracker.CONFIG, {
     GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
     GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
     VAPI_API_KEY: process.env.VAPI_API_KEY,
     VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID,
     VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID,
   });

   // Run every 30 seconds
   setInterval(() => {
     tracker.processContacts().catch(console.error);
   }, 30000);
   
   console.log('✅ Tracker running...');
   ```
4. Run: `node scripts/start-tracker.js`

## Step 4: Connect Your Form (3 min)

### In `/app/api/contact/route.ts`:

Add this after your existing Google Sheets save:

```typescript
import { trackContactInVapiSheet } from '@/lib/contact-tracking-integration';

// ... inside your POST handler, after Google Sheets save ...

try {
  const trackResult = await trackContactInVapiSheet({
    phone: data.phone,
    fullName: data.fullName,
    email: data.email,
    company: data.company,
    challenge: data.challenge,
  });
  
  if (trackResult.success) {
    console.log('✅ Contact tracked:', trackResult.contactId);
  } else {
    console.error('⚠️ Tracking failed:', trackResult.error);
    // Don't fail form on tracking error
  }
} catch (err) {
  console.error('Tracking error:', err);
}
```

## Step 5: Test It (No wait, you're done!)

1. **Submit the form** with a valid phone number
2. **Check the tracker sheet** — you should see a new row with:
   - Status: `PENDING`
   - Next Retry: now or very soon
3. **Wait 1-2 minutes** — tracker should run and update status to `IN_PROGRESS`
4. **Wait for Vapi** — after call completes, status becomes `SUCCESS` or `FAILED`
5. **Check the Notes column** — should have detailed state transitions

## Full Example Walk-Through

**T+0:** User submits form
```
Row created:
ID: contact_123
Phone: +14155551234
Status: PENDING
Next Retry: 2024-06-06T10:00:00Z
Notes: Form submitted: sarah@example.com
```

**T+1min:** Tracker runs, sees PENDING
```
Dispatches to Vapi
Status: IN_PROGRESS
Vapi Call ID: call_abc123
Notes: Dispatched to Vapi (call ID: call_abc123)
```

**T+2min:** Tracker polls Vapi
```
Call still in progress, keep polling...
```

**T+3min:** Tracker polls again
```
Call completed successfully
Status: SUCCESS
Resolved: 2024-06-06T10:03:00Z
Notes: ✅ SUCCESS at 2024-06-06T10:03:00 | Duration: 45s
```

## Common Errors & Fixes

**"Cannot find GOOGLE_SHEET_ID"**
- Make sure you pasted the actual Sheet ID (long string)
- Not the full URL, just the ID part

**"Authorization failed"**
- For Apps Script: Click "Run" on `installTriggers` to grant permissions
- For Node.js: Check .env.local has all 5 keys

**"Vapi API error"**
- Verify API key hasn't been revoked
- Check Phone Number ID and Assistant ID are correct (not truncated)

**"No contacts being processed"**
- In Apps Script: View → Logs to see if `processContacts` is running
- Check trigger: Project Settings → Triggers (should show "processContacts" every 1 minute)
- Make sure sheet has PENDING rows

**Form submits but row not created**
- Verify your `/api/contact` actually calls `trackContactInVapiSheet()`
- Check console for errors
- Try hitting the tracker endpoint manually with cURL

## Optional: Enable Vapi Webhooks (Real-Time Updates)

Instead of polling every 1 minute, get instant updates when calls complete:

1. In your tracker deployment, note the Web App URL
2. Go to Vapi dashboard → Assistant → Webhooks
3. Add webhook:
   - URL: `{YOUR_APPS_SCRIPT_URL}`
   - Event: `call.ended`
4. Test: Make a call, should update immediately

## Debugging Tips

**Check logs:**
- **Apps Script:** View → Logs (real-time)
- **Node.js:** terminal output

**Common log markers:**
- ✅ = Success
- ❌ = Error
- 📞 = Dispatch
- 📊 = Poll
- ⏱️ = Retry

**Manual test in Apps Script:**
```javascript
// In editor, run manually:
processContacts()

// Or test individual functions:
getSheet()          // Should return sheet data
makeVapiCall("+14155551234", "John Doe", "voice")  // Should return call ID
```

## Next Steps

1. **Monitor your first calls** through the tracker sheet
2. **Tweak retry delays** if needed in CONFIG
3. **Add status polling UI** to show customers "Your call is queued..."
4. **Archive old records** monthly (move SUCCESS/EXHAUSTED to "archive" sheet)
5. **Set up alerts** (e.g., email if contacts hit RETRY_EXHAUSTED)

## Files Reference

| File | Purpose |
|------|---------|
| `lib/vapi-contact-tracker.js` | Core tracker logic |
| `lib/contact-tracking-integration.js` | Client-side helpers |
| `app/api/vapi-track/route.ts` | API endpoint |
| `docs/VAPI_CONTACT_TRACKER.md` | Full docs |
| `docs/TRACKER_ARCHITECTURE.md` | System overview |

---

**That's it! You now have end-to-end contact tracking with automatic retries.** 🎉

Questions? Check `VAPI_CONTACT_TRACKER.md` for detailed docs.
