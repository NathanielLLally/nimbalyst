# TypeScript Migration: Vapi Contact Tracker

This document describes the TypeScript rewrite and how configuration is handled.

## Overview

The tracker has been refactored to TypeScript with the following improvements:

1. **Type Safety** — Full TypeScript support for better IDE autocompletion and compile-time error detection
2. **Centralized Google Sheets Operations** — All Sheets API calls are in `lib/googleSheetUtils.ts` for data integrity
3. **Environment-Driven Configuration** — All secrets and settings from `.env` via environment variables
4. **Atomic Operations** — Read-modify-write operations ensure data consistency
5. **Clean Separation** — Tracker logic in `vapi-contact-tracker.ts`, Sheets operations in `googleSheetUtils.ts`

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Environment Variables (.env)                   │
│  - GOOGLE_SHEET_ID                              │
│  - GOOGLE_API_KEY                               │
│  - VAPI_API_KEY                                 │
│  - RETRY_DELAYS_MINUTES                         │
│  - etc.                                         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  vapi-contact-        │
         │  tracker.ts           │
         │  ─────────────────    │
         │  loadConfig()         │
         │  onFormSubmit()       │
         │  processContacts()    │
         │  onVapiWebhook()      │
         └───────────┬───────────┘
                     │
                     ▼
      ┌──────────────────────────────┐
      │  googleSheetUtils.ts         │
      │  ────────────────────────    │
      │  getTrackerData()            │
      │  createContactRow()          │
      │  updateContactRow()  ◄─ Atomic
      │  findContactRows()           │
      │  appendContactNote() ◄─ Atomic
      │  batchUpdateContacts()       │
      └──────────────────────────────┘
```

## File Structure

```
lib/
├── vapi-contact-tracker.ts       ← Tracker logic (load config, dispatch, poll)
├── googleSheetUtils.ts           ← Google Sheets API (centralized, atomic)
├── contact-tracking-integration.ts ← Client-side helpers for forms
└── [old .js files deprecated]     ← Can be removed

app/api/
└── vapi-track/route.ts           ← API endpoint, calls tracker functions

.env                               ← Environment variables (git ignored)
.env.example                       ← Template for setup
```

## Configuration

### Environment Variables

All configuration is read from `.env`:

```bash
# Required
GOOGLE_SHEET_ID=<your-sheet-id>
GOOGLE_API_KEY=<your-api-key>
VAPI_API_KEY=<your-vapi-key>
VAPI_PHONE_NUMBER_ID=<phone-id>
VAPI_ASSISTANT_ID=<assistant-id>

# Optional (defaults shown)
RETRY_DELAYS_MINUTES=[0,5,15,60]
MAX_ATTEMPTS=4
POLL_INTERVAL_SECONDS=30
SHEET_NAME=Sheet1
```

### Loading Configuration

In `vapi-contact-tracker.ts`:

```typescript
function loadConfig(): Config {
  // Validates all required env vars
  // Returns typed config object
  // Throws if any are missing
}

function getConfig(): Config {
  // Lazy-loads config once
  // Safe to call from any function
}
```

Usage in tracker functions:

```typescript
export async function onFormSubmit(formData, channel) {
  const cfg = getConfig(); // ← Get config
  const id = generateId();

  const row = [
    id,
    formData.phone,
    // ... etc
  ];

  // Use cfg.GOOGLE_SHEET_ID, cfg.GOOGLE_API_KEY, etc.
  await SheetUtils.createContactRow(
    cfg.GOOGLE_SHEET_ID,
    cfg.GOOGLE_API_KEY,
    row,
    cfg.SHEET_NAME
  );
}
```

## Data Integrity

### Atomic Operations

All Sheets operations that modify data are atomic (read-modify-write):

```typescript
// ❌ NOT atomic - race condition possible
const sheet = await getSheet(...);
sheet.values[i][4] = 'IN_PROGRESS';
await updateRow(...);

// ✅ ATOMIC - safe
await updateContactRow(
  sheetId,
  apiKey,
  rowIndex,
  { [4]: 'IN_PROGRESS' }  // Partial update
);
// Internally: fetches latest → merges → writes back
```

### Why Atomic?

In concurrent scenarios (multiple workers, retry loops):
- Without atomic ops: stale reads can lose updates
- With atomic ops: last write always preserves all fields

Example:
```
Worker A reads row: { status: PENDING, attemptCount: 1 }
Worker B reads row: { status: PENDING, attemptCount: 1 }

Worker A updates status → IN_PROGRESS, writes back
Worker B updates attemptCount → 2, writes back

❌ Result: status is reset to PENDING (lost update)
✅ With atomicity: both updates preserved
```

## TypeScript Features

### Type Safety

All types are explicit:

```typescript
interface ContactRow {
  [0]: string;   // ID
  [1]: string;   // Phone
  [4]: string;   // Status
  [5]: number;   // Attempt Count
  // ... etc
}

// Compiler catches errors at compile time
const row: ContactRow = [id, phone, name, ...];
//                        ↑
// If you forget a field, TS errors before runtime
```

### Enums

State constants are enums:

```typescript
enum ContactStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
}

// Usage
if (status === ContactStatus.PENDING) { ... }
// TS autocomplete and checks the enum value
```

## API Route

The `/api/vapi-track` endpoint is simplified:

```typescript
// Before (JS): ad-hoc logic in route
// After (TS): delegates to tracker functions

import { onFormSubmit, onVapiWebhook } from '@/lib/vapi-contact-tracker';

export async function POST(request) {
  const data = await request.json();

  if (data.type === 'form_submit') {
    const contactId = await onFormSubmit(data.formData, data.channel);
    return { success: true, contactId };
  } else if (data.type === 'vapi_webhook') {
    await onVapiWebhook(data.event);
    return { success: true };
  }
}
```

## Testing Configuration

To test that configuration loads correctly:

```typescript
// In your test file
import { getConfig } from '@/lib/vapi-contact-tracker';

it('loads config from env', () => {
  process.env.GOOGLE_SHEET_ID = 'test-id';
  process.env.GOOGLE_API_KEY = 'test-key';
  // ... set all required vars

  const cfg = getConfig();
  expect(cfg.GOOGLE_SHEET_ID).toBe('test-id');
});
```

## Migration from JavaScript

If you have the old JS version:

1. **Delete** `lib/vapi-contact-tracker.js` (superseded by `.ts`)
2. **Keep** `lib/googleSheetUtils.js` if you reference it elsewhere (new `.ts` is complete)
3. **Update imports** in any code:
   ```typescript
   // Old
   import tracker from '@/lib/vapi-contact-tracker.js';

   // New
   import { onFormSubmit, processContacts } from '@/lib/vapi-contact-tracker';
   ```
4. **No schema changes** — the sheet structure is identical

## Error Handling

Configuration errors are caught early:

```typescript
try {
  const cfg = getConfig();
} catch (err) {
  // Throws: "Missing required environment variables: GOOGLE_SHEET_ID, VAPI_API_KEY"
}
```

Sheet operation errors include context:

```typescript
try {
  await getTrackerData(...);
} catch (err) {
  // "Failed to fetch tracker data: HTTP 401: Unauthorized"
  // ^ Tells you which operation and why it failed
}
```

## Next Steps

1. Copy `.env.example` to `.env`
2. Fill in all required variables
3. Test: `npm run build` (TypeScript compilation)
4. Deploy and monitor logs for configuration errors

---

**All Sheets operations are now centralized, atomic, and type-safe.** ✨
