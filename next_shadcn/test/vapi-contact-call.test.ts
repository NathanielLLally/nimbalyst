import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getTrackerData } = vi.hoisted(() => ({ getTrackerData: vi.fn() }));

// Google Sheets is an external service; everything else runs for real
vi.mock('../lib/googleSheetUtils', () => ({
  getTrackerData,
  updateContactRow: vi.fn(async () => {}),
  appendContactNote: vi.fn(async () => {}),
}));

import {
  makeVapiCall,
  dispatchContactDirectly,
  dispatchContactById,
} from '../lib/vapi-contact-tracker';

// A: ID | B: Phone | C: Name | D: Email | E: Channel | F: Status | G: Attempt Count ...
function contactRow(email: string, notes = 'Challenge: Growth | Company: Acme') {
  const row: any[] = ['contact_1', '+15555550100', 'Jane Lead', email, 'voice', 'PENDING', 0];
  row[12] = notes; // M: Notes
  return row;
}

// After each dispatch appendContactNote adds a line to M: Notes
const NOTES_AFTER_FIRST_ATTEMPT =
  'Challenge: Growth | Company: Acme\n[2026-11-03T07:33:24] Dispatched to Vapi (call ID: call_1)';

function sentVariableValues(fetchMock: ReturnType<typeof vi.fn>) {
  const vapiCall = fetchMock.mock.calls.find(([url]) => url === 'https://api.vapi.ai/call');
  return JSON.parse(vapiCall![1].body).assistantOverrides.variableValues;
}

describe('Vapi call receives the email from the contact form', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'call_1' }), { status: 201 }));
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('VAPI_API_KEY', 'vapi-key');
    vi.stubEnv('VAPI_PHONE_NUMBER_ID', 'phone-id');
    vi.stubEnv('VAPI_ASSISTANT_ID', 'assistant-id');
    vi.stubEnv('VAPI_HMAC_PSK', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    getTrackerData.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_pass_email_as_variable_value_when_making_call', async () => {
    // When
    await makeVapiCall('+15555550100', 'Jane Lead', 'voice', 1, undefined, undefined, 'Acme', 'jane@acme.com');

    // Then
    expect(sentVariableValues(fetchMock).email).toBe('jane@acme.com');
  });

  it('should_send_form_email_when_dispatching_new_contact_immediately', async () => {
    // Given
    getTrackerData.mockResolvedValue([['header'], contactRow('jane@acme.com')]);

    // When
    await dispatchContactDirectly(contactRow('jane@acme.com') as any);

    // Then
    expect(sentVariableValues(fetchMock).email).toBe('jane@acme.com');
  });

  it('should_send_form_email_when_dispatching_queued_contact', async () => {
    // Given
    getTrackerData.mockResolvedValue([['header'], contactRow('jane@acme.com')]);

    // When
    await dispatchContactById('contact_1');

    // Then
    expect(sentVariableValues(fetchMock).email).toBe('jane@acme.com');
  });

  it('should_send_company_on_retry_after_notes_were_appended', async () => {
    // Given: a retry, so notes already have a dispatch line after the company
    getTrackerData.mockResolvedValue([['header'], contactRow('jane@acme.com', NOTES_AFTER_FIRST_ATTEMPT)]);

    // When
    await dispatchContactById('contact_1');

    // Then
    expect(sentVariableValues(fetchMock).company).toBe('Acme');
  });

  it('should_send_company_on_immediate_dispatch_with_appended_notes', async () => {
    // Given
    const row = contactRow('jane@acme.com', NOTES_AFTER_FIRST_ATTEMPT);
    getTrackerData.mockResolvedValue([['header'], row]);

    // When
    await dispatchContactDirectly(row as any);

    // Then
    expect(sentVariableValues(fetchMock).company).toBe('Acme');
  });
});
