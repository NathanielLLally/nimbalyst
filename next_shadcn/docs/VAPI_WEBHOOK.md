# Vapi Webhook Handler

Real-time end-of-call reporting via webhook instead of polling.

## Overview

The `/api/vapi-webhook` endpoint receives call completion reports from Vapi and immediately updates the contact tracker sheet with call results.

**Benefits vs Polling:**
- ✅ **Real-time** — Updates as soon as call ends (no delay)
- ✅ **Efficient** — No constant polling (saves API calls)
- ✅ **Reliable** — Vapi guarantees delivery
- ✅ **Rich Data** — Full call transcript, summary, recording URL

## Setup

### 1. Configure Vapi Webhook

In Vapi Dashboard:

1. Go to **Assistant** → **Webhooks**
2. Click **Add Webhook**
3. Set these fields:
   - **Event**: `call.ended`
   - **URL**: `https://yoursite.com/api/vapi-webhook`
   - **Active**: Toggle ON
4. Save

### 2. Update .env (Optional)

```env
# Optional: Log call details to a separate sheet
VAPI_CALL_DETAILS_SHEET=Call Details

# Optional: Webhook signature verification
VAPI_WEBHOOK_SECRET=your_webhook_secret_from_vapi
```

### 3. Verify Webhook

Test the endpoint:

```bash
curl https://yoursite.com/api/vapi-webhook
# Should return: { "status": "ok", "message": "..." }
```

## Call Report Structure

Vapi sends call data in this format:

```json
{
  "id": "call_abc123",
  "callId": "call_abc123",
  "status": "completed",
  "endedReason": "assistant_ended",
  "startedAt": "2024-06-06T10:00:00Z",
  "endedAt": "2024-06-06T10:01:30Z",
  "duration": 90,
  "transcript": "Customer: Hello... Assistant: Hi there...",
  "summary": "Customer called about pricing. Offered three plans.",
  "recordingUrl": "https://vapi.ai/recordings/...",
  "customerPhoneNumber": "+14155551234",
  "assistantId": "asst_...",
  "variables": {
    "customerName": "John",
    "channel": "voice"
  }
}
```

## What Happens on Webhook

1. **Receive** — Webhook POST arrives from Vapi
2. **Find Contact** — Search tracker sheet for matching call ID
3. **Extract Metrics** — Parse transcript, duration, outcome
4. **Update Row** — Set status to SUCCESS/FAILED and resolved time
5. **Log Details** — Add call transcript, summary, recording URL to notes
6. **Optional** — Log to separate "Call Details" sheet for analytics

## Status Determination

**SUCCESS** if:
- `status === 'completed'`
- AND (`endedReason === 'customer_ended'` OR `endedReason === 'assistant_ended'`)

