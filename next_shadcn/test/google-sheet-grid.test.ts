import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn<(...args: any[]) => Promise<any>>(),
  batchUpdate: vi.fn<(...args: any[]) => Promise<any>>(async () => ({ data: {} })),
}));

// The Google Sheets API is external
vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: class {} },
    sheets: () => ({ spreadsheets: { get: api.get, batchUpdate: api.batchUpdate } }),
  },
}));

import { ensureColumnCount } from '../lib/googleSheetUtils';

function tab(columnCount: number) {
  api.get.mockResolvedValue({
    data: {
      sheets: [
        { properties: { sheetId: 7, title: 'other', gridProperties: { columnCount: 26 } } },
        { properties: { sheetId: 42, title: 'vapi_webhook', gridProperties: { columnCount } } },
      ],
    },
  });
}

const requests = () => api.batchUpdate.mock.calls.map((c: any[]) => c[0].requestBody.requests);

describe('sheet grid helpers', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
  });

  afterEach(() => {
    api.get.mockReset();
    api.batchUpdate.mockClear();
    vi.unstubAllEnvs();
  });

  it('should_append_only_the_missing_columns_to_the_named_tab', async () => {
    // Given
    tab(26);

    // When
    await ensureColumnCount('sheet', 'vapi_webhook', 33);

    // Then
    expect(requests()).toEqual([[{ appendDimension: { sheetId: 42, dimension: 'COLUMNS', length: 7 } }]]);
  });

  it('should_not_change_the_tab_when_it_is_wide_enough', async () => {
    // Given
    tab(26);

    // When
    await ensureColumnCount('sheet', 'vapi_webhook', 26);

    // Then
    expect(api.batchUpdate).not.toHaveBeenCalled();
  });

  it('should_fail_clearly_when_the_tab_does_not_exist', async () => {
    // Given
    tab(26);

    // When / Then
    await expect(ensureColumnCount('sheet', 'missing', 30)).rejects.toThrow('Sheet tab not found: missing');
  });
});
