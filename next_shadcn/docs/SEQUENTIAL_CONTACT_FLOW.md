# Sequential Contact Flow

This document describes the multi-channel contact sequence that engages prospects through phone calls, SMS, email, and automated booking.

## Flow Sequence

```
Form Submission
    ↓
[1] 📞 Phone Call (Initial)
    ├─ Vapi voice call attempt
    └─ Retry delays: 2min, 5min, 15min, 60min
    ↓
[2] 💬 SMS (Followup - 30 min later)
    ├─ Confirmation message sent via Twilio
    └─ Includes "following up" messaging
    ↓
[3] 📧 Email (Informational - 1 hour after SMS)
    ├─ Personalized email sent via Resend/SendGrid
    ├─ Includes company context & challenge summary
    └─ Call-to-action to reply or call back
    ↓
[4] 🔄 Phone Retry Calls (24+ hours later)
    ├─ Retry attempts with increasing delays
    ├─ Delays: 24h, 48h, 5 days
    └─ Up to 3 additional retry calls
```

## Stage Details

### Stage 1: Phone Call (Initial)
- **Trigger**: Form submission
- **Channel**: Voice call via Vapi
- **Timing**: Immediate
- **Retry**: 4 total attempts with exponential backoff
- **Success Condition**: Call completed (customer_ended or assistant_ended)

### Stage 2: SMS (Followup)
- **Trigger**: After Stage 1 (30 minutes)
- **Channel**: SMS via Twilio
- **Message**: "Hi [Name]! Following up on our earlier message. We'd love to help..."
- **Timing**: 30 minutes after first phone attempt
- **Success Condition**: SMS delivered to Twilio

### Stage 3: Email (Informational)
- **Trigger**: After Stage 2 (60 minutes)
- **Channel**: Email via Resend or SendGrid
- **Content**: 
  - Personalized greeting
  - Reference to company and challenge
  - Invitation to respond
- **Timing**: 1 hour after SMS
- **Success Condition**: Email accepted by mail service

### Stage 4: Phone Retry Calls
- **Trigger**: After Stage 3 (24+ hours)
- **Channel**: Voice call via Vapi
- **Timing**: Retry delays of 24h, 48h, 5 days
- **Message Variation**: Different voicemail for each attempt
- **Success Condition**: Call completed successfully

## Configuration

### Environment Variables

```bash
# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email Configuration (SMTPS with SASL authentication)
# Uses TLS/SSL encryption for secure email delivery
# Port 465 = Implicit TLS | Port 587 = STARTTLS
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=vmail
SMTP_PASSWORD=q1w2E#r4
FROM_EMAIL=noreply@happytailspawcare.com
FROM_NAME=Happy Tails Paw Care

# Calendar / Booking
CAL_API_KEY=your_cal_api_key
CAL_EVENT_TYPE_ID=your_event_type_id

# Vapi Phone Calls
VAPI_API_KEY=your_vapi_key
VAPI_PHONE_NUMBER_ID=your_phone_id
VAPI_ASSISTANT_ID=your_assistant_id

# Google Sheets (contact tracking)
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your_private_key
```

## API Endpoints

### POST /api/contact-track
Handles form submissions and triggers the sequential flow.

**Request Body**:
```json
{
  "type": "form_submit",
  "formData": {
    "phone": "+16464507917",
    "fullName": "Anna Claude",
    "email": "anna@example.com",
    "company": "Acme Corp",
    "challenge": "Need help with scheduling",
    "timezone": "America/New_York"
  },
  "channel": "voice"
}
```

**Response**:
```json
{
  "success": true,
  "contactId": "contact_1718207840000_abc123",
  "sequentialFlow": {
    "smsSuccess": true,
    "emailSuccess": true,
    "bookingSuccess": false,
    "smsMessageId": "SM1234567890",
    "emailMessageId": "em_1234567890",
    "errors": {
      "booking": "No availability found"
    }
  }
}
```

## Libraries Used

- **Phone Calls**: Vapi (Voice API)
- **SMS**: Twilio
- **Email**: Local SMTP server with SASL authentication (nodemailer or native SMTP)
- **Booking**: Cal.com
- **Contact Tracking**: Google Sheets
- **Sheet Operations**: googleapis

### Email Server Details

The system sends emails via local SMTPS server (SMTP over TLS/SSL) with the following configuration:
- **Host**: localhost (default) or configured SMTP_HOST
- **Port**: 587 (STARTTLS) or 465 (Implicit TLS)
- **Protocol**: SMTPS (SMTP with TLS/SSL encryption)
- **Authentication**: SASL with user credentials
- **User**: vmail
- **Password**: q1w2E#r4

The email sender supports three fallback methods:
1. HTTP endpoint on SMTP server (if available)
2. nodemailer library with SMTPS support (if installed)
3. Native SMTPS protocol via TLS socket connection

## Implementation Files

- `lib/contact-sequence-manager.ts` - Flow orchestration logic
- `lib/contact-email-sender.ts` - Email sending integration
- `lib/contact-sms-booking.ts` - SMS + booking integration
- `lib/vapi-contact-tracker.ts` - Contact tracking & phone call dispatch
- `app/api/contact-track/route.ts` - Form submission endpoint
- `test/test-contact-sms-booking.js` - Integration tests

## Testing

Run the integration tests:
```bash
node test/test-contact-sms-booking.js
```

This will:
1. Run 21 unit tests validating data formats and flow logic
2. Send actual SMS to the test phone number
3. Send actual email to the test email address
4. Attempt to book a meeting if availability exists
5. Track all interactions in Google Sheets

## Error Handling

Each stage is independent:
- SMS failure doesn't block email
- Email failure doesn't block booking
- Booking failure doesn't prevent contact creation
- All errors are logged and tracked in Google Sheets notes

## Future Enhancements

- [ ] SMS delivery status tracking
- [ ] Email open/click tracking
- [ ] Dynamic stage delays based on engagement signals
- [ ] Multi-language support
- [ ] Custom message templates per customer
- [ ] A/B testing different sequences
- [ ] Integration with CRM system
