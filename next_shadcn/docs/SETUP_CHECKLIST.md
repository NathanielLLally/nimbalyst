# Vapi Contact Tracker: Setup Checklist

Complete this checklist to get the tracker running.

## 1. Environment Setup

- [ ] Copy `.env.example` to `.env`
  ```bash
  cp .env.example .env
  ```
- [ ] Add `.env` to `.gitignore` (never commit secrets)
  ```bash
  echo ".env" >> .gitignore
  ```

## 2. Google Sheets Configuration

- [ ] Create a Google Cloud project
  - [ ] Go to https://console.cloud.google.com
  - [ ] Create a new project
  
- [ ] Enable Google Sheets API
  - [ ] In Google Cloud Console, search for "Google Sheets API"
  - [ ] Click "Enable"
  
- [ ] Create API Key
  - [ ] Go to Credentials → Create Credentials → API Key
  - [ ] Copy the key (starts with `AIza`)
  - [ ] Add to `.env`: `GOOGLE_API_KEY=AIza...`

- [ ] Create Tracker Sheet
  - [ ] Go to https://docs.google.com/sheets
  - [ ] Create new sheet, name it "Vapi Contact Tracker"
  - [ ] Add headers in row 1:
    ```
    ID | Phone | Name | Channel | Status | Attempt Count |
    Submitted | Last Attempt | Next Retry | Resolved | Vapi Call ID | Notes
    ```
  - [ ] Copy Sheet ID from URL
  - [ ] Add to `.env`: `GOOGLE_SHEET_ID=abc123...`

## 3. Vapi Configuration

- [ ] Go to https://dashboard.vapi.ai

- [ ] Get API Key
  - [ ] Settings → API Keys
  - [ ] Copy your API key
  - [ ] Add to `.env`: `VAPI_API_KEY=vapi_...`

- [ ] Get Phone Number ID
  - [ ] Phone Numbers → Select your number
  - [ ] Copy the ID
  - [ ] Add to `.env`: `VAPI_PHONE_NUMBER_ID=phone_...`

- [ ] Create/Select Assistant
  - [ ] Assistants → Create new or select existing
  - [ ] **Add Variables:**
    - [ ] `customerName` (type: string)
    - [ ] `channel` (type: string)
  - [ ] Copy Assistant ID
  - [ ] Add to `.env`: `VAPI_ASSISTANT_ID=asst_...`

- [ ] (Optional) Setup Webhook
  - [ ] In Assistant → Webhooks
  - [ ] Event: `call.ended`
  - [ ] URL: `https://yoursite.com/api/vapi-track`

## 4. Project Setup

- [ ] Install dependencies (if not already done)
  ```bash
  npm install
  ```

- [ ] Verify TypeScript compilation
  ```bash
  npm run build
  ```
  - [ ] Should complete without errors

- [ ] Verify configuration loads
  ```bash
  node -e "
    require('dotenv').config();
    const tracker = require('./lib/vapi-contact-tracker');
    try {
      tracker.getConfig();
      console.log('✅ Config loaded successfully');
    } catch (e) {
      console.error('❌ Config error:', e.message);
    }
  "
  ```

## 5. Integration Points

- [ ] In `/api/contact/route.ts`, add tracker call:
  ```typescript
  import { trackContactInVapiSheet } from '@/lib/contact-tracking-integration';

  // After form save to leads sheet:
  const trackResult = await trackContactInVapiSheet({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    company: data.company,
    challenge: data.challenge,
  });
  ```

- [ ] In `/api/vapi-track/route.ts`, verify it imports tracker
  - [ ] `import { onFormSubmit, onVapiWebhook } from '@/lib/vapi-contact-tracker'`

## 6. Deployment

- [ ] Start the application
  ```bash
  npm run dev
  ```

- [ ] Test form submission
  - [ ] Go to your form (e.g., contact form)
  - [ ] Submit with valid phone number
  - [ ] Check `/api/vapi-track` endpoint was called (check console logs)

- [ ] Verify Tracker Sheet
  - [ ] Open your tracker sheet
  - [ ] New row should appear with:
    - [ ] Status: `PENDING`
    - [ ] Next Retry: current time
    - [ ] Notes: "Form submitted: ..."

- [ ] Wait for processing
  - [ ] After 1-2 minutes, check sheet again
  - [ ] Status should change to `IN_PROGRESS`
  - [ ] Vapi Call ID should be populated

- [ ] Wait for call completion
  - [ ] After call completes, status becomes `SUCCESS` or `FAILED`
  - [ ] Notes column shows timestamps of each state change

## 7. Troubleshooting

### Configuration Issues

- [ ] Missing env variables?
  - [ ] Check `.env` file exists in project root
  - [ ] Check `npm run build` output for errors
  - [ ] Try: `cat .env` to verify file contents

