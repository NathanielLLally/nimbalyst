import { describe, it, expect, vi } from 'vitest';
import { sendEmail } from '#lib/contact-email-sender';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: vi.fn(),
    })),
  },
}));

describe('Contact Email Sender', () => {
  it('sends an email', async () => {
    const plaintext = `Hello!

We are reaching out to check and make sure you have everything you wanted from us. Let us know if we can do anything else. Have a wonderful day!

Best regards,
Happy Tails Paw Care Team`;

    const result = await sendEmail(
      'info@happytailspawcare.com',
      'About the recently developed Contact Tracker',
      plaintext,
      plaintext
    );

    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
  });
});
