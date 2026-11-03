import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sheets = vi.hoisted(() => {
  const mock = () => vi.fn<(...args: any[]) => Promise<any>>(async () => ({}));
  return {
    getTrackerData: mock(),
    createContactRow: mock(),
    updateContactRow: mock(),
    appendContactNote: mock(),
    findContactRows: mock(),
  };
});

// Google Sheets and Vapi are external; the tracker logic runs for real
vi.mock('../lib/googleSheetUtils', () => sheets);

import { onFormSubmit, dispatchContactById, onVapiWebhook, processContacts } from '../lib/vapi-contact-tracker';

// A: ID | B: Phone | C: Name | D: Email | E: Channel | F: Status | G: Attempt Count ... L: Vapi Call ID
function contactRow(status: string, attemptCount: string | number) {
  const row: any[] = ['contact_1', '+15555550100', 'Jane Lead', 'jane@acme.com', 'voice', status, attemptCount];
  row[11] = 'vapi_call_1';
  row[12] = 'Challenge: Growth | Company: Acme';
  return row;
}

// Values written to G: Attempt Count, and statuses written to F
function written() {
  const updates = sheets.updateContactRow.mock.calls.map((c: any[]) => c[2]);
  return {
    attemptCounts: updates.map((u: any) => u[6]).filter((v: any) => v !== undefined),
    statuses: updates.map((u: any) => u[5]).filter(Boolean),
  };
}

describe('Attempt Count is written as "X of Y" (Y = MAX_ATTEMPTS, default 4)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'vapi_call_2' }), { status: 201 }));
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('VAPI_API_KEY', 'vapi-key');
    vi.stubEnv('VAPI_PHONE_NUMBER_ID', 'phone-id');
    vi.stubEnv('VAPI_ASSISTANT_ID', 'assistant-id');
    vi.stubEnv('VAPI_HMAC_PSK', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    Object.values(sheets).forEach((fn) => fn.mockReset());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_create_new_contact_with_zero_of_max', async () => {
    // When
    await onFormSubmit({
      phone: '+15555550100',
      fullName: 'Jane Lead',
      email: 'jane@acme.com',
      company: 'Acme',
      challenge: 'Growth',
    });

    // Then
    expect(sheets.createContactRow.mock.calls[0][1][6]).toBe('0 of 4');
  });

  it.each([
    ['"X of Y" text', '1 of 4', '2 of 4'],
    ['a plain number from before this change', 2, '3 of 4'],
  ])('should_write_next_attempt_as_x_of_y_when_current_value_is_%s', async (_case, current, expected) => {
    // Given
    sheets.getTrackerData.mockResolvedValue([['header'], contactRow('FAILED', current)]);

    // When
    await dispatchContactById('contact_1');

    // Then
    expect(written().attemptCounts).toEqual([expected]);
  });

  it('should_exhaust_retries_when_attempt_count_reads_max_of_max', async () => {
    // Given
    sheets.findContactRows.mockResolvedValue([{ rowIndex: 2, row: contactRow('IN_PROGRESS', '4 of 4') }]);

    // When
    await onVapiWebhook({ callId: 'vapi_call_1', status: 'ended', endedReason: 'voicemail' });

    // Then
    expect(written().statuses).toEqual(['RETRY_EXHAUSTED']);
  });

  it('should_not_dispatch_again_when_attempt_count_reads_max_of_max', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([['header'], contactRow('FAILED', '4 of 4')]);

    // When
    await processContacts();

    // Then
    expect(fetchMock.mock.calls.some(([url]) => url === 'https://api.vapi.ai/call')).toBe(false);
  });
});
