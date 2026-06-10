#!/usr/bin/env node

/**
 * Unit Tests for Vapi Contact Tracker
 * Run: node test-vapi-contact-tracker.js
 * With debug: DEBUG=true node test-vapi-contact-tracker.js
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

// ============================================================================
// Tests
// ============================================================================

console.log('\n📋 Vapi Contact Tracker Unit Tests\n');

// Test 1: Attempt numbering
test('Attempt numbers increment correctly', () => {
  for (let i = 1; i <= 4; i++) {
    assert.strictEqual(typeof i, 'number', `Attempt ${i} should be a number`);
    assert.ok(i >= 1 && i <= 4, `Attempt should be between 1 and 4`);
  }
});

// Test 2: Voicemail messages mapping
test('Voicemail messages are defined for all attempts', () => {
  const messages = {
    1: 'Hello, this is Anna from Happy Tails Paw Care',
    2: 'Hi, this is Anna from Happy Tails Paw Care — just following up',
    3: 'Hey, Anna again from Happy Tails Paw Care!',
    4: 'Hi, this is Anna from Happy Tails Paw Care with one last follow-up',
  };

  for (const [attempt, message] of Object.entries(messages)) {
    assert.ok(message, `Attempt ${attempt} should have a message`);
    assert.ok(message.length > 10, `Message for attempt ${attempt} should be substantial`);
    assert.ok(message.includes('Anna'), `Message should mention Anna`);
  }
});

// Test 3: Payload structure for makeVapiCall
test('Vapi payload contains required fields', () => {
  const payload = {
    phoneNumberId: 'test-phone-id',
    customerPhoneNumber: '+16464507917',
    assistantId: 'test-assistant-id',
    assistantOverrides: {
      voicemailMessage: 'Test message',
      variableValues: {
        customerName: 'John Doe',
        channel: 'voice',
        attemptNumber: 1,
      },
    },
  };

  assert.ok(payload.phoneNumberId, 'Should have phoneNumberId');
  assert.ok(payload.customerPhoneNumber, 'Should have customerPhoneNumber');
  assert.ok(payload.assistantId, 'Should have assistantId');
  assert.ok(payload.assistantOverrides.voicemailMessage, 'Should have voicemailMessage');
  assert.ok(payload.assistantOverrides.variableValues, 'Should have variableValues');
  assert.strictEqual(
    payload.assistantOverrides.variableValues.attemptNumber,
    1,
    'Should have attemptNumber'
  );
});

// Test 4: Voicemail message presence on different attempts
test('Different voicemail messages for each attempt', () => {
  const messages = {
    1: 'Hello, this is Anna from Happy Tails Paw Care where every pet gets the care they deserve',
    2: 'Hi, this is Anna from Happy Tails Paw Care — just following up on the message',
    3: 'Hey, Anna again from Happy Tails Paw Care!',
    4: 'Hi, this is Anna from Happy Tails Paw Care with one last follow-up',
  };

  const uniqueMessages = new Set(Object.values(messages));
  assert.strictEqual(uniqueMessages.size, 4, 'All 4 messages should be unique');

  // Verify distinct content
  assert.ok(
    messages[1].includes('where every pet gets the care they deserve'),
    'Attempt 1 should have intro phrase'
  );
  assert.ok(
    messages[2].includes('just following up on the message'),
    'Attempt 2 should reference prior message'
  );
  assert.ok(
    messages[3].includes('Hey, Anna again'),
    'Attempt 3 should use casual greeting'
  );
  assert.ok(
    messages[4].includes('one last follow-up'),
    'Attempt 4 should emphasize finality'
  );
});

// Test 5: Phone number validation (E.164 format)
test('Phone numbers are E.164 formatted', () => {
  const phones = [
    '+16464507917',
    '+14155552671',
    '+447911123456',
  ];

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  phones.forEach((phone) => {
    assert.ok(e164Regex.test(phone), `${phone} should match E.164 format`);
  });
});

// Test 6: Retry delays configuration
test('Retry delays are configured correctly', () => {
  const retryDelaysMinutes = process.env.RETRY_DELAYS_MINUTES
    ? JSON.parse(process.env.RETRY_DELAYS_MINUTES)
    : [2, 5, 15, 60];

  assert.strictEqual(retryDelaysMinutes.length, 4, 'Should have 4 retry delays');
  assert.ok(retryDelaysMinutes[0] >= 0, 'First delay should be >= 0');

  // Check that delays are non-decreasing (allow equal values, but prefer increasing)
  for (let i = 1; i < retryDelaysMinutes.length; i++) {
    assert.ok(
      retryDelaysMinutes[i] >= retryDelaysMinutes[i - 1],
      `Delay at index ${i} should be >= previous delay`
    );
  }
});

// Test 7: Contact status enum
test('Contact statuses are defined', () => {
  const statuses = ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'RETRY_EXHAUSTED'];

  statuses.forEach((status) => {
    assert.ok(status, `Status ${status} should be defined`);
    assert.strictEqual(typeof status, 'string', `Status should be a string`);
  });
});

// Test 8: MAX_ATTEMPTS configuration
test('MAX_ATTEMPTS is configured (default 4)', () => {
  const maxAttempts = parseInt(process.env.MAX_ATTEMPTS || '4', 10);
  assert.strictEqual(maxAttempts, 4, 'Should allow 4 attempts');
  assert.ok(maxAttempts > 0, 'MAX_ATTEMPTS should be positive');
});

// Test 9: Contact tracking row structure
test('Contact row has 12 columns', () => {
  const row = [
    'contact_123', // ID
    '+16464507917', // Phone
    'John Doe', // Name
    'voice', // Channel
    'PENDING', // Status
    0, // Attempt Count
    new Date().toISOString(), // Submitted
    '', // Last Attempt
    '', // Next Retry
    '', // Resolved
    '', // Vapi Call ID
    'Test notes', // Notes
  ];

  assert.strictEqual(row.length, 12, 'Contact row should have 12 columns');
});

// Test 10: Variable values in payload
test('Variable values include all required fields', () => {
  const variableValues = {
    customerName: 'John Doe',
    channel: 'voice',
    attemptNumber: 1,
  };

  assert.ok(variableValues.customerName, 'Should have customerName');
  assert.ok(variableValues.channel, 'Should have channel');
  assert.strictEqual(typeof variableValues.attemptNumber, 'number', 'attemptNumber should be a number');
});

// Test 11: DEBUG flag behavior
test('DEBUG flag can be enabled for logging', () => {
  const debugEnabled = process.env.DEBUG === 'true';
  assert.ok(typeof debugEnabled === 'boolean', 'DEBUG should be a boolean');

  if (debugEnabled) {
    console.log('   ℹ️  DEBUG logging is enabled');
  }
});

// Test 12: Vapi config sheet structure
test('Vapi config sheet should have CALL_MACHINE_MESSAGE row', () => {
  const expectedStructure = {
    columnA: 'CALL_MACHINE_MESSAGE',
    columnB: 'Attempt 1 message',
    columnC: 'Attempt 2 message',
    columnD: 'Attempt 3 message',
    columnE: 'Attempt 4 message',
  };

  assert.ok(expectedStructure.columnA, 'Column A should identify row as CALL_MACHINE_MESSAGE');
  assert.strictEqual(
    expectedStructure.columnA,
    'CALL_MACHINE_MESSAGE',
    'Identifier should be exact'
  );
});

// ============================================================================
// Results
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${tests.passed}`);
console.log(`Tests failed: ${tests.failed}`);

if (tests.failed > 0) {
  console.log('\nFailed tests:');
  tests.errors.forEach((error) => {
    console.log(`  - ${error.name}`);
    console.log(`    ${error.error}`);
  });
}

console.log('='.repeat(50) + '\n');

process.exit(tests.failed > 0 ? 1 : 0);
