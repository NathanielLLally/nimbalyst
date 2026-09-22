import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Integration mode detection helper.
 *
 * Checks for real SMTP credentials from .env.tests. Used to determine
 * whether tests should mock nodemailer or use the real module.
 */
function isIntegrationModeEnabled(): boolean {
  // NO_INTEGRATION=1 forces the hermetic suite even when real credentials are
  // present in .env / .env.tests. Without it, having those files on disk makes
  // the mocked tests unrunnable.
  if (process.env.NO_INTEGRATION) {
    return false;
  }

  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASSWORD
  );
}

/**
 * Ensure client certificates are available for integration tests.
 * Creates symlinks or copies if needed.
 */
function setupClientCertificates(): void {
  const certFile = 'test-client.crt';
  const keyFile = 'test-client.key';

  // In integration mode, ensure the certificates are accessible
  if (isIntegrationModeEnabled()) {
    if (!fs.existsSync(certFile)) {
      console.warn(`⚠️  Client certificate not found: ${certFile}`);
      console.warn('   Integration tests may fall back to password authentication');
    }
    if (!fs.existsSync(keyFile)) {
      console.warn(`⚠️  Client key not found: ${keyFile}`);
      console.warn('   Integration tests may fall back to password authentication');
    }
  }
}

// Hoisted mocks (required at top-level for vi.mock to work).
// These are only used in unit mode; integration mode passes through the real module.
const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  // The parameter is declared so TypeScript types `createTransport.mock.calls`
  // as [config] rather than an empty tuple — without it, reading calls[0][0]
  // is a compile error.
  const createTransport = vi.fn((_config: any) => ({ sendMail }));
  return { sendMail, createTransport };
});

// Mock nodemailer: in integration mode, use the real module; in unit mode, use fakes.
vi.mock('nodemailer', async () => {
  if (isIntegrationModeEnabled()) {
    // Pass through the real nodemailer for integration tests
    return vi.importActual('nodemailer');
  }
  // Return mocked implementation for unit tests
  return {
    default: { createTransport },
    createTransport,
  };
});

/**
 * Integration mode detection.
 *
 * If .env.tests provides real SMTP credentials, tests run against an actual
 * mail server. Otherwise, tests mock nodemailer and run in unit mode.
 *
 * To enable integration tests:
 *   1. Create .env.tests in the project root
 *   2. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *   3. Run: npm test
 *
 * Mocked tests (the default) stub all SMTP calls and verify behavior without
 * network access.
 */
const isIntegrationMode = isIntegrationModeEnabled();

/**
 * Print a banner naming which SMTP/sender env vars are set and will be used,
 * so a run against a real mail server never happens silently. SMTP_PASSWORD
 * is masked rather than omitted — its presence still matters, its value doesn't.
 */
function printIntegrationBanner(): void {
  const relevantVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'FROM_EMAIL',
    'FROM_NAME',
  ];
  const maskedVars = new Set(['SMTP_PASSWORD']);
  const setVars = relevantVars.filter((key) => !!process.env[key]);
  const nameWidth = Math.max(...setVars.map((key) => key.length));

  const line = '='.repeat(60);
  console.log(`\n${line}`);
  console.log('  INTEGRATION MODE — sending real email via SMTP');
  console.log(line);
  for (const key of setVars) {
    const value = maskedVars.has(key) ? '*'.repeat(8) : process.env[key];
    console.log(`  ${key.padEnd(nameWidth)} = ${value}`);
  }
  console.log(`${line}\n`);
}

if (isIntegrationMode) {
  printIntegrationBanner();
  setupClientCertificates();
}

import {
  sendEmail,
  sendFollowupEmail,
  sendInformationalEmail,
} from '#lib/contact-email-sender';

/** The arguments the module handed to nodemailer's sendMail (unit mode only). */
function sentMessage(): any {
  const call = sendMail?.mock.calls[0];
  if (!call) throw new Error('sendMail was not called');
  return call[0];
}

/** The config the module handed to nodemailer's createTransport (unit mode only). */
function transportConfig(): any {
  const call = createTransport?.mock.calls[0];
  if (!call) throw new Error('createTransport was not called');
  return call[0];
}

