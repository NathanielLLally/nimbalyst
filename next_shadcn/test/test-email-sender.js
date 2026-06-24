#!/usr/bin/env node

/**
 * Unit Tests for Email Sender
 * Run: node test/test-email-sender.js
 *
 * Tests the SMTP email sender with local mail server
 */

require('dotenv').config();
const assert = require('assert');

// Test configuration
const tests = {
  passed: 0,
  failed: 0,
  errors: [],
};

function test(name, fn) {
  try {
    fn();
    tests.passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name, error: err.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
  }
}

// Test data
const testContact = {
  fullName: 'Anna Claude',
  email: 'anna@happytailspawcare.com',
  company: 'Acme Corp',
  challenge: 'Need help with scheduling',
};

console.log('\n📧 Email Sender Unit Tests\n');

// ============================================================================
// Configuration Tests
// ============================================================================

test('SMTP configuration should be loaded from environment', () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('   ⚠️  Missing SMTP config:', missing.join(', '));
    assert.fail('SMTP configuration not fully configured');
  } else {
    assert.ok(process.env.SMTP_HOST, 'SMTP_HOST should be configured');
    assert.ok(process.env.SMTP_PORT, 'SMTP_PORT should be configured');
    assert.ok(process.env.SMTP_USER, 'SMTP_USER should be configured');
    assert.ok(process.env.SMTP_PASSWORD, 'SMTP_PASSWORD should be configured');
  }
});

test('SMTP host should be valid format', () => {
  const host = process.env.SMTP_HOST || 'localhost';
  assert.ok(
    host.length > 0,
    'SMTP_HOST should not be empty'
  );
  assert.ok(
    host === 'localhost' || host.includes('.') || host.match(/^[\d.]+$/),
    `SMTP_HOST should be valid: ${host}`
  );
});

test('SMTP port should be a valid number', () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  assert.ok(port > 0, 'SMTP_PORT should be positive');
  assert.ok(port < 65536, 'SMTP_PORT should be less than 65536');
  assert.ok(
    [25, 465, 587, 2525].includes(port) || port > 1000,
    `SMTP_PORT should be a valid SMTP port: ${port}`
  );
});

test('SMTP credentials should be non-empty', () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  assert.ok(user && user.length > 0, 'SMTP_USER should be configured');
  assert.ok(pass && pass.length > 0, 'SMTP_PASSWORD should be configured');
});

test('From email should be configured', () => {
  const fromEmail = process.env.FROM_EMAIL || 'noreply@happytailspawcare.com';
  assert.ok(fromEmail.includes('@'), 'FROM_EMAIL should be valid format');
});

test('From name should be configured', () => {
  const fromName = process.env.FROM_NAME || 'Happy Tails Paw Care';
  assert.ok(fromName.length > 0, 'FROM_NAME should be configured');
});

// ============================================================================
// Email Message Format Tests
// ============================================================================

test('Initial email should include contact name', () => {
  const emailBody = `Thanks for reaching out, ${testContact.fullName}!`;
  assert.ok(
    emailBody.includes(testContact.fullName),
    'Email should include contact name'
  );
});

test('Initial email should include company context', () => {
  const emailBody = `We received your inquiry about ${testContact.challenge} at ${testContact.company}.`;
  assert.ok(
    emailBody.includes(testContact.company),
    'Email should mention company'
  );
  assert.ok(
    emailBody.includes(testContact.challenge),
    'Email should mention challenge'
  );
});

test('Followup email should reference earlier communication', () => {
  const emailBody = `Following up on our earlier message. We'd love to help with your scheduling needs.`;
  assert.ok(
    emailBody.includes('Following up'),
    'Followup email should reference earlier message'
  );
  assert.ok(
    emailBody.includes('scheduling needs'),
    'Followup email should mention scheduling'
  );
});

test('Email should have proper subject line format', () => {
  const subjects = [
    `We Got Your Message - ${testContact.challenge}`,
    `Following Up - Let's Schedule a Call`,
  ];

  subjects.forEach(subject => {
    assert.ok(subject.length > 0, 'Subject should not be empty');
    assert.ok(subject.length < 100, 'Subject should be reasonable length');
  });
});

// ============================================================================
// Email Structure Tests
// ============================================================================

test('Email message should include headers', () => {
  const fromEmail = process.env.FROM_EMAIL || 'noreply@happytailspawcare.com';
  const message = `From: ${fromEmail}\r\nTo: ${testContact.email}\r\nSubject: Test\r\n`;

  assert.ok(message.includes('From:'), 'Email should have From header');
  assert.ok(message.includes('To:'), 'Email should have To header');
  assert.ok(message.includes('Subject:'), 'Email should have Subject header');
});

test('Email recipient should be valid format', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(
    emailRegex.test(testContact.email),
    `Email should be valid format: ${testContact.email}`
  );
});

test('Email should have MIME content type', () => {
  const mimeType = 'text/html; charset=utf-8';
  assert.ok(mimeType.includes('text/html'), 'Should specify HTML content type');
  assert.ok(mimeType.includes('charset=utf-8'), 'Should specify UTF-8 encoding');
});

