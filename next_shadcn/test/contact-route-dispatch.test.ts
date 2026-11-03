import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const tracker = vi.hoisted(() => ({
  onFormSubmit: vi.fn(async () => ({ id: 'contact_1', row: ['contact_1'] })),
  dispatchContactDirectly: vi.fn(async () => {}),
}));

// External services: Google Sheets, email, and the tracker's Vapi dispatch
vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: class {} },
    sheets: () => ({
      spreadsheets: {
        values: {
          append: vi.fn(async () => ({ data: { updates: { updatedRange: 'contact!A5:K5' } } })),
          update: vi.fn(async () => ({ data: {} })),
        },
      },
    }),
  },
}));
vi.mock('#lib/contact-email-sender', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }));
vi.mock('@/lib/vapi-contact-tracker', () => tracker);

import { POST } from '../app/api/contact/route';

function formSubmission() {
  return new Request('http://localhost:3001/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3001' },
    body: JSON.stringify({
      fullName: 'Jane Lead',
      email: 'jane@acme.com',
      phone: '+15555550100',
      company: 'Acme',
      website: '',
      businessType: 'grooming',
      challenge: 'Growth',
      message: 'Hi',
      receiveMessages: true,
      recaptchaToken: 'token',
    }),
  }) as any;
}

describe('POST /api/contact leaves the first call to the contact tracker worker', () => {
  beforeEach(() => {
    vi.stubEnv('HTPC_CONTACT_TRACKER_ENABLED', 'true');
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.values(tracker).forEach((fn) => fn.mockClear());
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should_create_a_tracker_row_for_the_worker_to_dispatch', async () => {
    // When
    const res = await POST(formSubmission());

    // Then
    expect({ status: res.status, trackerRows: tracker.onFormSubmit.mock.calls.length }).toEqual({
      status: 200,
      trackerRows: 1,
    });
  });

  it('should_not_place_a_call_itself', async () => {
    // Given: the worker's next tick dispatches the PENDING row, recording the
    // attempt and next retry like every other call; dispatching here too
    // skipped that bookkeeping and raced the worker into duplicate calls

    // When
    await POST(formSubmission());

    // Then
    expect(tracker.dispatchContactDirectly).not.toHaveBeenCalled();
  });
});
