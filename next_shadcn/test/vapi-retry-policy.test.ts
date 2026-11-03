import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sheets = vi.hoisted(() => ({
  getTrackerData: vi.fn(),
  updateContactRow: vi.fn(async () => {}),
  appendContactNote: vi.fn(async () => {}),
  findContactRows: vi.fn(),
}));

// Google Sheets and Vapi are external services; the retry logic runs for real
vi.mock('../lib/googleSheetUtils', () => sheets);

import { onVapiWebhook, processContacts } from '../lib/vapi-contact-tracker';

const RETRYABLE = ['voicemail', 'silence-timed-out', 'customer-did-not-answer'];

// A: ID | B: Phone | C: Name | D: Email | E: Channel | F: Status | G: Attempt Count ... L: Vapi Call ID
function inProgressRow(attemptCount = 1) {
  const row: any[] = ['contact_1', '+15555550100', 'Jane Lead', 'jane@acme.com', 'voice', 'IN_PROGRESS', attemptCount];
  row[11] = 'vapi_call_1';
  row[12] = 'Challenge: Growth | Company: Acme';
  return row;
}

// Every status the tracker wrote to F: Status, and whether J: Next Retry was set
function writes() {
  const updates = sheets.updateContactRow.mock.calls.map((c: any[]) => c[2]);
  return {
    statuses: updates.map((u: any) => u[5]).filter(Boolean),
    retryScheduled: updates.some((u: any) => !!u[9]),
  };
}

describe('contact tracker retries only voicemail, silence-timed-out and customer-did-not-answer', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('VAPI_API_KEY', 'vapi-key');
    vi.stubEnv('VAPI_PHONE_NUMBER_ID', 'phone-id');
    vi.stubEnv('VAPI_ASSISTANT_ID', 'assistant-id');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    sheets.findContactRows.mockResolvedValue([{ rowIndex: 2, row: inProgressRow() }]);
  });

  afterEach(() => {
    fetchMock.mockReset();
    Object.values(sheets).forEach((fn) => fn.mockClear());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('end-of-call webhook', () => {
    it.each(RETRYABLE)('should_schedule_retry_when_call_ended_with_%s', async (endedReason) => {
      // When
      await onVapiWebhook({ callId: 'vapi_call_1', status: 'ended', endedReason });

      // Then
      expect(writes()).toEqual({ statuses: ['FAILED'], retryScheduled: true });
    });

    it.each([
      ['customer-ended-call', 'SUCCESS'],
      ['assistant-ended-call', 'SUCCESS'],
      ['assistant-said-end-call-phrase', 'SUCCESS'],
      ['exceeded-max-duration', 'ENDED'],
      ['twilio-failed-to-connect-call', 'ENDED'],
    ])('should_not_retry_when_call_ended_with_%s', async (endedReason, finalStatus) => {
      // When
      await onVapiWebhook({ callId: 'vapi_call_1', status: 'ended', endedReason });

      // Then
      expect(writes()).toEqual({ statuses: [finalStatus], retryScheduled: false });
    });

    it('should_not_retry_failed_call_without_end_reason', async () => {
      // When
      await onVapiWebhook({ callId: 'vapi_call_1', status: 'failed', error: 'boom' });

      // Then
      expect(writes()).toEqual({ statuses: ['ENDED'], retryScheduled: false });
    });

    it('should_exhaust_instead_of_retry_when_retryable_call_hits_max_attempts', async () => {
      // Given: MAX_ATTEMPTS defaults to 4
      sheets.findContactRows.mockResolvedValue([{ rowIndex: 2, row: inProgressRow(4) }]);

      // When
      await onVapiWebhook({ callId: 'vapi_call_1', status: 'ended', endedReason: 'voicemail' });

      // Then
      expect(writes()).toEqual({ statuses: ['RETRY_EXHAUSTED'], retryScheduled: false });
    });
  });

  describe('polling an in-progress call', () => {
    function vapiCallStatus(body: unknown) {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
      sheets.getTrackerData.mockResolvedValue([['header'], inProgressRow()]);
    }

    it.each(RETRYABLE)('should_schedule_retry_when_polled_call_ended_with_%s', async (endedReason) => {
      // Given: Vapi reports finished calls as status "ended"
      vapiCallStatus({ status: 'ended', endedReason });

      // When
      await processContacts();

      // Then
      expect(writes()).toEqual({ statuses: ['FAILED'], retryScheduled: true });
    });

    it('should_mark_success_without_retry_when_polled_call_ended_by_customer', async () => {
      // Given
      vapiCallStatus({ status: 'ended', endedReason: 'customer-ended-call' });

      // When
      await processContacts();

      // Then
      expect(writes()).toEqual({ statuses: ['SUCCESS'], retryScheduled: false });
    });

    it('should_leave_call_in_progress_while_vapi_call_is_still_running', async () => {
      // Given
      vapiCallStatus({ status: 'in-progress' });

      // When
      await processContacts();

      // Then
      expect(writes()).toEqual({ statuses: [], retryScheduled: false });
    });
  });
});
