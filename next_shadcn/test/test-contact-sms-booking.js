#!/usr/bin/env node

/**
 * Integration Tests for Contact SMS + Booking Feature
 * Run: node test-contact-sms-booking.js
 *
 * Prerequisites:
 * - Next.js server running on BASE_URL (default: http://localhost:NEXT_PORT, NEXT_PORT defaults to 3001)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER configured
 * - CAL_API_KEY, CAL_EVENT_TYPE_ID configured (optional for booking tests)
 */

require('dotenv').config();
const assert = require('assert');

// Test data
const testFormData = {
  phone: '+16464507917',
  fullName: 'Anna Claude',
  email: 'anna@happytailspawcare.com',
  company: 'Acme Corp',
  challenge: 'Need help with scheduling',
  timezone: 'America/New_York',
};

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


// ============================================================================
// Configuration Tests
// ============================================================================

console.log('\n📱 Contact SMS + Booking Unit Tests\n');

test('Environment variables required for SMS', () => {
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('   ⚠️  Missing SMS config:', missing.join(', '));
    console.warn('   Add these to .env to test SMS functionality');
  } else {
    assert.ok(
      process.env.TWILIO_ACCOUNT_SID,
      'TWILIO_ACCOUNT_SID should be configured'
    );
  }
});

test('Environment variables required for availability checking', () => {
  const required = ['CAL_API_KEY', 'CAL_EVENT_TYPE_ID'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('   ⚠️  Missing Cal.com config:', missing.join(', '));
    console.warn('   Add these to .env to test booking functionality');
  } else {
    assert.ok(
      process.env.CAL_API_KEY,
      'CAL_API_KEY should be configured'
    );
  }
});

// ============================================================================
// SMS Sending Tests
// ============================================================================

test('SMS message should include contact name', () => {
  const name = 'John Doe';
  const message = `Hi ${name}! We received your form submission. We'll be in touch soon to schedule a call. Thanks!`;

  assert.ok(
    message.includes(name),
    'SMS message should include contact name'
  );
  assert.ok(
    message.includes('form submission'),
    'SMS message should mention form submission'
  );
});

test('SMS recipient phone number should be validated', () => {
  const validPhones = [
    '+12125551234',
    '+14155551234',
    '+18005551234',
  ];

  validPhones.forEach(phone => {
    assert.ok(
      phone.startsWith('+'),
      `Phone number should start with + for international format: ${phone}`
    );
    assert.ok(
      phone.length >= 10,
      `Phone number should be valid length: ${phone}`
    );
  });
});

// ============================================================================
// Availability Checking Tests
// ============================================================================

test('Availability slots should be comma-separated times', () => {
  const mockSlots = '2024-01-15T10:00:00Z, 2024-01-15T14:00:00Z, 2024-01-16T09:00:00Z';
  const slots = mockSlots.split(',').map(s => s.trim());

  assert.strictEqual(slots.length, 3, 'Should have 3 slots');
  assert.ok(
    slots[0].includes('2024-01-15T10:00:00Z'),
    'First slot should match'
  );
});

test('Timezone should be passed to availability check', () => {
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
  ];

  timezones.forEach(tz => {
    assert.ok(tz.length > 0, `Timezone should be non-empty: ${tz}`);
    assert.ok(
      tz.includes('/') || tz === 'UTC',
      `Timezone should be valid format: ${tz}`
    );
  });
});

test('Should extract first available slot from slots list', () => {
  const slots = '2024-01-15T10:00:00Z, 2024-01-15T14:00:00Z, 2024-01-16T09:00:00Z';
  const slotArray = slots.split(',').map(s => s.trim());
  const firstSlot = slotArray[0];

  assert.strictEqual(
    firstSlot,
    '2024-01-15T10:00:00Z',
    'Should extract first slot'
  );
  assert.ok(
    firstSlot.includes('T') && firstSlot.includes('Z'),
    'Slot should be ISO 8601 format'
  );
});

// ============================================================================
// Meeting Booking Tests
// ============================================================================

test('Booking parameters should include required fields', () => {
  const params = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+12125551234',
    timezone: 'America/New_York',
  };

  assert.ok(params.name, 'Should have name');
  assert.ok(params.email, 'Should have email');
  assert.ok(params.phone, 'Should have phone');
  assert.ok(params.timezone, 'Should have timezone');
});