// Setup: stub test credentials in unit mode, or skip if using real SMTP.
if (!isIntegrationMode) {
  beforeEach(() => {
    vi.stubEnv('SMTP_HOST', 'smtp.test.local');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'test-user');
    vi.stubEnv('SMTP_PASSWORD', 'test-password');
    vi.stubEnv('FROM_EMAIL', '');
    vi.stubEnv('FROM_NAME', '');
    // Point to test certificates if they exist
    vi.stubEnv('SMTP_CERT_FILE', 'test-client.crt');
    vi.stubEnv('SMTP_KEY_FILE', 'test-client.key');

    if (sendMail && createTransport) {
      sendMail.mockReset().mockResolvedValue({ messageId: 'test-message-id' });
      createTransport.mockClear();
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
}

describe('sendEmail', () => {
  // Tests that inspect mock calls only run in unit mode.
  const test_unit = isIntegrationMode ? it.skip : it;

  test_unit('reports the message id returned by the mail server', async () => {
    const result = await sendEmail('info@happytailspawcare.com', 'Subject', 'Body');

    expect(result).toEqual({ success: true, messageId: 'test-message-id' });
  });

  test_unit('delivers the recipient and subject to the mail server', async () => {
    await sendEmail('owner@example.com', 'About your booking', 'Body');

    expect(sentMessage()).toMatchObject({
      to: 'owner@example.com',
      subject: 'About your booking',
    });
  });

  test_unit('sends the body as plaintext', async () => {
    await sendEmail('owner@example.com', 'Subject', 'Plain body');

    expect(sentMessage().text).toBe('Plain body');
  });

  test_unit('never sends an HTML part', async () => {
    await sendEmail('owner@example.com', 'Subject', 'Plain body');

    expect(sentMessage().html).toBeUndefined();
  });

  test_unit('authenticates with the configured SMTP credentials', async () => {
    await sendEmail('owner@example.com', 'Subject', 'Body');

    expect(transportConfig()).toMatchObject({
      host: 'smtp.test.local',
      port: 587,
      auth: { user: 'test-user', pass: 'test-password' },
    });
  });

  test_unit('falls back to the default sender identity when none is configured', async () => {
    await sendEmail('owner@example.com', 'Subject', 'Body');

    expect(sentMessage().from).toBe(
      'Happy Tails Paw Care <noreply@happytailspawcare.com>'
    );
  });

  test_unit('uses the configured sender identity when one is set', async () => {
    vi.stubEnv('FROM_EMAIL', 'hello@happytailspawcare.com');
    vi.stubEnv('FROM_NAME', 'Happy Tails Booking');

    await sendEmail('owner@example.com', 'Subject', 'Body');

    expect(sentMessage().from).toBe(
      'Happy Tails Booking <hello@happytailspawcare.com>'
    );
  });

  test_unit('includes unsubscribe and help list headers', async () => {
    await sendEmail('owner@example.com', 'Subject', 'Body');

    const { list } = sentMessage();
    expect(list.help).toBe('postmaster@happytailspawcare.com?subject=help');
    expect(list.unsubscribe.url).toMatch(
      /^https:\/\/mail\.happytailspawcare\.com\/\?unsubscribe=[0-9a-f-]{36}$/
    );
  });

  test_unit('gives each message its own unsubscribe link', async () => {
    await sendEmail('first@example.com', 'Subject', 'Body');
    await sendEmail('second@example.com', 'Subject', 'Body');

    const [first, second] = sendMail!.mock.calls.map((call) => call[0]);
    expect(first.list.unsubscribe.url).not.toBe(second.list.unsubscribe.url);
  });

  describe('rejecting HTML bodies', () => {
    test_unit.each([
      ['an opening tag', '<p>Hello there</p>'],
      ['a closing tag', 'Hello there</strong>'],
      ['a self-closing tag', 'Line one<br/>Line two'],
      ['a tag with attributes', 'Visit <a href="https://example.com">us</a>'],
      ['an uppercase tag', '<DIV>Hello</DIV>'],
      ['a numbered tag', '<h1>Heading</h1>'],
      ['an HTML comment', 'Hello <!-- hidden note --> there'],
    ])('throws when the body contains %s', async (_label, body) => {
      await expect(sendEmail('owner@example.com', 'Subject', body)).rejects.toThrow(
        /plaintext/i
      );
    });

    test_unit('names the offending markup in the error', async () => {
      await expect(
        sendEmail('owner@example.com', 'Subject', '<p>Hello</p>')
      ).rejects.toThrow('<p>');
    });

    test_unit('rejects before contacting the mail server', async () => {
      await expect(
        sendEmail('owner@example.com', 'Subject', '<p>Hello</p>')
      ).rejects.toThrow();

      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('throws rather than reporting a failed send', async () => {
      // A caller passing HTML is a programming error, not a delivery failure,
      // so it must not be reported as { success: false }.
      const result = await sendEmail(
        'owner@example.com',
        'Subject',
        '<p>Hello</p>'
      ).catch((err) => err);

      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('accepting plaintext that merely looks tag-like', () => {
    test_unit.each([
      ['a less-than comparison', 'Book when price < 100 and rating > 4'],
      ['an angle-bracketed address', 'Reply to <info@happytailspawcare.com> anytime'],
      ['an arrow', 'Request -> Confirmation -> Visit'],
    ])('sends a body containing %s', async (_label, body) => {
      const result = await sendEmail('owner@example.com', 'Subject', body);

      expect(result.success).toBe(true);
      expect(sentMessage().text).toBe(body);
    });
  });

  describe('when SMTP is misconfigured', () => {
    test_unit.each(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'])(
      'refuses to send when %s is missing',
      async (missingKey) => {
        vi.stubEnv(missingKey, '');

        const result = await sendEmail('owner@example.com', 'Subject', 'Body');

        expect(result.success).toBe(false);
        expect(result.error).toContain(missingKey);
        expect(sendMail).not.toHaveBeenCalled();
      }
    );

    test_unit('names every missing setting at once', async () => {
      vi.stubEnv('SMTP_USER', '');
      vi.stubEnv('SMTP_PASSWORD', '');

      const result = await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(result.error).toBe('Missing SMTP config: SMTP_USER, SMTP_PASSWORD');
    });
  });

  describe('transport security', () => {
    // nodemailer's `secure` selects the connection mode, not "is it encrypted":
    //   secure: true  -> implicit TLS, handshake immediately (port 465)
    //   secure: false -> connect plaintext, then upgrade via STARTTLS (ports 587, 25)
    // Getting this backwards sends a TLS ClientHello to a plaintext SMTP port.
    // Postfix then logs the handshake bytes as "improper command pipelining",
    // which the postfix[mode=aggressive] fail2ban filter bans on sight.

    test_unit('negotiates STARTTLS on the submission port', async () => {
      vi.stubEnv('SMTP_PORT', '587');

      await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(transportConfig().secure).toBe(false);
    });

    test_unit('uses implicit TLS on port 465', async () => {
      vi.stubEnv('SMTP_PORT', '465');

      await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(transportConfig().secure).toBe(true);
    });

    test_unit('does not use implicit TLS on port 25', async () => {
      vi.stubEnv('SMTP_PORT', '25');

      await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(transportConfig().secure).toBe(false);
    });
  });

  describe('when the mail server rejects the message', () => {
    test_unit('reports the failure instead of throwing', async () => {
      sendMail!.mockRejectedValue(new Error('Mailbox unavailable'));

      const result = await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mailbox unavailable');
    });

    test_unit('reports a failure when the transport cannot be created', async () => {
      createTransport!.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await sendEmail('owner@example.com', 'Subject', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });
});

describe('sendFollowupEmail', () => {
  const test_unit = isIntegrationMode ? it.skip : it;

  test_unit('addresses the follow-up to the contact by name', async () => {
    await sendFollowupEmail('Dana', 'dana@example.com');

    const message = sentMessage();
    expect(message.to).toBe('dana@example.com');
    expect(message.subject).toBe("Following Up - Let's Schedule a Call");
    expect(message.text).toContain('Hi Dana!');
  });

  it('reports the message id from the mail server', async () => {
    const result = await sendFollowupEmail('Dana', 'dana@example.com');

    expect(result).toEqual({ success: true, messageId: expect.any(String) });
  });
});

describe('sendInformationalEmail', () => {
  const test_unit = isIntegrationMode ? it.skip : it;

  test_unit('acknowledges the contact, their company and their challenge', async () => {
    await sendInformationalEmail(
      'Dana',
      'dana@example.com',
      'Paws Inc',
      'weekend boarding'
    );

    const message = sentMessage();
    expect(message.to).toBe('dana@example.com');
    expect(message.subject).toBe('We Got Your Message - weekend boarding');
    expect(message.text).toContain('Thanks for reaching out, Dana!');
    expect(message.text).toContain('weekend boarding');
    expect(message.text).toContain('Paws Inc');
  });

  it('reports the message id from the mail server', async () => {
    const result = await sendInformationalEmail(
      'Dana',
      'dana@example.com',
      'Paws Inc',
      'weekend boarding'
    );

    expect(result).toEqual({ success: true, messageId: expect.any(String) });
  });
});
