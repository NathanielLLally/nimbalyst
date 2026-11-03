import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/vapi-tools/route';

function toolCallRequest(
  name: string,
  parameters: Record<string, unknown>,
  authorization: string | null = 'Bearer test-secret'
) {
  return new Request('http://localhost/api/vapi-tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({ message: { toolCall: { name, parameters } } }),
  }) as any;
}

function calResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/vapi-tools check_availability', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_return_slot_times_when_cal_returns_slots_grouped_by_date', async () => {
    // Given: Cal.com v2 /slots groups available slots by date
    fetchMock.mockResolvedValueOnce(
      calResponse({
        status: 'success',
        data: {
          '2026-11-04': [
            { start: '2026-11-04T09:00:00.000-05:00' },
            { start: '2026-11-04T10:00:00.000-05:00' },
          ],
          '2026-11-05': [{ start: '2026-11-05T09:00:00.000-05:00' }],
        },
      })
    );

    // When
    const res = await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));
    const body = await res.json();

    // Then: the agent gets real availability back, not a "none found" fallback
    expect(body.result).toBe(
      '2026-11-04T09:00:00.000-05:00, 2026-11-04T10:00:00.000-05:00, 2026-11-05T09:00:00.000-05:00'
    );
  });

  it('should_report_no_availability_when_cal_returns_no_slots', async () => {
    // Given
    fetchMock.mockResolvedValueOnce(calResponse({ status: 'success', data: {} }));

    // When
    const res = await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));
    const body = await res.json();

    // Then
    expect(body.result).toBe('No availability found');
  });

  it('should_reject_request_without_calling_cal_when_timezone_missing', async () => {
    // When
    const res = await POST(toolCallRequest('check_availability', {}));

    // Then
    expect({ status: res.status, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 400,
      calCalls: 0,
    });
  });

  it('should_query_v2_slots_endpoint_for_configured_event_type', async () => {
    // Given
    fetchMock.mockResolvedValueOnce(calResponse({ status: 'success', data: {} }));

    // When
    await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));

    // Then
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect({
      endpoint: `${url.origin}${url.pathname}`,
      eventTypeId: url.searchParams.get('eventTypeId'),
      timeZone: url.searchParams.get('timeZone'),
      hasStartAndEnd: !!url.searchParams.get('start') && !!url.searchParams.get('end'),
      apiKeyInUrl: url.searchParams.has('apiKey'),
    }).toEqual({
      endpoint: 'https://api.cal.com/v2/slots',
      eventTypeId: '123',
      timeZone: 'America/New_York',
      hasStartAndEnd: true,
      apiKeyInUrl: false,
    });
  });

  it('should_authenticate_with_bearer_token_and_slots_api_version', async () => {
    // Given
    fetchMock.mockResolvedValueOnce(calResponse({ status: 'success', data: {} }));

    // When
    await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));

    // Then
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer test-key',
      'cal-api-version': '2024-09-04',
    });
  });
});

describe('POST /api/vapi-tools book_meeting', () => {
  const fetchMock = vi.fn();
  const bookingParams = {
    name: 'Jane Lead',
    email: 'jane@example.com',
    datetime: '2026-11-04T17:00:00.000Z',
    timezone: 'America/New_York',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
    fetchMock.mockResolvedValue(
      calResponse({
        status: 'success',
        data: { uid: 'abc', start: '2026-11-04T17:00:00.000Z', status: 'accepted' },
      })
    );
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_send_v2_booking_body_with_attendee', async () => {
    // When
    await POST(toolCallRequest('book_meeting', bookingParams));

    // Then
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      eventTypeId: 123,
      start: '2026-11-04T17:00:00.000Z',
      attendee: {
        name: 'Jane Lead',
        email: 'jane@example.com',
        timeZone: 'America/New_York',
        language: 'en',
      },
      metadata: {},
    });
  });

  it('should_authenticate_with_bearer_token_and_bookings_api_version', async () => {
    // When
    await POST(toolCallRequest('book_meeting', bookingParams));

    // Then
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
      'cal-api-version': '2024-08-13',
    });
  });

  it('should_reject_request_without_calling_cal_when_email_missing', async () => {
    // Given: Cal.com rejects undeliverable emails, so a placeholder can never book
    const { email: _email, ...withoutEmail } = bookingParams;

    // When
    const res = await POST(toolCallRequest('book_meeting', withoutEmail));

    // Then
    expect({ status: res.status, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 400,
      calCalls: 0,
    });
  });

  it('should_confirm_booked_start_time_from_v2_response', async () => {
    // When
    const res = await POST(toolCallRequest('book_meeting', bookingParams));
    const body = await res.json();

    // Then
    expect(body.result).toBe('Booked for 2026-11-04T17:00:00.000Z');
  });
});

describe('POST /api/vapi-tools Cal.com authentication', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
    // Every Cal.com call gets a response shaped well enough for any tool to finish
    fetchMock.mockImplementation(async () =>
      calResponse({
        status: 'success',
        data: [{ uid: 'abc', start: '2026-11-04T17:00:00.000Z' }],
      })
    );
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ['check_availability', { timezone: 'America/New_York' }],
    [
      'book_meeting',
      {
        name: 'Jane Lead',
        email: 'jane@example.com',
        datetime: '2026-11-04T17:00:00.000Z',
        timezone: 'America/New_York',
      },
    ],
    ['cancel_booking', { email: 'jane@example.com' }],
  ])('should_send_same_bearer_token_on_every_cal_call_for_%s', async (tool, parameters) => {
    // When
    await POST(toolCallRequest(tool, parameters));

    // Then
    const authHeaders = fetchMock.mock.calls.map(([, init]) => init?.headers?.Authorization);
    expect(authHeaders.length > 0 && authHeaders.every((h) => h === 'Bearer test-key')).toBe(true);
  });

  it('should_send_bookings_api_version_on_every_cancel_booking_call', async () => {
    // When
    await POST(toolCallRequest('cancel_booking', { email: 'jane@example.com' }));

    // Then
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers?.['cal-api-version'])).toEqual([
      '2024-08-13',
      '2024-08-13',
    ]);
  });
});

describe('POST /api/vapi-tools Vapi authentication', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ['missing', null],
    ['wrong', 'Bearer not-the-secret'],
    ['not a bearer token', 'test-secret'],
  ])('should_reject_without_calling_cal_when_authorization_is_%s', async (_case, authorization) => {
    // When
    const res = await POST(
      toolCallRequest('check_availability', { timezone: 'America/New_York' }, authorization)
    );

    // Then
    expect({ status: res.status, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 401,
      calCalls: 0,
    });
  });

  it('should_reject_all_requests_when_secret_is_not_configured', async () => {
    // Given: fail closed so a missing env var never exposes booking unauthenticated
    vi.stubEnv('VAPI_WEBHOOK_SECRET', '');

    // When
    const res = await POST(
      toolCallRequest('check_availability', { timezone: 'America/New_York' }, 'Bearer ')
    );

    // Then
    expect({ status: res.status, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 401,
      calCalls: 0,
    });
  });
});
