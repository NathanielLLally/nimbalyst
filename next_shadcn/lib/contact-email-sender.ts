/**
 * Contact Email Sender
 *
 * Sends emails via local SMTP mail server with SASL authentication
 */

interface EmailConfig {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
 * Send email via local SMTP server
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getEmailConfig();

    // Use plaintext, or fallback to html if no text provided
    const plaintext = text || html.replace(/<[^>]*>/g, '');

    // Build SMTP message
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(7)}@${config.SMTP_HOST}>`;
    const message = `From: ${config.FROM_NAME} <${config.FROM_EMAIL}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Message-ID: ${messageId}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      `${plaintext}\r\n`;

    // Connect to SMTP server and send
    try {
      const response = await fetch(`http://${config.SMTP_HOST}:${config.SMTP_PORT}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.SMTP_USER}:${config.SMTP_PASSWORD}`).toString('base64')}`,
        },
        body: JSON.stringify({
          from: config.FROM_EMAIL,
          to,
          subject,
          message,
          html,
          text: text || html,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as any;
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log(`✅ Email sent to ${to}`);
      return { success: true, messageId };
    } catch (httpErr) {
      // Fallback: Try SMTP via native connection
      return sendViaSMTPNative(config, to, subject, html, text || html, messageId);
    }
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
  html: string,
  text: string,
  messageId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Try to use nodemailer if available
    const nodemailer = require('nodemailer');

    // Use SMTPS (SMTP over SSL/TLS)
    // Port 465 = implicit TLS (secure: true)
    // Port 587 = STARTTLS (secure: false)
    const secure = config.SMTP_PORT === 465 || config.SMTP_PORT === 25 ? false : true;

    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: secure,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });

    // Use plaintext only
    const plaintext = text || html.replace(/<[^>]*>/g, '');

    const info = await transporter.sendMail({
      from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
      to,
      subject,
      text: plaintext,
      messageId,
    });

    console.log(`✅ Email sent via nodemailer SMTPS (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // If nodemailer not available, try raw SMTPS protocol
    console.warn('⚠️  nodemailer not available, attempting raw SMTPS');
    return sendViaRawSMTPS(config, to, subject, html, text, messageId);
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

  return sendEmail(
    email,
    'Following Up - Let\'s Schedule a Call',
    textContent,
    textContent
  );
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

  return sendEmail(
    email,
    `We Got Your Message - ${challenge}`,
    textContent,
    textContent
  );
}

export default {
  sendEmail,
  sendFollowupEmail,
  sendInformationalEmail,
};
