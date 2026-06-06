# Vapi Contact Tracker Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Happy Tails Contact Form                    │
│                    (MultiStepContactForm.tsx)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/contact (existing)                       │
│              - Save to Google Sheets (leads)                     │
│              - Verify reCAPTCHA                                  │
│              - Make initial Vapi call                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   /api/vapi-track (new)                          │
│             - Track contact in tracker sheet                     │
│             - Handle Vapi webhooks                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      ▼             ▼
         ┌──────────────────┐  ┌─────────────────┐
         │  Google Sheets   │  │   Vapi API      │
         │  (tracker sheet) │  │  (calls/status) │
         └──────────────────┘  └─────────────────┘
                      │             │
                      └──────┬──────┘
                             ▼
         ┌────────────────────────────────────┐
         │   Vapi Contact Tracker Logic       │
         │  (vapi-contact-tracker.js)         │
         │                                    │
         │  - Manages state machine           │
         │  - Schedules retries               │
         │  - Polls Vapi for updates          │
         │  - Handles webhooks                │
         └────────────────────────────────────┘
```

## Data Flow

### 1. Form Submission → Tracking Record Created

**User submits form** (in `/MultiStepContactForm`)

**Form data sent to `/api/contact`:**
```json
{
  "fullName": "Sarah",
  "email": "sarah@example.com",
  "phone": "+14155551234",
  "company": "Fluffy Cuts Grooming",
  "website": "https://fluffycuts.com",
  "businessType": "grooming",
  "challenge": "Getting more leads",
  "message": "We want to grow...",
  "receiveMessages": true,
  "recaptchaToken": "..."
}
```

**In `/api/contact`:**
1. ✅ Verify reCAPTCHA
2. ✅ Save to `leads` sheet (existing)
3. ✅ Make initial Vapi call (existing)
4. **NEW:** Call `/api/vapi-track` to create tracking record

**In `/api/vapi-track`:**
- Creates row in `tracker` sheet
- Status: `PENDING`
- Scheduled for immediate dispatch
- Response includes `contactId` for optional UI polling

### 2. Periodic Processing → Call Dispatched → Status Tracked

**Every 1 minute (Apps Script) or 30 seconds (Node.js):**

`processContacts()` runs:

**For each PENDING contact:**
```
1. Check if "Next Retry" time has arrived
2. Call Vapi API → get call ID
3. Update row: Status = IN_PROGRESS, store call ID
4. Log: "Dispatched to Vapi"
```

**For each IN_PROGRESS contact:**
```
1. Query Vapi for call status
2. If completed:
   - Mark SUCCESS, set Resolved time
   - Log transcript/duration
3. If failed:
   - Mark FAILED, schedule next retry
   - Log failure reason
4. If still in progress:
   - Keep polling
```

### 3. Vapi Completes Call → Status Updated

**Two options:**

**Option A: Polling (default)**
- Tracker polls Vapi every 1-2 minutes
- Updates sheet when complete
- Pros: Works everywhere, simple
- Cons: ~1 min latency

**Option B: Webhook (faster)**
- Vapi POSTs to `/api/vapi-track` when call ends
- Tracker updates immediately
- Pros: Real-time, accurate
- Cons: Requires public URL, webhook setup

## File Structure

```
hello-nimbalyst/
├── lib/
│   ├── vapi-contact-tracker.js        ← Core tracker logic
│   └── contact-tracking-integration.js ← Client-side helpers
│
├── app/api/
│   ├── contact/route.ts               ← Existing (leads + initial call)
│   └── vapi-track/route.ts            ← New (tracking + webhooks)
│
└── docs/
    ├── VAPI_CONTACT_TRACKER.md        ← Full deployment guide
    └── TRACKER_ARCHITECTURE.md        ← This file
