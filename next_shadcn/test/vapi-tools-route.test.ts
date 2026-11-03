import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, OPTIONS } from '../app/api/vapi-tools/route';

function vapiRequest(body: unknown, authorization: string | null = 'Bearer test-secret') {
  return new Request('http://localhost/api/vapi-tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  }) as any;
}

// Vapi's tool-calls server message (https://docs.vapi.ai/server-url/events)
function toolCallRequest(
  name: string,
  parameters: Record<string, unknown>,
  authorization: string | null = 'Bearer test-secret'
) {
  const id = 'toolcall_1';
  return vapiRequest(
    {
      message: {
        type: 'tool-calls',
        call: { id: 'call_1' },
        toolCallList: [{ id, name, parameters }],
        toolWithToolCallList: [{ name, toolCall: { id, parameters } }],
      },
    },
    authorization
  );
}

async function firstResult(res: Response) {
  const body = await res.json();
  return body.results[0];
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
    const result = await firstResult(res);

    // Then: the agent gets real availability back, not a "none found" fallback
    expect(result.result).toBe(
      '2026-11-04T09:00:00.000-05:00, 2026-11-04T10:00:00.000-05:00, 2026-11-05T09:00:00.000-05:00'
    );
  });

  it('should_report_no_availability_when_cal_returns_no_slots', async () => {
    // Given
    fetchMock.mockResolvedValueOnce(calResponse({ status: 'success', data: {} }));

    // When
    const res = await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));
    const result = await firstResult(res);

    // Then
    expect(result.result).toBe('No availability found');
  });

  it('should_return_tool_error_without_calling_cal_when_timezone_missing', async () => {
    // When
    const res = await POST(toolCallRequest('check_availability', {}));
    const result = await firstResult(res);

    // Then
    expect({ status: res.status, error: result.error, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 200,
      error: 'Missing required parameter: timezone',
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

  it('should_return_tool_error_without_calling_cal_when_email_missing', async () => {
    // Given: Cal.com rejects undeliverable emails, so a placeholder can never book
    const { email: _email, ...withoutEmail } = bookingParams;

    // When
    const res = await POST(toolCallRequest('book_meeting', withoutEmail));
    const result = await firstResult(res);

    // Then
    expect({ status: res.status, error: result.error, calCalls: fetchMock.mock.calls.length }).toEqual({
      status: 200,
      error: 'Missing required parameter: email',
      calCalls: 0,
    });
  });

  it('should_confirm_booked_start_time_from_v2_response', async () => {
    // When
    const res = await POST(toolCallRequest('book_meeting', bookingParams));
    const result = await firstResult(res);

    // Then
    expect(result.result).toBe('Booked for 2026-11-04T17:00:00.000Z');
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

describe('POST /api/vapi-tools Vapi tool-calls contract', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
    fetchMock.mockImplementation(async () =>
      calResponse({
        status: 'success',
        data: { '2026-11-04': [{ start: '2026-11-04T09:00:00.000-05:00' }] },
      })
    );
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_echo_tool_call_id_and_name_in_result', async () => {
    // When
    const res = await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));
    const result = await firstResult(res);

    // Then
    expect({ toolCallId: result.toolCallId, name: result.name }).toEqual({
      toolCallId: 'toolcall_1',
      name: 'check_availability',
    });
  });

  it('should_accept_openai_style_tool_calls_with_json_string_arguments', async () => {
    // Given: Vapi may send toolCallList entries as OpenAI tool calls
    const req = vapiRequest({
      message: {
        type: 'tool-calls',
        toolCallList: [
          {
            id: 'toolcall_2',
            type: 'function',
            function: {
              name: 'check_availability',
              arguments: JSON.stringify({ timezone: 'America/New_York' }),
            },
          },
        ],
      },
    });

    // When
    const result = await firstResult(await POST(req));

    // Then
    expect(result).toEqual({
      toolCallId: 'toolcall_2',
      name: 'check_availability',
      result: '2026-11-04T09:00:00.000-05:00',
    });
  });

  it('should_return_one_result_per_tool_call', async () => {
    // Given
    const req = vapiRequest({
      message: {
        type: 'tool-calls',
        toolCallList: [
          { id: 'a', name: 'check_availability', parameters: { timezone: 'America/New_York' } },
          { id: 'b', name: 'check_availability', parameters: { timezone: 'America/Chicago' } },
        ],
      },
    });

    // When
    const body = await (await POST(req)).json();

    // Then
    expect(body.results.map((r: any) => r.toolCallId)).toEqual(['a', 'b']);
  });

  it('should_report_cal_failure_as_tool_error_with_http_200', async () => {
    // Given
    fetchMock.mockImplementation(async () => new Response('boom', { status: 500 }));

    // When
    const res = await POST(toolCallRequest('check_availability', { timezone: 'America/New_York' }));
    const result = await firstResult(res);

    // Then
    expect({ status: res.status, failed: result.error?.startsWith('Failed to get availability') }).toEqual({
      status: 200,
      failed: true,
    });
  });

  it('should_report_unknown_tool_as_tool_error', async () => {
    // When
    const result = await firstResult(await POST(toolCallRequest('make_coffee', {})));

    // Then
    expect(result.error).toBe('Unknown tool: make_coffee');
  });

  it('should_reject_body_without_tool_call_list', async () => {
    // When
    const res = await POST(vapiRequest({ message: { toolCall: { name: 'check_availability' } } }));

    // Then
    expect(res.status).toBe(400);
  });
});

describe('/api/vapi-tools CORS for the Vapi dashboard tool tester', () => {
  // The dashboard's "Test" button calls the tool URL from the browser
  const DASHBOARD = 'https://dashboard.vapi.ai';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => calResponse({ status: 'success', data: {} })));
    vi.stubEnv('CAL_API_KEY', 'test-key');
    vi.stubEnv('CAL_EVENT_TYPE_ID', '123');
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function withOrigin(req: Request, origin: string) {
    req.headers.set('Origin', origin);
    return req as any;
  }

  it('should_allow_dashboard_preflight_with_authorization_header', async () => {
    // When
    const res = await OPTIONS(
      new Request('http://localhost/api/vapi-tools', {
        method: 'OPTIONS',
        headers: { Origin: DASHBOARD },
      }) as any
    );

    // Then
    expect({
      status: res.status,
      origin: res.headers.get('access-control-allow-origin'),
      allowsAuth: /authorization/i.test(res.headers.get('access-control-allow-headers') ?? ''),
      allowsPost: /POST/.test(res.headers.get('access-control-allow-methods') ?? ''),
    }).toEqual({ status: 204, origin: DASHBOARD, allowsAuth: true, allowsPost: true });
  });

  it.each([
    ['authorized', 'Bearer test-secret'],
    ['unauthorized', 'Bearer wrong'],
  ])('should_allow_dashboard_origin_on_%s_post', async (_case, authorization) => {
    // When
    const res = await POST(
      withOrigin(toolCallRequest('check_availability', { timezone: 'America/New_York' }, authorization), DASHBOARD)
    );

    // Then: the browser can read 401s too, so the tester shows the real reason
    expect(res.headers.get('access-control-allow-origin')).toBe(DASHBOARD);
  });

  it('should_not_allow_other_origins', async () => {
    // When
    const res = await OPTIONS(
      new Request('http://localhost/api/vapi-tools', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      }) as any
    );

    // Then
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('/api/vapi-tools 401 diagnostics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('VAPI_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_log_header_shape_and_token_fingerprint_without_leaking_tokens', async () => {
    // Given
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // When
    await POST(toolCallRequest('check_availability', {}, 'Bearer wrong-token'));

    // Then
    const logged = warn.mock.calls.flat().join(' ');
    expect({
      hasScheme: logged.includes('scheme=Bearer'),
      hasLength: logged.includes('tokenLength=11'),
      hasFingerprint: /tokenSha256=[0-9a-f]{12}/.test(logged),
      leaksProvided: logged.includes('wrong-token'),
      leaksSecret: logged.includes('test-secret'),
    }).toEqual({
      hasScheme: true,
      hasLength: true,
      hasFingerprint: true,
      leaksProvided: false,
      leaksSecret: false,
    });
  });
});