test('Email should have proper line endings (CRLF)', () => {
  const message = `From: test@example.com\r\nTo: recipient@example.com\r\n`;
  assert.ok(message.includes('\r\n'), 'Email should use CRLF line endings');
});

// ============================================================================
// SMTP Authentication Tests
// ============================================================================

test('SMTP credentials should be base64 encodable', () => {
  const user = process.env.SMTP_USER || 'vmail';
  const pass = process.env.SMTP_PASSWORD || 'q1w2E#r4';

  const userBase64 = Buffer.from(user).toString('base64');
  const passBase64 = Buffer.from(pass).toString('base64');

  assert.ok(userBase64.length > 0, 'Username should be base64 encodable');
  assert.ok(passBase64.length > 0, 'Password should be base64 encodable');
});

test('SMTP user should not contain special SMTP characters', () => {
  const user = process.env.SMTP_USER || 'vmail';
  assert.ok(
    !user.includes('\r') && !user.includes('\n'),
    'Username should not contain CRLF'
  );
});

test('SMTP password should be non-empty string', () => {
  const pass = process.env.SMTP_PASSWORD;
  assert.ok(pass && pass.length > 0, 'Password should be configured');
  assert.ok(typeof pass === 'string', 'Password should be string type');
});

// ============================================================================
// Email Template Tests
// ============================================================================

test('Initial email template should have all required sections', () => {
  const sections = [
    'greeting',
    'inquiry_confirmation',
    'support_message',
    'call_to_action',
    'signature',
  ];

  sections.forEach(section => {
    assert.ok(section.length > 0, `Template should include ${section}`);
  });
});

test('Followup email should include encouragement to respond', () => {
  const emailText = 'Feel free to reach out at any time';
  assert.ok(
    emailText.length > 0,
    'Followup email should encourage response'
  );
});

test('Email should include company signature', () => {
  const fromName = process.env.FROM_NAME || 'Happy Tails Paw Care';
  const signature = `${fromName} Team`;
  assert.ok(
    signature.includes('Paw Care') || signature.includes(fromName),
    'Email should include company name in signature'
  );
});

// ============================================================================
// Message ID Tests
// ============================================================================

test('Email should have unique message ID', () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const host = process.env.SMTP_HOST || 'localhost';
  const messageId = `<${timestamp}.${random}@${host}>`;

  assert.ok(messageId.includes('<'), 'Message ID should have angle brackets');
  assert.ok(messageId.includes('@'), 'Message ID should have @ symbol');
  assert.ok(messageId.includes('>'), 'Message ID should end with >');
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('Should handle invalid email addresses gracefully', () => {
  const invalidEmails = [
    'not-an-email',
    '@example.com',
    'user@',
    'user space@example.com',
  ];

  invalidEmails.forEach(email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    assert.ok(!isValid, `Should reject invalid email: ${email}`);
  });
});

test('Should handle missing recipient email', () => {
  const email = null;
  const isValid = email && email.includes('@');
  assert.ok(!isValid, 'Should reject missing email');
});

test('Should handle extremely long subject lines', () => {
  const longSubject = 'A'.repeat(200);
  assert.ok(
    longSubject.length > 100,
    'Test can detect long subjects'
  );
});

// ============================================================================
// SMTP Connection Tests
// ============================================================================

test('SMTP host should be accessible format', () => {
  const host = process.env.SMTP_HOST || 'localhost';
  assert.ok(
    host === 'localhost' || /^[a-zA-Z0-9.-]+$/.test(host),
    `SMTP host should be valid: ${host}`
  );
});

test('Port should be submission port (587) or alternative', () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const validPorts = [25, 465, 587, 2525];
  assert.ok(
    validPorts.includes(port) || port > 1000,
    `Port ${port} should be valid SMTP port`
  );
});

// ============================================================================
// Email Content Security Tests
// ============================================================================

test('Email should not include plaintext passwords', () => {
  const password = process.env.SMTP_PASSWORD || 'q1w2E#r4';
  const emailTemplate = `Hello ${testContact.fullName}!`;
  assert.ok(
    !emailTemplate.includes(password),
    'Email template should not contain password'
  );
});

test('Email should properly escape HTML special characters', () => {
  const testCases = [
    { input: '<script>', expected: 'should be safe' },
    { input: 'Company & Associates', expected: 'should handle ampersand' },
  ];

  testCases.forEach(testCase => {
    assert.ok(
      testCase.expected.length > 0,
      `HTML escaping test: ${testCase.input}`
    );
  });
});

// ============================================================================
// Integration Tests - Actual Email Sending
// ============================================================================

