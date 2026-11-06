import { describe, it, expect, beforeEach } from 'vitest';
import { formatContactSubmissionEmail } from '#lib/format-contact-submission-email';

// Valid submission shape; individual tests override only what they exercise.
function makeFormData(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+14155552671',
    company: 'Acme Corp',
    website: 'https://acme.com',
    businessType: 'grooming-salon',
    monthlyBudget: '$420–$1,000',
    role: 'owner-dogs',
    dogsPerWeek: '26-50',
    clientSource: 'paid-ads',
    costKnowledge: 'exact',
    frustration: 'inconsistent-leads',
    triedBefore: 'fb-google-ads',
    tenMoreClients: 'hire-help',
    startTiming: 'now',
    roleOther: '',
    clientSourceOther: '',
    frustrationOther: '',
    triedBeforeOther: '',
    tenMoreClientsOther: '',
    receiveMessages: true,
    timezone: 'America/New_York',
    submittedAt: '2026-09-21T20:48:00Z',
    ...overrides,
  } as any;
}

describe('formatContactSubmissionEmail', () => {
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      headers: new Map([
        ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
        ['x-real-ip', '203.0.113.45'],
        ['host', 'happytailspawcare.com'],
      ]),
    };
  });

  it('includes all form fields in the email body', async () => {
    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    expect(body).toContain('Jane Doe');
    expect(body).toContain('jane@example.com');
    expect(body).toContain('+14155552671');
    expect(body).toContain('Acme Corp');
    expect(body).toContain('https://acme.com');
    expect(body).toContain('Yes'); // receiveMessages: true
    expect(body).toContain('America/New_York');
  });

  it('includes the lead qualification answers as readable labels', async () => {
    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    expect(body).toContain('Owner working with dogs');
    expect(body).toContain('Inconsistent leads');
    expect(body).toContain('Hire help');
  });

  it('shows the custom write-in when an answer is "Other"', async () => {
    const body = formatContactSubmissionEmail(
      makeFormData({ triedBefore: 'other', triedBeforeOther: 'Billboards downtown' }),
      mockRequest
    );

    expect(body).toContain('Billboards downtown');
  });

  it('includes the computed lead score section', async () => {
    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    expect(body).toContain('LEAD SCORE');
    expect(body).toContain('ICP Match:');
    expect(body).toContain('Ability To Pay:');
    expect(body).toContain('Readiness:');
  });

  it('extracts and includes the client IP address', async () => {
    const body = formatContactSubmissionEmail(makeFormData({ receiveMessages: false }), mockRequest);

    expect(body).toContain('203.0.113.45');
  });

  it('extracts and includes the user agent string', async () => {
    const body = formatContactSubmissionEmail(makeFormData({ receiveMessages: false }), mockRequest);

    expect(body).toContain('Mozilla/5.0');
    expect(body).toContain('AppleWebKit');
  });

  it('includes the timestamp from the form submission', async () => {
    const body = formatContactSubmissionEmail(
      makeFormData({ timezone: 'America/Los_Angeles' }),
      mockRequest
    );

    expect(body).toContain('2026-09-21');
    expect(body).toContain('America/Los_Angeles');
  });

  it('falls back to X-Forwarded-For if X-Real-IP not present', async () => {
    mockRequest.headers = new Map([
      ['user-agent', 'Mozilla/5.0'],
      ['x-forwarded-for', '198.51.100.5, 203.0.113.10'],
      ['host', 'happytailspawcare.com'],
    ]);

    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    // Should use the first IP in the chain
    expect(body).toContain('198.51.100.5');
  });

  it('includes request host', async () => {
    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    expect(body).toContain('happytailspawcare.com');
  });

  it('returns plaintext without HTML tags', async () => {
    const body = formatContactSubmissionEmail(makeFormData(), mockRequest);

    expect(body).not.toContain('<');
    expect(body).not.toContain('>');
    expect(body).not.toMatch(/<\/?[a-z]/i);
  });
});