**FAILED** if:
- `status === 'failed'`
- OR call ended for other reasons (voicemail reached, customer didn't answer, etc.)
- Failed calls will be **retried** per retry logic

**Never Retried** if explicitly marked RETRY_EXHAUSTED

## Example Webhook Request

When a call ends, Vapi POSTs to your endpoint:

```bash
POST https://yoursite.com/api/vapi-webhook
Content-Type: application/json
X-Vapi-Signature: <signature>

{
  "id": "call_abc123",
  "callId": "call_abc123",
  "status": "completed",
  "endedReason": "assistant_ended",
  "duration": 90,
  "transcript": "...",
  "summary": "Customer inquiry about services",
  "recordingUrl": "https://...",
  ...
}
```

Your endpoint responds:

```json
{
  "success": true
}
```

Tracker sheet is updated:
- Status → SUCCESS
- Resolved → current timestamp
- Notes → Call summary, recording URL, transcript snippet

## Tracker Sheet Update

When webhook processes a successful call:

| Column | Updates to |
|--------|-----------|
| E (Status) | SUCCESS or FAILED |
| J (Resolved) | Current timestamp |
| L (Notes) | Appends: duration, transcript, summary, recording URL |

Example notes after webhook:
```
[2024-06-06 10:01] ✅ SUCCESS
Duration: 90s
Summary: Customer inquired about pricing. Offered three plans.
Recording: https://vapi.ai/recordings/call_abc123
Started: 2024-06-06T10:00:00Z
Ended: 2024-06-06T10:01:30Z
```

## Data Privacy

The webhook handler sanitizes sensitive data:

- **Phone numbers** → Replaced with `[PHONE]`
- **Email addresses** → Replaced with `[EMAIL]`
- **Transcripts** — Limited to 500 characters
- **Summaries** — Limited to 200 characters

## Error Handling

**If contact not found:**
```
⚠️ No contact found for call ID: call_xyz789
```
— Webhook continues, no error. Useful for test calls.

**If sheet update fails:**
```
❌ Failed to update contact: HTTP 401: Unauthorized
```
— Returns 500 error. Vapi will retry webhook delivery.

**If signature verification fails:**
```
❌ Invalid Vapi webhook signature
```
— Returns 401. Configure `VAPI_WEBHOOK_SECRET` if you enabled signature verification.

## Webhook Retry Logic

If your endpoint returns non-2xx:

- Vapi retries up to 5 times
- Exponential backoff (5s, 10s, 30s, 60s, 300s)
- After 5 failures, webhook marked failed in Vapi dashboard

Best practices:
- ✅ Return 200 quickly (under 5 seconds)
- ✅ Do async work after responding if needed
- ✅ Log all errors for debugging

## Testing the Webhook

### Manual Test

1. Send a test webhook:
```bash
curl -X POST https://yoursite.com/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test_call_123",
    "status": "completed",
    "endedReason": "assistant_ended",
    "duration": 60,
    "transcript": "Test conversation",
    "summary": "Test call summary"
  }'
```

2. Check tracker sheet for new/updated row

### Real Test

1. Make a real Vapi call via the form
2. Let it complete (assistant ends call)
3. Within seconds, check tracker sheet
4. Status should be SUCCESS
5. Notes should show call details

## Monitoring

### Success Indicators

- ✅ Webhook endpoint responds with 200
- ✅ Contact row updates within 2 seconds
- ✅ Notes column shows call summary
- ✅ Vapi dashboard shows webhook success (green checkmark)

### Debugging

**Check logs:**
```
📨 Vapi Webhook: call_abc123 | Status: completed
🔄 Updating contact contact_xyz with call results
✅ Contact contact_xyz updated with call results
```

**View Vapi webhook status:**
- Vapi Dashboard → Assistant → Webhooks
- Shows last delivery status, response, timestamp

**Check tracker sheet:**
- Look for updated "Resolved" timestamp
- Read Notes column for call details

## Configuration Examples

### Basic Setup (Recommended)

```env
# Required
GOOGLE_SHEET_ID=abc123
GOOGLE_API_KEY=AIza...
VAPI_API_KEY=vapi_...
VAPI_PHONE_NUMBER_ID=phone_...
VAPI_ASSISTANT_ID=asst_...
```

### With Call Details Sheet

```env
# ... all above ...

# Optional: Track all calls in separate sheet
VAPI_CALL_DETAILS_SHEET=Call Details

# Schema for Call Details sheet:
# Call ID | Contact ID | Phone | Name | Outcome | Duration | 
# End Reason | Transcript | Summary | Recording | Logged At
```

### With Signature Verification

```env
# ... all above ...

# Optional: Verify webhook signatures
VAPI_WEBHOOK_SECRET=whsec_...
```

## Webhook vs Polling

### Polling (Current)
- ✅ Works everywhere
- ❌ 1-minute latency
- ❌ Constant API calls
- ❌ Higher costs

### Webhook (New)
- ✅ Real-time (instant)
- ✅ No polling overhead
- ✅ Lower API costs
- ❌ Requires public URL
- ⚠️ Can be missed if server down

**Recommendation:** Use both.
- Webhook for real-time updates
- Polling as fallback if webhook missed

## Webhook Payload Reference

Complete call report payload:

```typescript
interface VapiCallReport {
  id: string;                    // Unique ID
  callId: string;                // Call ID (matches what's in tracker)
  status: 'completed' | 'failed';
  endedReason?: 
    | 'customer_ended'           // Customer hung up
    | 'assistant_ended'          // Assistant ended call
    | 'voicemail_reached'        // Hit voicemail
    | 'max_duration_reached'     // Time limit hit
    | 'assistant_error'          // Assistant crashed
    | 'inbound_call_received'    // Other call interrupted
    | 'customer_did_not_answer'  // No answer
    | 'phone_number_not_found'   // Invalid number
    | 'unknown';
  error?: string;                // Error message if failed
  startedAt?: string;            // ISO timestamp
  endedAt?: string;              // ISO timestamp
  duration?: number;             // Seconds
  transcript?: string;           // Full conversation
  recordingUrl?: string;         // Audio recording
  summary?: string;              // AI-generated summary
  customerPhoneNumber?: string;  // Number that called/was called
  assistantId?: string;          // Assistant used
  variables?: Record<string, any>; // Context variables passed
  messages?: Array<{             // Message history
    role: 'assistant' | 'customer';
    message: string;
    time?: number;
  }>;
  costBreakdown?: {
    minutes: number;
    baseCost: number;
  };
}
```

## Troubleshooting

**Webhook not updating tracker?**
- [ ] Verify webhook is enabled in Vapi dashboard
- [ ] Check endpoint health: `curl https://yoursite.com/api/vapi-webhook`
- [ ] Check logs for errors
- [ ] Ensure call ID matches (check tracker sheet)

**Getting 500 errors in Vapi dashboard?**
- [ ] Check .env variables are set correctly
- [ ] Check Google Sheets API permissions
- [ ] Verify tracker sheet exists and is accessible
- [ ] Check application logs for detailed error

**Updates are slow?**
- [ ] Check internet connection
- [ ] Verify Google Sheets API is responsive
- [ ] Check if other processes are hammering the sheet

**Webhook never fires?**
- [ ] Confirm URL is correct and public
- [ ] Check firewall allows Vapi IPs (ask Vapi support)
- [ ] Test with manual curl to verify endpoint works
- [ ] Check Vapi webhook logs in dashboard

---

**Next:** Set up webhook in Vapi dashboard and make a test call!
