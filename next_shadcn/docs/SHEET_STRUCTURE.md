# Contact Tracking Sheet Structure

## Google Sheets: `contact_tracking`

The contact tracking sheet stores all contact information and interaction history across 13 columns:

| Column | Index | Field | Type | Description |
|--------|-------|-------|------|-------------|
| A | 0 | ID | String | Unique contact identifier (contact_TIMESTAMP_RANDOM) |
| B | 1 | Phone | String | Contact phone number (E.164 format: +1XXXXXXXXXX) |
| C | 2 | Name | String | Contact full name |
| D | 3 | Email | String | Contact email address |
| E | 4 | Channel | String | Communication channel (voice/sms) |
| F | 5 | Status | String | Current status (PENDING, IN_PROGRESS, SUCCESS, FAILED, RETRY_EXHAUSTED) |
| G | 6 | Attempt Count | Number | Number of contact attempts made |
| H | 7 | Submitted | DateTime | ISO 8601 timestamp of form submission |
| I | 8 | Last Attempt | DateTime | ISO 8601 timestamp of last contact attempt |
| J | 9 | Next Retry | DateTime | ISO 8601 timestamp scheduled for next retry |
| K | 10 | Resolved | DateTime | ISO 8601 timestamp when contact was resolved |
| L | 11 | Vapi Call ID | String | Vapi API call identifier for voice calls |
| M | 12 | Notes | String | Free-form notes including challenge, company, errors |

## Header Row

The first row is a header with human-readable column names:
```
ID | Phone | Name | Email | Channel | Status | Attempt Count | Submitted | Last Attempt | Next Retry | Resolved | Vapi Call ID | Notes
```

## Status Enum

- **PENDING**: Form submitted, awaiting initial contact attempt
- **IN_PROGRESS**: Contact attempt in progress (call/SMS being sent)
- **SUCCESS**: Contact successfully reached (call completed or SMS delivered)
- **FAILED**: Contact attempt failed, scheduled for retry
- **RETRY_EXHAUSTED**: Max retry attempts reached, no further attempts

## Email Field

The **Email** field (Column D) is used for:
- Storing the contact's email address from form submission
- Triggering automated email sends during the sequential flow
- Enabling email-based follow-ups and confirmations

## Notes Field

The Notes field (Column M) includes:
- Contact challenge/problem statement
- Company name
- Error messages from failed attempts
- Sequential flow results (SMS success, email status, booking info)
- Any manual notes added during tracking

Example:
```
Challenge: Need help with scheduling | Company: Acme Corp
Email sent ✅ | SMS sent ❌ | Booking failed (No availability)
```

## Data Types

| Type | Format | Example |
|------|--------|---------|
| String | Text | "contact_1718207840000_abc123" |
| DateTime | ISO 8601 | "2024-06-12T15:30:45.123Z" |
| Number | Integer | 3 |

## Sample Data Row

```
contact_1718207840000_abc123 | +16464507917 | Anna Claude | anna@happytailspawcare.com | voice | IN_PROGRESS | 1 | 2024-06-12T15:30:45.123Z | 2024-06-12T15:31:00.000Z | 2024-06-12T15:35:00.000Z |  | vapi_call_abc123xyz | Challenge: Scheduling | Company: Happy Tails
```

## Querying the Sheet

### Get All Contacts
```typescript
const rows = await SheetUtils.getTrackerData(GOOGLE_SHEET_ID, 'contact_tracking');
```

### Find Contact by ID
```typescript
const matches = await SheetUtils.findContactRows(GOOGLE_SHEET_ID, 0, contactId, 'contact_tracking');
```

### Find Contact by Email
```typescript
const matches = await SheetUtils.findContactRows(GOOGLE_SHEET_ID, 3, email, 'contact_tracking');
```

### Find Contact by Phone
```typescript
const matches = await SheetUtils.findContactRows(GOOGLE_SHEET_ID, 1, phone, 'contact_tracking');
```

### Find by Status
```typescript
const matches = await SheetUtils.findContactRows(GOOGLE_SHEET_ID, 5, 'PENDING', 'contact_tracking');
```

## Integration with Sequential Flow

The email field enables the complete contact sequence:

1. **Form Submission** → Email stored in column D
2. **Phone Call** → Status updated (Column F)
3. **SMS** → Channel and attempt count tracked
4. **Email** → Uses column D email to send follow-ups
5. **Booking** → Calendar integration via email coordination
6. **Retries** → Next retry scheduled in column J

## Maintenance

### Archiving Old Contacts
Create an "archive" sheet and move contacts older than 90 days with RETRY_EXHAUSTED status.

### Data Cleanup
- Remove test contacts before production deployment
- Validate phone numbers are in E.164 format
- Ensure all emails match contact verification records

## Related Configuration

See `lib/vapi-contact-tracker.ts` for:
- Column index constants
- Status transition logic
- Retry delay configuration
- Sheet name and ID configuration