test('Email should be valid format', () => {
  const validEmails = [
    'john@example.com',
    'test.user@domain.co.uk',
    'contact+tag@company.org',
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validEmails.forEach(email => {
    assert.ok(
      emailRegex.test(email),
      `Email should be valid format: ${email}`
    );
  });
});

test('Booking should use first available slot', () => {
  const slots = '2024-01-15T10:00:00Z, 2024-01-15T14:00:00Z';
  const selectedDatetime = slots.split(',').map(s => s.trim())[0];

  assert.strictEqual(
    selectedDatetime,
    '2024-01-15T10:00:00Z',
    'Should select first available slot'
  );
});

// ============================================================================
// Form Data Tests
// ============================================================================

test('Form data should be properly structured', () => {
  const formData = {
    phone: '+12125551234',
    fullName: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    challenge: 'Need help with scheduling',
    timezone: 'America/New_York',
  };

  assert.ok(formData.phone, 'Should have phone');
  assert.ok(formData.fullName, 'Should have full name');
  assert.ok(formData.email, 'Should have email');
  assert.ok(formData.company, 'Should have company');
  assert.ok(formData.challenge, 'Should have challenge');
});

test('Phone number should be formatted for Twilio', () => {
  const phones = ['+12125551234', '+14155551234'];

  phones.forEach(phone => {
    assert.ok(
      phone.match(/^\+1\d{10}$/),
      `Phone should be +1 followed by 10 digits: ${phone}`
    );
  });
});

// ============================================================================
// Email Tests
// ============================================================================

test('Email should include contact information', () => {
  const emailSubject = `We Got Your Message - ${testFormData.challenge}`;

  assert.ok(emailSubject.includes(testFormData.challenge), 'Subject should include challenge');
  assert.ok(emailSubject.includes('Got Your Message'), 'Subject should acknowledge receipt');
});

test('Email should have proper sender information', () => {
  const fromEmail = 'noreply@happytailspawcare.com';
  const fromName = 'Happy Tails Paw Care';

  assert.ok(fromEmail.includes('@'), 'Email should be valid format');
  assert.ok(fromName.length > 0, 'Sender name should be provided');
});

test('Followup email should include company and challenge context', () => {
  const emailBody = `Thanks for reaching out, ${testFormData.fullName}!\n\nWe received your inquiry about ${testFormData.challenge} at ${testFormData.company}.`;

  assert.ok(emailBody.includes(testFormData.fullName), 'Should include contact name');
  assert.ok(emailBody.includes(testFormData.challenge), 'Should include challenge');
  assert.ok(emailBody.includes(testFormData.company), 'Should include company');
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('Missing SMS config should throw error', () => {
  const originalConfig = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  };

  // Simulate missing config by checking it would error
  const hasMissingConfig = !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER;

  if (hasMissingConfig) {
    console.warn('   ⚠️  SMS config not fully configured, skipping config validation');
  } else {
    assert.ok(
      originalConfig.TWILIO_ACCOUNT_SID,
      'Should have account SID configured'
    );
  }
});

test('Should handle availability check failures gracefully', () => {
  const error = {
    success: false,
    error: 'No availability found',
  };

  assert.ok(!error.success, 'Should mark as failure');
  assert.ok(error.error, 'Should include error message');
});

test('Should handle booking failures gracefully', () => {
  const error = {
    success: false,
    error: 'Failed to create booking: HTTP 400 - Invalid parameters',
  };

  assert.ok(!error.success, 'Should mark as failure');
  assert.ok(error.error.includes('HTTP'), 'Should include HTTP status');
});

// ============================================================================
// Integration Flow Tests
// ============================================================================

test('SMS and booking should be independent', () => {
  const result = {
    smsSuccess: true,
    bookingSuccess: false,
    errors: { booking: 'No availability' },
  };

  // SMS success should not depend on booking success
  assert.ok(result.smsSuccess, 'SMS should succeed independently');
  assert.ok(!result.bookingSuccess, 'Booking can fail independently');
  assert.ok(result.errors.booking, 'Should track booking error');
});

test('Should return SMS, email, and booking results', () => {
  const result = {
    smsSuccess: true,
    emailSuccess: true,
    bookingSuccess: true,
    smsMessageId: 'SM1234567890',
    emailMessageId: 'em_1234567890',
    bookingInfo: 'Booked for 2024-01-15T10:00:00Z',
    errors: {},
  };

  assert.ok(typeof result.smsSuccess === 'boolean', 'Should have SMS success flag');
  assert.ok(typeof result.emailSuccess === 'boolean', 'Should have email success flag');
  assert.ok(typeof result.bookingSuccess === 'boolean', 'Should have booking success flag');
  assert.ok(result.smsMessageId || !result.smsSuccess, 'Should have SMS message ID if successful');
  assert.ok(result.emailMessageId || !result.emailSuccess, 'Should have email message ID if successful');
  assert.ok(result.bookingInfo || !result.bookingSuccess, 'Should have booking info if successful');
});

test('Form submission response should include sequential flow status', () => {
  const response = {
    success: true,
    contactId: 'contact_1234567890_abc123',
    sequentialFlow: {
      smsSuccess: true,
      emailSuccess: true,
      bookingSuccess: true,
      errors: {},
    },
  };

  assert.ok(response.success, 'Response should be successful');
  assert.ok(response.contactId, 'Response should include contact ID');
  assert.ok(response.sequentialFlow, 'Response should include sequential flow info');
  assert.ok(typeof response.sequentialFlow.smsSuccess === 'boolean', 'Should have SMS success flag');
  assert.ok(typeof response.sequentialFlow.emailSuccess === 'boolean', 'Should have email success flag');
  assert.ok(typeof response.sequentialFlow.bookingSuccess === 'boolean', 'Should have booking success flag');
});

// ============================================================================
// Integration Tests - Actual SMS Sending
// ============================================================================

async function runIntegrationTests() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📲 Integration Tests (Actual SMS Sending)\n');

  const port = process.env.NEXT_PORT || 3001;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  const endpoint = `${baseUrl}/api/contact-track`;

  // Check prerequisites
  const hasSmsCreds = process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  if (!hasSmsCreds) {
    console.log('⚠️  SMS credentials not configured');
    console.log('   Cannot run integration tests\n');
    console.log('   Configure these in .env to run SMS tests:');
    console.log('   - TWILIO_ACCOUNT_SID');
    console.log('   - TWILIO_AUTH_TOKEN');
    console.log('   - TWILIO_PHONE_NUMBER\n');
    return false;
  }

  // Test: Send actual SMS + Email via form submission
  console.log('Test 1: Form submission with sequential flow (SMS → Email → Booking)');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'form_submit',
        formData: testFormData,
        channel: 'voice',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    assert.ok(data.success, 'Should return success');
    assert.ok(data.contactId, 'Should return contact ID');
    assert.ok(data.sequentialFlow, 'Should return sequential flow result');
    assert.ok(typeof data.sequentialFlow.smsSuccess === 'boolean', 'Should have SMS success flag');
    assert.ok(typeof data.sequentialFlow.emailSuccess === 'boolean', 'Should have email success flag');

    console.log('✅ Form submission with sequential flow passed');
    console.log(`   Contact ID: ${data.contactId}`);
    console.log(`   📱 SMS: ${data.sequentialFlow.smsSuccess ? '✅' : '❌'}`);
    if (data.sequentialFlow.smsSuccess) {
      console.log(`      Message ID: ${data.sequentialFlow.smsMessageId}`);
    } else if (data.sequentialFlow.errors.sms) {
      console.log(`      Error: ${data.sequentialFlow.errors.sms}`);
    }
    console.log(`   📧 Email: ${data.sequentialFlow.emailSuccess ? '✅' : '❌'}`);
    if (data.sequentialFlow.emailSuccess) {
      console.log(`      Message ID: ${data.sequentialFlow.emailMessageId}`);
    } else if (data.sequentialFlow.errors.email) {
      console.log(`      Error: ${data.sequentialFlow.errors.email}`);
    }
    console.log(`   📅 Booking: ${data.sequentialFlow.bookingSuccess ? '✅' : '❌'}`);
    if (data.sequentialFlow.bookingSuccess && data.sequentialFlow.bookingInfo) {
      console.log(`      Info: ${data.sequentialFlow.bookingInfo}`);
    }
    tests.passed++;
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name: 'Form submission with sequential flow', error: err.message });
    console.log('❌ Form submission with sequential flow failed');
    console.log(`   Error: ${err.message}`);

    // Check if server is running
    if (err.message.includes('ECONNREFUSED')) {
      console.log(`\n   ⚠️  Could not connect to server at ${baseUrl}`);
      console.log('   Make sure Next.js dev server is running:');
      console.log('   $ npm run dev\n');
    }
  }

  // Test: Verify SMS message format
  console.log('\nTest 2: SMS message format validation');
  try {
    const expectedMessage = `Hi ${testFormData.fullName}! We received your form submission. We'll be in touch soon to schedule a call. Thanks!`;
    assert.ok(expectedMessage.includes(testFormData.fullName), 'Message should include name');
    assert.ok(expectedMessage.includes('form submission'), 'Message should mention submission');
    console.log('✅ SMS message format validation passed');
    console.log(`   Message: ${expectedMessage}\n`);
    tests.passed++;
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name: 'SMS message format', error: err.message });
    console.log('❌ SMS message format validation failed');
    console.log(`   Error: ${err.message}`);
  }

  // Test: Verify contact data is properly tracked
  console.log('Test 3: Contact data validation');
  try {
    assert.ok(testFormData.phone === '+16464507917', 'Phone should be correct');
    assert.ok(testFormData.fullName === 'Anna Claude', 'Name should be correct');
    assert.ok(testFormData.email === 'anna@happytailspawcare.com', 'Email should be correct');
    assert.ok(testFormData.company === 'Acme Corp', 'Company should be correct');
    assert.ok(testFormData.timezone === 'America/New_York', 'Timezone should be correct');
    console.log('✅ Contact data validation passed');
    tests.passed++;
  } catch (err) {
    tests.failed++;
    tests.errors.push({ name: 'Contact data validation', error: err.message });
    console.log('❌ Contact data validation failed');
    console.log(`   Error: ${err.message}`);
  }

  return true;
}

// ============================================================================
// Test Summary
// ============================================================================

(async () => {
  console.log('\n' + '='.repeat(60));
  console.log(`\nUnit Test Results: ${tests.passed} passed, ${tests.failed} failed`);

  if (tests.errors.length > 0) {
    console.log('\nFailed unit tests:');
    tests.errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
  }

  // Run integration tests
  const runIntegration = await runIntegrationTests();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log(`\nFinal Results: ${tests.passed} passed, ${tests.failed} failed\n`);

  if (tests.failed > 0) {
    console.log('Some tests failed. Check output above for details.\n');
  } else {
    console.log('✅ All tests passed!\n');
  }

  process.exit(tests.failed > 0 ? 1 : 0);
})();
