import { describe, it, expect, beforeEach } from 'vitest';
import { formatContactSubmissionEmail } from '#lib/format-contact-submission-email';

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
    const formData = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+14155552671',
      company: 'Acme Corp',
      website: 'https://acme.com',
      businessType: 'grooming',
      challenge: 'Need more bookings',
      message: 'Please help us grow',
      receiveMessages: true,
      timezone: 'America/New_York',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).toContain('Jane Doe');
    expect(body).toContain('jane@example.com');
    expect(body).toContain('+14155552671');
    expect(body).toContain('Acme Corp');
    expect(body).toContain('https://acme.com');
    expect(body).toContain('grooming');
    expect(body).toContain('Need more bookings');
    expect(body).toContain('Please help us grow');
    expect(body).toContain('Yes'); // receiveMessages: true
    expect(body).toContain('America/New_York');
  });

  it('extracts and includes the client IP address', async () => {
    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'UTC',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).toContain('203.0.113.45');
  });

  it('extracts and includes the user agent string', async () => {
    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'UTC',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).toContain('Mozilla/5.0');
    expect(body).toContain('AppleWebKit');
  });

  it('includes the timestamp from the form submission', async () => {
    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'America/Los_Angeles',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).toContain('2026-09-21');
    expect(body).toContain('America/Los_Angeles');
  });

  it('falls back to X-Forwarded-For if X-Real-IP not present', async () => {
    mockRequest.headers = new Map([
      ['user-agent', 'Mozilla/5.0'],
      ['x-forwarded-for', '198.51.100.5, 203.0.113.10'],
      ['host', 'happytailspawcare.com'],
    ]);

    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'UTC',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    // Should use the first IP in the chain
    expect(body).toContain('198.51.100.5');
  });

  it('includes request host', async () => {
    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'UTC',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).toContain('happytailspawcare.com');
  });

  it('returns plaintext without HTML tags', async () => {
    const formData = {
      fullName: 'Test',
      email: 'test@example.com',
      phone: '+14155552671',
      company: 'Test Inc',
      website: 'https://test.com',
      businessType: 'grooming',
      challenge: 'test',
      message: 'test',
      receiveMessages: false,
      timezone: 'UTC',
      submittedAt: '2026-09-21T20:48:00Z',
    };

    const body = formatContactSubmissionEmail(formData, mockRequest);

    expect(body).not.toContain('<');
    expect(body).not.toContain('>');
    expect(body).not.toMatch(/<\/?[a-z]/i);
  });
});