- [ ] "Missing required environment variables"?
  - [ ] Copy all required vars from `.env.example`
  - [ ] Make sure values are set (not empty)

- [ ] API key invalid?
  - [ ] Test Google Sheets API key: `curl -H "Authorization: Bearer YOUR_KEY" "https://www.googleapis.com/drive/v3/files?spaces=drive&pageSize=1"`
  - [ ] Test Vapi API key: `curl -H "Authorization: YOUR_KEY" "https://api.vapi.ai/call"`

### Contact Not Being Created

- [ ] Check form submission is calling `/api/vapi-track`
  - [ ] Add console.log in `/api/vapi-track/route.ts`
  - [ ] Submit form, check terminal for logs

- [ ] Check Google Sheets API permissions
  - [ ] Open your tracker sheet
  - [ ] Try adding a row manually
  - [ ] If you can't, API key may lack permissions

### Contact Created But Not Processing

- [ ] Check if tracker is running
  - [ ] For scheduled job: is `scripts/start-tracker.js` running?
  - [ ] For API endpoint: is server running?

- [ ] Check logs for errors
  - [ ] Look for console output with 📞, 📊, ❌ emoji prefixes
  - [ ] Google Cloud Logs: Cloud Logging if using serverless

- [ ] Check Next Retry column
  - [ ] If it's in the future, contact won't process yet
  - [ ] Try manually setting it to current time
  - [ ] Wait for next processing interval

### Call Not Being Initiated

- [ ] Verify Vapi credentials
  - [ ] Check Phone Number ID is correct (not truncated)
  - [ ] Check Assistant ID is correct
  - [ ] Verify assistant has variables: `customerName`, `channel`

- [ ] Check Vapi dashboard
  - [ ] Go to Calls → see if any calls appear
  - [ ] If not, check API key has correct permissions

## 8. Monitoring

- [ ] Set up log viewing
  - [ ] For local dev: watch console output
  - [ ] For production: set up Cloud Logging or your host's logging

- [ ] Check tracker sheet regularly
  - [ ] Sort by "Next Retry" to see what's pending
  - [ ] Filter by Status to find stuck contacts
  - [ ] Read Notes column for state transitions

- [ ] Metrics to monitor
  - [ ] Count PENDING contacts (work in progress)
  - [ ] Count SUCCESS contacts (working!)
  - [ ] Count RETRY_EXHAUSTED contacts (issues to debug)

## 9. Optional Enhancements

- [ ] Setup Vapi webhook for real-time updates
  - [ ] Remove polling (set POLL_INTERVAL_SECONDS=0)
  - [ ] Or keep both for redundancy

- [ ] Add email alerts for RETRY_EXHAUSTED
  - [ ] Trigger after status change to RETRY_EXHAUSTED
  - [ ] Email admin list

- [ ] Archive old records
  - [ ] Monthly, move SUCCESS/RETRY_EXHAUSTED to archive sheet
  - [ ] Keeps tracker sheet fast and queryable

- [ ] Add analytics
  - [ ] Dashboard showing success rate
  - [ ] Average time from submission to success
  - [ ] Peak call times

## 10. Documentation

- [ ] Read `TYPESCRIPT_MIGRATION.md` for architecture
- [ ] Read `VAPI_CONTACT_TRACKER.md` for full feature docs
- [ ] Read `REFACTOR_SUMMARY.md` for what changed

---

## Quick Verification Script

Run this to verify everything is set up:

```bash
#!/bin/bash

echo "=== Vapi Contact Tracker Setup Verification ==="
echo ""

# Check .env exists
if [ -f .env ]; then
  echo "✅ .env file exists"
else
  echo "❌ .env file missing"
  exit 1
fi

# Check required vars
for var in GOOGLE_SHEET_ID GOOGLE_API_KEY VAPI_API_KEY VAPI_PHONE_NUMBER_ID VAPI_ASSISTANT_ID; do
  if grep -q "^$var=" .env; then
    echo "✅ $var is set"
  else
    echo "❌ $var is missing"
  fi
done

# Check TypeScript files exist
if [ -f "lib/vapi-contact-tracker.ts" ]; then
  echo "✅ vapi-contact-tracker.ts exists"
else
  echo "❌ vapi-contact-tracker.ts missing"
fi

if [ -f "lib/googleSheetUtils.ts" ]; then
  echo "✅ googleSheetUtils.ts exists"
else
  echo "❌ googleSheetUtils.ts missing"
fi

# Try to compile
echo ""
echo "Checking TypeScript compilation..."
npm run build > /tmp/tsbuild.log 2>&1
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compiles successfully"
else
  echo "❌ TypeScript compilation failed"
  echo "Log:"
  cat /tmp/tsbuild.log
fi

echo ""
echo "=== Verification Complete ==="
```

Save as `verify-setup.sh`, then run: `bash verify-setup.sh`

---

**You're ready!** Submit the form and watch your tracker sheet come to life. 🚀