```

## Sheet Structure

### Two Google Sheets:

**1. Leads Sheet** (existing, `/api/contact`)
```
Timestamp | Name | Email | Phone | Company | Website | 
Business Type | Challenge | Message | Consent | ...
```

**2. Tracker Sheet** (new, `/api/vapi-track`)
```
ID | Phone | Name | Channel | Status | Attempts | 
Submitted | Last Attempt | Next Retry | Resolved | Call ID | Notes
```

Keeps concerns separate:
- **Leads sheet** = form responses (human-readable, CRM export)
- **Tracker sheet** = call state machine (operational, for retries/analysis)

## State Machine

```
                PENDING
                  │
         ┌────────▼────────┐
         │ Time to retry?  │
         └────────┬────────┘
                  │ Yes
                  ▼
            DISPATCHING
                  │
         ┌────────▼────────┐
         │ Vapi call made? │
         └────┬──────┬─────┘
         No  │      │ Yes
            ▼      ▼
          FAILED  IN_PROGRESS
            │         │
            │    ┌────▼────┐
            │    │ polling │
            │    └────┬────┘
            │         │
        ┌───┴─┬───────┤
        │     │       │
      RETRY FAILED SUCCESS
        │             │
        └─┬──────────┬┘
   more?  │          │
        ┌─┴─┐        ▼
      Y │   │ N  RESOLVED
        └─▼─┘
       RETRY_
      EXHAUST
        ED
        (end)
```

## Retry Logic Example

Contact fails immediately:
```
T+0min    → Attempt 1, fails → Retry in 5 min
T+5min    → Attempt 2, fails → Retry in 15 min
T+20min   → Attempt 3, fails → Retry in 60 min
T+80min   → Attempt 4, succeeds (or exhausted)
```

Config:
```javascript
RETRY_DELAYS_MINUTES: [0, 5, 15, 60]  // delay before each retry
MAX_ATTEMPTS: 4                        // total attempts
```

## Integration Checklist

- [ ] Deploy tracker code (Apps Script or Node.js)
- [ ] Create tracker Google Sheet
- [ ] Update tracker CONFIG with credentials
- [ ] (Apps Script only) Run `installTriggers()`
- [ ] Import `trackContactInVapiSheet()` in `/api/contact`
- [ ] Call tracker endpoint after form save
- [ ] Set `VAPI_TRACKER_URL` env var (if using proxy)
- [ ] (Optional) Set up Vapi webhook for real-time updates
- [ ] (Optional) Add status polling UI component
- [ ] Test end-to-end with a form submission

## Monitoring & Debugging

**View tracker sheet directly:**
- Sort by Status to find stuck contacts
- Check Notes column for state transitions
- Look at Next Retry to see retry schedule

**Monitor logs:**
```
// Apps Script: View → Logs
// Node.js: console output

✅ Contact created: contact_xxx
📞 Dispatching contact_xxx
❌ Dispatch failed: ...
📊 Status: IN_PROGRESS
⏱️ FAILED, retry in 5 min
✅ SUCCESS
```

**Metrics to track:**
- Total submissions → SUCCESS rate
- Average attempts per contact
- Time from submission to success
- Retry exhaustion rate

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Contacts stuck PENDING | Tracker not running | Verify cron/trigger is active |
| No Vapi calls made | Config missing API key | Check CONFIG at top of tracker.js |
| Calls not updating | Call ID not saved | Verify Vapi response includes ID |
| Wrong retry timing | RETRY_DELAYS_MINUTES off | Adjust config, set Next Retry manually |
| Sheet bloated | Never cleaning up | Archive old SUCCESS contacts monthly |

## Future Enhancements

- **SMS fallback:** If voice fails N times, try SMS
- **ML-based retry:** Learn best retry times per time zone
- **CRM sync:** Sync SUCCESS contacts to HubSpot/Salesforce
- **Analytics:** Dashboard showing success rates, peak call times
- **A/B testing:** Different scripts/offers per contact cohort
- **Escalation:** Route repeated failures to human follow-up queue

---

**Ready to deploy!** See `VAPI_CONTACT_TRACKER.md` for full setup steps.
