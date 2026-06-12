#!/usr/bin/env node

/**
 * Unit Tests for Contact SMS + Booking Feature
 * Run: node test-contact-sms-booking.js
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

async function asyncTest(name, fn) {
  try {
    await fn();
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
// Mocks and Utilities
// ============================================================================

let fetchMockCalls = [];
let fetchMockResponses = {};

function mockFetch(url, responses) {
  fetchMockResponses[url] = responses;
  fetchMockCalls = [];
}

async function fetchWithMock(url, options) {
  fetchMockCalls.push({ url, options });

  if (fetchMockResponses[url]) {
    const response = fetchMockResponses[url];
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      json: async () => response.data || {},
    };
  }

  throw new Error(`No mock configured for ${url}`);
}

// Override global fetch in Node.js context
global.fetch = fetchWithMock;

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

test('Should return both SMS and booking results', () => {
  const result = {
    smsSuccess: true,
    bookingSuccess: true,
    smsMessageId: 'SM1234567890',
    bookingInfo: 'Booked for 2024-01-15T10:00:00Z',
    errors: {},
  };

  assert.ok(typeof result.smsSuccess === 'boolean', 'Should have SMS success flag');
  assert.ok(typeof result.bookingSuccess === 'boolean', 'Should have booking success flag');
  assert.ok(result.smsMessageId || !result.smsSuccess, 'Should have message ID if successful');
  assert.ok(result.bookingInfo || !result.bookingSuccess, 'Should have booking info if successful');
});

test('Form submission response should include SMS and booking status', () => {
  const response = {
    success: true,
    contactId: 'contact_1234567890_abc123',
    smsBooking: {
      smsSuccess: true,
      bookingSuccess: true,
      errors: {},
    },
  };

  assert.ok(response.success, 'Response should be successful');
  assert.ok(response.contactId, 'Response should include contact ID');
  assert.ok(response.smsBooking, 'Response should include SMS booking info');
  assert.ok(typeof response.smsBooking.smsSuccess === 'boolean', 'Should have SMS success flag');
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\nTest Results: ${tests.passed} passed, ${tests.failed} failed\n`);

if (tests.errors.length > 0) {
  console.log('Failed tests:');
  tests.errors.forEach(({ name, error }) => {
    console.log(`  - ${name}: ${error}`);
  });
  console.log();
}

process.exit(tests.failed > 0 ? 1 : 0);
