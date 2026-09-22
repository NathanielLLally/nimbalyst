/**
 * Contact Email Sender
 *
 * Sends emails via local SMTP mail server with SASL authentication or client certificates
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface EmailConfig {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

/**
 * Matches an HTML tag or comment. Deliberately narrower than `<[^>]*>` so that
 * ordinary prose keeps working: `price < 100 and rating > 4` and
 * `<info@happytailspawcare.com>` are plaintext, not markup.
 */
const HTML_TAG_PATTERN = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>|<!--/i;

/**
 * Guard the plaintext-only contract.
 *
 * Passing markup is a caller mistake rather than a delivery failure, so this
 * throws instead of returning `{ success: false }` — the caller has a bug to
 * fix, and silently stripping or sending the tags would hide it.
 */
function assertPlaintext(body: string): void {
  const match = body.match(HTML_TAG_PATTERN);

  if (match) {
    throw new Error(
      `Email body must be plaintext, found HTML: ${match[0]}`
    );
  }
}

function getEmailConfig(): EmailConfig {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing SMTP config: ${missing.join(', ')}`);
  }

  return {
    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD!,
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@happytailspawcare.com',
    FROM_NAME: process.env.FROM_NAME || 'Happy Tails Paw Care',
  };
}

/**
 * Load client certificates if they exist.
 * Used for certificate-based SMTP authentication to bypass fail2ban.
 * Paths can be set via SMTP_CERT_FILE and SMTP_KEY_FILE env vars,
 * or defaults to test-client.* in the project root.
 */
function loadClientCertificates(): { cert: Buffer; key: Buffer } | null {
  try {
    const certFile = process.env.SMTP_CERT_FILE || 'test-client.crt';
    const keyFile = process.env.SMTP_KEY_FILE || 'test-client.key';

    // Try absolute paths first, then relative to cwd
    const certPath = path.isAbsolute(certFile) ? certFile : path.join(process.cwd(), certFile);
    const keyPath = path.isAbsolute(keyFile) ? keyFile : path.join(process.cwd(), keyFile);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      return null;
    }

    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    return { cert, key };
  } catch (err) {
    // Certificates are optional; fail silently and fall back to password auth
    return null;
  }
}

/**
 * Send a plaintext email via local SMTP server
 *
 * @throws if `body` contains HTML — this sender is plaintext only.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  assertPlaintext(body);

  try {
    const config = getEmailConfig();

    return sendViaSMTPNative(config, to, subject, body);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send email:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Send via native SMTPS using nodemailer if available
 */
async function sendViaSMTPNative(
  config: EmailConfig,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const debug = false;

  try {
    // `secure` selects the connection mode, not whether the session is encrypted:
    //   true  -> implicit TLS; handshake starts immediately (port 465 / SMTPS)
    //   false -> connect in plaintext, then upgrade via STARTTLS (ports 587, 25)
    //
    // Sending a TLS ClientHello to a STARTTLS port makes postfix log the raw
    // handshake bytes as "improper command pipelining", which the
    // postfix[mode=aggressive] fail2ban filter bans on sight.
    const secure = config.SMTP_PORT === 465;

    // Try to load client certificates for certificate-based auth (avoids fail2ban)
    const certs = loadClientCertificates();
    const tlsConfig: any = {
      rejectUnauthorized: false,
    };

    // If client certs are available, use them; password auth becomes optional
    if (certs) {
      tlsConfig.cert = certs.cert;
      tlsConfig.key = certs.key;
    }

    // The client certificate is presented during the TLS handshake and is
    // independent of SASL. Credentials are always sent: blanking the password
    // would not skip AUTH, it would send an empty one — a failed auth, which is
    // exactly what the postfix-sasl fail2ban jail counts.
    const transportConfig: any = {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: secure,
      rejectUnauthorized: false,
      tls: tlsConfig,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    };

    const transporter = nodemailer.createTransport(transportConfig);

    const useruuid = crypto.randomUUID();
    const info = await transporter.sendMail({
      from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
      to,
      subject,
      text: body,
          list: {
            help: "postmaster@happytailspawcare.com?subject=help",
            unsubscribe: {
              url: `https://mail.happytailspawcare.com/?unsubscribe=${useruuid}`,
              comment: "Unsubscribe",
            }
          }
    });

    console.log(`✅ Email sent via nodemailer SMTPS (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // If nodemailer fails, try raw SMTPS protocol
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  nodemailer error: ${errMsg}`);
    //console.warn(', attempting raw SMTPS`);
    //return sendViaRawSMTPS(config, to, subject, html, text, messageId);
    return { success: false, error: `nodemailer failed: ${errMsg}` };
  }
}

/**
 * Send via raw SMTPS protocol (SMTP over TLS)
 */
async function sendViaRawSMTPS(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string,
  text: string,
  messageId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const tls = require('tls');
    const { promisify } = require('util');

    // Create TLS socket for SMTPS
    const socket = tls.connect(config.SMTP_PORT, config.SMTP_HOST, { rejectUnauthorized: false });

    const write = promisify(socket.write.bind(socket));
    const once = promisify(socket.once.bind(socket));

    // Wait for connection
    await once('secureConnect');

    // Read greeting
    let response = '';
    socket.on('data', (data: Buffer) => {
      response += data.toString();
    });

    // EHLO
    await write(`EHLO localhost\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // AUTH LOGIN
    await write(`AUTH LOGIN\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Username (base64)
    const userBase64 = Buffer.from(config.SMTP_USER).toString('base64');
    await write(`${userBase64}\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Password (base64)
    const passBase64 = Buffer.from(config.SMTP_PASSWORD).toString('base64');
    await write(`${passBase64}\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // MAIL FROM
    await write(`MAIL FROM:<${config.FROM_EMAIL}>\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // RCPT TO
    await write(`RCPT TO:<${to}>\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // DATA
    await write(`DATA\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Message (plaintext only)
    const plaintext = text || html.replace(/<[^>]*>/g, '');
    const fullMessage = `From: ${config.FROM_NAME} <${config.FROM_EMAIL}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Message-ID: ${messageId}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      `${plaintext}\r\n`;

    await write(`${fullMessage}\r\n.\r\n`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // QUIT
    await write(`QUIT\r\n`);
    socket.end();

    console.log(`✅ Email sent via raw SMTPS (TLS)`);
    return { success: true, messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Raw SMTPS failed: ${errMsg}`);
    return { success: false, error: `Raw SMTPS failed: ${errMsg}` };
  }
}

/**
 * Send followup email
 */
export async function sendFollowupEmail(
  contactName: string,
  email: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const textContent = `Hi ${contactName}!

Following up on our earlier message. We'd love to help with your scheduling needs.

Feel free to reach out at any time if you have questions or would like to discuss your requirements.

Best regards,
Happy Tails Paw Care Team`;

  return sendEmail(email, 'Following Up - Let\'s Schedule a Call', textContent);
}

/**
 * Send informational email
 */
export async function sendInformationalEmail(
  contactName: string,
  email: string,
  company: string,
  challenge: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const textContent = `Thanks for reaching out, ${contactName}!

We received your inquiry about ${challenge} at ${company}.

We're here to help and will be in touch shortly to discuss how we can support your needs.

In the meantime:
- Check out our services and how we can help
- Feel free to call us directly if you have questions
- Look forward to connecting with you soon

Best regards,
Happy Tails Paw Care Team`;

  return sendEmail(email, `We Got Your Message - ${challenge}`, textContent);
}

export default {
  sendEmail,
  sendFollowupEmail,
  sendInformationalEmail,
};
