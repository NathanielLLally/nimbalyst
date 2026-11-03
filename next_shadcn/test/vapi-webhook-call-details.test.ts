import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sheets = vi.hoisted(() => {
  const mock = () => vi.fn<(...args: any[]) => Promise<any>>(async () => ({}));
  return {
    getTrackerData: mock(),
    createContactRow: mock(),
    updateContactRow: mock(),
    findContactRows: mock(),
    appendContactNote: mock(),
    ensureColumnCount: mock(),
  };
});

// Google Sheets is external; contact status updates are covered elsewhere
vi.mock('@/lib/googleSheetUtils', () => sheets);
vi.mock('@/lib/vapi-contact-tracker', () => ({ onVapiWebhook: vi.fn(async () => {}) }));

import { POST } from '../app/api/vapi-webhook/route';

// Trimmed end-of-call report, with keys in the order Vapi sends them
function endOfCallReport(extra: Record<string, unknown> = {}) {
  return {
    message: {
      timestamp: 1793693707289,
      type: 'end-of-call-report',
      analysis: { summary: 'Short summary', structuredData: { outcome: 'INTERESTED' } },
      artifact: { recordingUrl: 'https://private/rec', messages: [{ role: 'bot' }] },
      endedReason: 'customer-ended-call',
      costBreakdown: { llm: 0.01 },
      costs: [{ type: 'transcriber' }],
      durationSeconds: 75.668,
      summary: 'Anna offered meeting times.',
      transcript: 'User: Hello?\nAI: Hi.',
      messages: [{ role: 'system' }],
      recordingUrl: 'https://private/hipaa-recordings/call_1-mono',
      call: { id: 'call_1', type: 'outboundPhoneCall', orgId: 'org_1' },
      phoneNumber: { id: 'pn_1', number: '+15555550000' },
      customer: { number: '+15555550100' },
      assistant: { name: 'Anna', model: { provider: 'openai' } },
      assistantVersion: 'v8',
      ...extra,
    },
  };
}

const EXPECTED_HEADER = [
  'timestamp',
  'type',
  'analysis.summary',
  'analysis.structuredData.outcome',
  'endedReason',
  'durationSeconds',
  'summary',
  'transcript',
  'recordingUrl',
  'dashboardUrl',
  'call.id',
  'customer.number',
  'assistantVersion',
];

function webhookRequest(body: unknown) {
  return new Request('http://localhost/api/vapi-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

const detailsCalls = (fn: typeof sheets.createContactRow) =>
  fn.mock.calls.filter((c: any[]) => c.includes('Vapi Calls'));

// The data row appended to the call details sheet
function loggedRow(): any[] {
  return detailsCalls(sheets.createContactRow)[0]?.[1] ?? [];
}

// Header cells written to row 1, as { column index: header }
function headerCellsWritten(): Record<string, string> {
  const write = detailsCalls(sheets.updateContactRow).find((c: any[]) => c[1] === 1);
  return write?.[2] ?? {};
}

describe('vapi-webhook call details sheet: row 1 is always the report\'s JSON field names', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('VAPI_CALL_DETAILS_SHEET', 'Vapi Calls');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    sheets.findContactRows.mockResolvedValue([{ rowIndex: 2, row: ['contact_1', '+15555550100', 'Jane Lead'] }]);
    sheets.getTrackerData.mockResolvedValue([]);
  });

  afterEach(() => {
    Object.values(sheets).forEach((fn) => fn.mockClear());
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should_write_header_from_report_keys_into_empty_sheet', async () => {
    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(Object.values(headerCellsWritten())).toEqual(EXPECTED_HEADER);
  });

  it('should_skip_arrays_and_large_nested_objects', async () => {
    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    const header = Object.values(headerCellsWritten());
    expect(
      header.filter((h) => /^(artifact|costBreakdown|costs|messages|phoneNumber|assistant)\b|^call\.(?!id$)/.test(h))
    ).toEqual([]);
  });

  it('should_write_values_under_their_key_columns', async () => {
    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(loggedRow()).toEqual([
      1793693707289,
      'end-of-call-report',
      'Short summary',
      'INTERESTED',
      'customer-ended-call',
      75.668,
      'Anna offered meeting times.',
      'User: Hello?\nAI: Hi.',
      'https://private/hipaa-recordings/call_1-mono',
      'https://dashboard.vapi.ai/calls/call_1',
      'call_1',
      '+15555550100',
      'v8',
    ]);
  });

  it.each([
    ['a data row', ['01a1a09c-f6c4-7000-83a4', 'contact_1', '+16464507917', 'Nate Lally', 'FAILED']],
    ['an old-style header', ['Call ID', 'Contact ID', 'Phone', 'Name', 'Outcome']],
    ['the field names in another order', [...EXPECTED_HEADER].reverse()],
    ['the field names minus one', EXPECTED_HEADER.slice(0, -1)],
  ])('should_overwrite_row_one_when_it_holds_%s', async (_case, rowOne) => {
    // Given
    sheets.getTrackerData.mockResolvedValue([rowOne, ['data']]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(Object.values(headerCellsWritten())).toEqual(EXPECTED_HEADER);
  });

  it('should_clear_leftover_cells_when_old_row_one_is_longer', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([[...EXPECTED_HEADER, 'Notes', 'Logged At']]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(Object.values(headerCellsWritten())).toEqual([...EXPECTED_HEADER, '', '']);
  });

  it('should_not_write_row_one_when_it_matches_the_report_keys', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([EXPECTED_HEADER]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(headerCellsWritten()).toEqual({});
  });

  it('should_rewrite_header_and_row_for_a_report_with_a_new_key', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([EXPECTED_HEADER]);

    // When: Vapi starts sending a field the sheet hasn't seen
    await POST(webhookRequest(endOfCallReport({ cost: 0.0999 })));

    // Then
    const header = Object.values(headerCellsWritten());
    expect({ header, cost: loggedRow()[header.indexOf('cost')] }).toEqual({
      header: [...EXPECTED_HEADER, 'cost'],
      cost: 0.0999,
    });
  });

  it('should_write_full_width_rows_beyond_the_tracker_width', async () => {
    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then: the tracker pads rows to 14 columns; call details needs every column
    expect(detailsCalls(sheets.createContactRow)[0]?.[3]).toBe(EXPECTED_HEADER.length);
  });

  it('should_log_calls_with_no_matching_contact', async () => {
    // Given
    sheets.findContactRows.mockResolvedValue([]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(loggedRow()[EXPECTED_HEADER.indexOf('call.id')]).toBe('call_1');
  });

  it('should_widen_the_tab_before_writing_a_header_that_needs_more_columns', async () => {
    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then: widened to the header's width, before any header or row write
    const widen = sheets.ensureColumnCount.mock;
    const firstWrite = Math.min(
      ...[...sheets.updateContactRow.mock.invocationCallOrder, ...sheets.createContactRow.mock.invocationCallOrder]
    );
    expect({ args: widen.calls[0], beforeWrites: widen.invocationCallOrder[0] < firstWrite }).toEqual({
      args: ['sheet', 'Vapi Calls', EXPECTED_HEADER.length],
      beforeWrites: true,
    });
  });
});
