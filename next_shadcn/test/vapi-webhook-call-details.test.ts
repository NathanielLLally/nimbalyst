import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sheets = vi.hoisted(() => {
  const mock = () => vi.fn<(...args: any[]) => Promise<any>>(async () => ({}));
  return {
    getTrackerData: mock(),
    createContactRow: mock(),
    updateContactRow: mock(),
    findContactRows: mock(),
    appendContactNote: mock(),
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

describe('vapi-webhook call details sheet takes its columns from Vapi report keys', () => {
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

  it('should_place_values_by_existing_header_order_without_rewriting_it', async () => {
    // Given: a header already in the sheet, in a different order
    const existing = [...EXPECTED_HEADER].reverse();
    sheets.getTrackerData.mockResolvedValue([existing]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect({
      headerWritten: Object.keys(headerCellsWritten()).length > 0,
      callIdCell: loggedRow()[existing.indexOf('call.id')],
      endedReasonCell: loggedRow()[existing.indexOf('endedReason')],
    }).toEqual({ headerWritten: false, callIdCell: 'call_1', endedReasonCell: 'customer-ended-call' });
  });

  it('should_append_new_keys_as_columns_at_the_end', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([EXPECTED_HEADER]);

    // When: Vapi starts sending a field the sheet hasn't seen
    await POST(webhookRequest(endOfCallReport({ cost: 0.0999 })));

    // Then
    const newColumn = EXPECTED_HEADER.length;
    expect({ header: headerCellsWritten(), value: loggedRow()[newColumn] }).toEqual({
      header: { [newColumn]: 'cost' },
      value: 0.0999,
    });
  });

  it('should_leave_cells_empty_for_keys_missing_from_this_report', async () => {
    // Given
    sheets.getTrackerData.mockResolvedValue([[...EXPECTED_HEADER, 'cost']]);

    // When
    await POST(webhookRequest(endOfCallReport()));

    // Then
    expect(loggedRow()[EXPECTED_HEADER.length]).toBe('');
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
});
