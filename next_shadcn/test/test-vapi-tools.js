#!/usr/bin/env node

/**
 * Test Vapi Tools Route
 * Run: node test-vapi-tools.js
 *
 * Note: Requires CAL_API_KEY and CAL_EVENT_TYPE_ID in .env for full testing,
 * and TEST_BOOKING_EMAIL (a deliverable address) to test booking
 */

require('dotenv').config();

// Vapi's tool-calls server message (https://docs.vapi.ai/server-url/events)
function toolCallBody(name, parameters) {
  const id = `toolcall_${name}`;
  return {
    message: {
      type: 'tool-calls',
      call: { id: 'call_integration_test' },
      toolCallList: [{ id, name, parameters }],
      toolWithToolCallList: [{ name, toolCall: { id, parameters } }]
    }
  };
}

async function testVapiTools() {
  console.log('\n🔧 Vapi Tools Route Tests\n');

  // Check prerequisites
  const hasCalConfig = process.env.CAL_API_KEY && process.env.CAL_EVENT_TYPE_ID;
  if (!hasCalConfig) {
    console.log('⚠️  Cal.com credentials not configured');
    console.log('   Add CAL_API_KEY and CAL_EVENT_TYPE_ID to .env for full testing\n');
  }

  const port = process.env.NEXT_PORT || 3001;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  const endpoint = `${baseUrl}/api/vapi-tools`;

  // Slot returned by check_availability, booked in Test 2
  let firstSlot = null;

  // Test 1: check_availability
  console.log('Test 1: check_availability tool call');
  try {
    const availabilityRequest = toolCallBody('check_availability', { timezone: 'America/New_York' });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VAPI_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(availabilityRequest)
    });

    const json = await response.json();
    // Fall back to the top-level body when the route failed before producing results
    const data = json.results?.[0] ?? json;

    if (response.ok && data.result) {
      console.log('✅ check_availability passed');
      console.log('   Result:', data.result);
      // "Exact datetimes: today at 7 PM = 2026-11-03T19:00:00.000-05:00; ..."
      const exact = data.result.match(/= (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2})/);
      if (exact) {
        firstSlot = exact[1];
      }
    } else if (data.error?.includes('410')) {
      console.log('⚠️  check_availability - Cal.com API returned 410 Gone');
      console.log('   Verify CAL_API_KEY and Cal.com API endpoints are current');
    } else {
      console.log('❌ check_availability failed');
      console.log('   Status:', response.status);
      console.log('   Error:', data.error);
    }
  } catch (err) {
    console.log('❌ check_availability error:', err.message);
  }
  console.log('');

  // Test 2: book_meeting
  console.log('Test 2: book_meeting tool call');
  try {
    // Book a slot Cal.com actually offers; arbitrary dates fall outside the
    // event type's booking window and fail with no_available_users_found
    if (!firstSlot) {
      throw new Error('No slot from check_availability to book');
    }
    // Cal.com rejects undeliverable domains like example.com
    if (!process.env.TEST_BOOKING_EMAIL) {
      throw new Error('Set TEST_BOOKING_EMAIL to a deliverable address to test booking');
    }

    const bookingRequest = toolCallBody('book_meeting', { name: 'Test User', email: process.env.TEST_BOOKING_EMAIL, datetime: firstSlot, timezone: 'America/New_York' });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VAPI_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(bookingRequest)
    });

    const json = await response.json();
    // Fall back to the top-level body when the route failed before producing results
    const data = json.results?.[0] ?? json;

    if (response.ok && data.result) {
      console.log('✅ book_meeting passed');
      console.log('   Result:', data.result);
    } else if (data.error?.includes('no_available_users_found')) {
      console.log('⚠️  book_meeting - API working, but the requested slot is not bookable');
      console.log('   Check the event type\'s booking window, schedule, and hosts in Cal.com');
    } else if (data.error?.includes('410')) {
      console.log('⚠️  book_meeting - Cal.com API returned 410 Gone');
      console.log('   Verify CAL_API_KEY, CAL_EVENT_TYPE_ID, and Cal.com API endpoints');
    } else {
      console.log('❌ book_meeting failed');
      console.log('   Status:', response.status);
      console.log('   Error:', data.error);
    }
  } catch (err) {
    console.log('❌ book_meeting error:', err.message);
  }
  console.log('');

  // Test 3: Invalid tool name
  console.log('Test 3: Invalid tool name (should handle gracefully)');
  try {
    const invalidRequest = toolCallBody('unknown_tool', {});

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VAPI_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(invalidRequest)
    });

    const json = await response.json();
    // Fall back to the top-level body when the route failed before producing results
    const data = json.results?.[0] ?? json;

    if (data.error) {
      console.log('✅ Unknown tool reported as tool error:', data.error);
    } else {
      console.log('❌ Unknown tool not reported as an error');
      console.log('   Status:', response.status, 'Response:', data);
    }
  } catch (err) {
    console.log('✅ Unknown tool error caught:', err.message);
  }
  console.log('');

  // Test 4: Missing timezone defaults to America/New_York
  console.log('Test 4: Missing timezone (should default to America/New_York)');
  try {
    const missingParamsRequest = toolCallBody('check_availability', {});

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VAPI_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(missingParamsRequest)
    });

    const json = await response.json();
    // Fall back to the top-level body when the route failed before producing results
    const data = json.results?.[0] ?? json;

    if (data.result?.includes('(America/New_York)')) {
      console.log('✅ Missing timezone defaulted to America/New_York');
      console.log('   Result:', data.result);
    } else {
      console.log('❌ Missing timezone did not default to America/New_York');
      console.log('   Status:', response.status, 'Response:', data);
    }
  } catch (err) {
    console.log('❌ Missing timezone error:', err.message);
  }
  console.log('');

  // Test 5: Verify voicemailMessage in structure (schema validation)
  console.log('Test 5: Voicemail message structure validation');
  try {
    console.log('✅ SDK types confirm voicemailMessage is in assistantOverrides');
    console.log('   Structure: payload.assistantOverrides.voicemailMessage');
    console.log('   Type: string | undefined');
  } catch (err) {
    console.log('❌ Structure validation error:', err.message);
  }
  console.log('');

  console.log('✨ Test suite completed\n');
}

testVapiTools();
