# Vapi Webhook: 5-Minute Setup

Get real-time call completion updates instead of polling.

## 1. Enable Webhook in Vapi Dashboard

1. Go to https://dashboard.vapi.ai
2. Select your **Assistant**
3. Go to **Webhooks**
4. Click **Add Webhook**
5. Fill in:
   - **Event**: `call.ended`
   - **URL**: `https://yourdomain.com/api/vapi-webhook`
   - **Active**: Toggle ON
6. Save

**That's it!** Vapi will POST to your endpoint when calls complete.

## 2. Verify Your Endpoint

Test that your endpoint is reachable:

```bash
curl https://yourdomain.com/api/vapi-webhook

# Should return:
# {
#   "status": "ok",
#   "message": "Vapi webhook endpoint is running",
#   "timestamp": "2024-06-06T..."
# }
```

## 3. Make a Test Call

1. Submit your contact form
2. Complete the call (both sides can hang up)
3. Check your tracker sheet **immediately**
4. Status should change to SUCCESS within 2 seconds
5. Notes should show transcript snippet and recording URL

## 4. Optional: Log Call Details

Create a "Call Details" sheet to log every call:

1. Create new Google Sheet named "Call Details"
2. Add headers:
   ```
   Call ID | Contact ID | Phone | Name | Outcome | Duration | 
   End Reason | Transcript | Summary | Recording | Logged At
   ```
3. Add to `.env`:
   ```
   VAPI_CALL_DETAILS_SHEET=Call Details
   ```

Now each call is logged with full details for analytics.

## What You Get

When a call ends, your tracker sheet instantly updates:

**Immediate (< 2 seconds):**
- ✅ Status → SUCCESS or FAILED
- ✅ Resolved → timestamp when call ended
- ✅ Notes → transcript, summary, recording URL

**Example notes after webhook:**
```
✅ SUCCESS
Duration: 45s
Summary: Customer asked about pricing. Offered demo.
Recording: https://vapi.ai/recordings/call_abc123
Started: 2024-06-06T10:00:00Z
Ended: 2024-06-06T10:00:45Z
```

## Webhook vs Polling

| Feature | Polling | Webhook |
|---------|---------|---------|
| Latency | 1 minute | Instant |
| API Calls | Constant | Only on call end |
| Cost | Higher | Lower |
| Setup | Built-in | 1 minute |
| Reliability | Eventual | Guaranteed |

**Recommendation:** Start with webhook. Keep polling as fallback if needed.

## Troubleshooting

**Webhook not firing?**
```bash
# 1. Check endpoint is accessible
curl https://yourdomain.com/api/vapi-webhook
# Should return 200 OK

# 2. Check Vapi dashboard
# Assistant → Webhooks → should show last delivery status

# 3. Check logs
# Look for: "📨 Vapi Webhook:" messages
```

**Tracker not updating?**
```
1. Verify call ID matches (check your logs)
2. Check Google Sheets API credentials
3. Check tracker sheet exists and is accessible
4. Look for error logs: "❌ Failed to update contact"
```

**Getting errors in Vapi dashboard?**
1. Check application logs for details
2. Verify Google Sheets API key is valid
3. Verify sheet ID is correct
4. Make sure tracker sheet has proper headers

## Architecture

```
Vapi Call Ends
      ↓
POST /api/vapi-webhook
      ↓
Find Contact by Call ID
      ↓
Extract: transcript, duration, summary, recording URL
      ↓
Update Tracker Sheet
  - Status → SUCCESS/FAILED
  - Resolved → now
  - Notes → call details
      ↓
Optional: Log to Call Details sheet
      ↓
Return { success: true }
```

## Performance

- **Response time:** < 1 second (returns immediately)
- **Sheet update latency:** < 2 seconds
- **API calls per call:** 2-3 (find + update + log notes)

## Data Stored

For each call, the tracker stores:

| Data | Where | Example |
|------|-------|---------|
| Call duration | Notes | "Duration: 45s" |
| Transcript | Notes | First 100 chars... |
| Summary | Notes | "Customer asked about pricing..." |
| Recording URL | Notes | "https://vapi.ai/recordings/..." |
| Outcome | Status column | SUCCESS/FAILED |
| Timestamp | Resolved column | 2024-06-06T10:00:45Z |

## Webhook Payload

When Vapi calls your endpoint, it sends:

```json
{
  "callId": "call_abc123",
  "status": "completed",
  "endedReason": "assistant_ended",
  "duration": 45,
  "transcript": "Customer: Hi... Assistant: Hello...",
  "summary": "Customer asked about pricing",
  "recordingUrl": "https://vapi.ai/recordings/...",
  "startedAt": "2024-06-06T10:00:00Z",
  "endedAt": "2024-06-06T10:00:45Z"
}
```

Your endpoint processes this and updates the sheet.

## Common Workflows

### Workflow 1: Successful Call
```
1. Call ends (customer or assistant hangs up)
2. Vapi POSTs to your webhook
3. Contact status → SUCCESS
4. No retry scheduled
5. Contact resolved
```

### Workflow 2: Failed Call (Will Retry)
```
1. Call fails (no answer, network error, etc.)
2. Vapi POSTs to your webhook
3. Contact status → FAILED
4. Next retry scheduled per RETRY_DELAYS_MINUTES
5. Background job retries at scheduled time
```

### Workflow 3: Analytics
```
1. Every call logged to Call Details sheet
2. View dashboard: call volume, duration, outcomes
3. Identify patterns: best call times, success rates
4. Optimize: retry timing, script changes
```

## Next Steps

1. ✅ Enable webhook in Vapi dashboard
2. ✅ Test endpoint: `curl https://yourdomain.com/api/vapi-webhook`
3. ✅ Make test call and verify sheet updates
4. ✅ (Optional) Set up Call Details sheet for analytics
5. ✅ (Optional) Disable polling: `POLL_INTERVAL_SECONDS=0`

---

**Done!** Your tracker now gets real-time updates. 🚀

For detailed docs, see `VAPI_WEBHOOK.md`.