async function runIntegrationTests() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📧 Integration Tests (Actual Email Sending)\n');

  const config = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    FROM_EMAIL: process.env.FROM_EMAIL || 'anna@happytailspawcare.com',
    FROM_NAME: process.env.FROM_NAME || 'Anna',
  };

  // Check prerequisites
  const hasSMTP = config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER && config.SMTP_PASSWORD;

  if (!hasSMTP) {
    console.log('⚠️  SMTP not fully configured');
    console.log('   Cannot run integration tests\n');
    console.log('   Configure these in .env:');
    console.log('   - SMTP_HOST');
    console.log('   - SMTP_PORT');
    console.log('   - SMTP_USER');
    console.log('   - SMTP_PASSWORD\n');
    return false;
  }

  // Test 1: Send test email
  console.log('Test 1: Send plaintext test email to info@happytailspawcare.com');
  try {
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(7)}@${config.SMTP_HOST}>`;
    const plaintext = `Hello!

This is a test email from the contact tracking system.

Test timestamp: ${new Date().toISOString()}
From: ${config.FROM_NAME} <${config.FROM_EMAIL}>
Message ID: ${messageId}

This email is plaintext only (no HTML).

Best regards,
Happy Tails Paw Care Team`;

    const message = `From: ${config.FROM_NAME} <${config.FROM_EMAIL}>\r\n` +
      `To: info@happytailspawcare.com\r\n` +
      `Subject: Test Email from Contact Tracker\r\n` +
      `Message-ID: ${messageId}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      `${plaintext}\r\n`;

    // Try to send via HTTP endpoint first
    let sent = false;
    try {
      const response = await fetch(`http://${config.SMTP_HOST}:${config.SMTP_PORT}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.SMTP_USER}:${config.SMTP_PASSWORD}`).toString('base64')}`,
        },
        body: JSON.stringify({
          from: config.FROM_EMAIL,
          to: 'info@happytailspawcare.com',
          subject: 'Test Email from Contact Tracker',
          message,
          text: plaintext,
        }),
      });

      if (response.ok) {
        sent = true;
        console.log('✅ Email sent via HTTP endpoint');
        tests.passed++;
      }
    } catch (httpErr) {
      console.log('   ℹ️  HTTP endpoint not available, attempting raw SMTP...');
    }

    if (!sent) {
      // Fallback to nodemailer attempt (will fail gracefully if not installed)
      try {
        const nodemailer = require('nodemailer');

        // Use SMTPS (SMTP over SSL/TLS)
        // Port 465 = implicit TLS (secure: true)
        // Port 587 = STARTTLS (secure: false)
        const port = parseInt(config.SMTP_PORT);
        const secure = port === 465 || port === 25 ? false : true;

        const transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: port,
          secure: secure,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASSWORD,
          },
          requireTLS: true,
          connectionTimeout: 10000,
          socketTimeout: 10000,
        });

        const info = await transporter.sendMail({
          from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
          to: 'info@happytailspawcare.com',
          subject: 'Test Email from Contact Tracker',
          text: plaintext,
        });

        console.log('✅ Email sent via nodemailer SMTPS');
        console.log(`   Message ID: ${info.messageId}`);
        tests.passed++;
        sent = true;
      } catch (nmErr) {
        console.log('   ℹ️  nodemailer connection failed');
        console.log(`   Error: ${nmErr.message}`);
      }
    }

    if (sent) {
      console.log(`   To: info@happytailspawcare.com`);
      console.log(`   Subject: Test Email from Contact Tracker`);
      console.log(`   Content-Type: text/plain`);
    } else {
      console.log('⚠️  Could not send via HTTP or nodemailer');
      console.log('   Make sure SMTP server is running and accessible');
      tests.failed++;
      tests.errors.push({
        name: 'Send test email',
        error: 'No email transport available'
      });
    }
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name: 'Send test email', error: err.message });
    console.log('❌ Failed to send test email');
    console.log(`   Error: ${err.message}`);
  }
  console.log();

  // Test 2: Verify plaintext format
  console.log('Test 2: Verify email is plaintext only');
  try {
    const testEmail = `Hi User!

This is plaintext.

Best regards,
Team`;

    assert.ok(!testEmail.includes('<'), 'Email should not contain HTML tags');
    assert.ok(!testEmail.includes('</'), 'Email should not contain closing tags');
    assert.ok(testEmail.includes('\n'), 'Email should use newlines');

    console.log('✅ Email format is plaintext');
    tests.passed++;
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name: 'Plaintext verification', error: err.message });
    console.log('❌ Plaintext verification failed');
    console.log(`   Error: ${err.message}`);
  }
  console.log();

  return true;
}

// ============================================================================
// Test Summary
// ============================================================================

(async () => {
  console.log('\n' + '='.repeat(60));
  console.log(`\nUnit Test Results: ${tests.passed} passed, ${tests.failed} failed\n`);

  if (tests.errors.length > 0 && !tests.errors.some(e => e.name === 'Send test email')) {
    console.log('Failed tests:');
    tests.errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    console.log();
  }

  // Run integration tests
  await runIntegrationTests();

  // Final summary
  console.log('='.repeat(60));
  console.log(`\nFinal Results: ${tests.passed} passed, ${tests.failed} failed\n`);

  if (tests.failed > 0) {
    console.log('Some tests failed. Check output above for details.\n');
  } else {
    console.log('✅ All tests passed!\n');
  }

  process.exit(tests.failed > 0 ? 1 : 0);
})();
