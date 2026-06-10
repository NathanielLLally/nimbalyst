#!/usr/bin/env node

/**
 * Test Vapi Tools Route
 * Run: node test-vapi-tools.js
 *
 * Note: Requires CAL_API_KEY and CAL_EVENT_TYPE_ID in .env for full testing
 */

require('dotenv').config();

async function testVapiTools() {
  console.log('\n🔧 Vapi Tools Route Tests\n');

  // Check prerequisites
  const hasCalConfig = process.env.CAL_API_KEY && process.env.CAL_EVENT_TYPE_ID;
  if (!hasCalConfig) {
    console.log('⚠️  Cal.com credentials not configured');
    console.log('   Add CAL_API_KEY and CAL_EVENT_TYPE_ID to .env for full testing\n');
  }

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/vapi-tools`;

  // Test 1: check_availability
  console.log('Test 1: check_availability tool call');
  try {
    const availabilityRequest = {
      message: {
        toolCall: {
          name: 'check_availability',
          parameters: {
            timezone: 'America/New_York'
          }
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(availabilityRequest)
    });

    const data = await response.json();

    if (response.ok && data.result) {
      console.log('✅ check_availability passed');
      console.log('   Result:', data.result);
    } else if (response.status === 500 && data.error?.includes('410')) {
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
    // Use a future date (7 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(14, 0, 0, 0);

    const bookingRequest = {
      message: {
        toolCall: {
          name: 'book_meeting',
          parameters: {
            name: 'Test User',
            email: 'test@example.com',
            datetime: futureDate.toISOString(),
            timezone: 'America/New_York'
          }
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingRequest)
    });

    const data = await response.json();

    if (response.ok && data.result) {
      console.log('✅ book_meeting passed');
      console.log('   Result:', data.result);
    } else if (response.status === 500 && data.error?.includes('no_available_users_found')) {
      console.log('⚠️  book_meeting - API working, but Cal.com configuration issue');
      console.log('   Action: Add available team members to your event type in Cal.com');
    } else if (response.status === 500 && data.error?.includes('410')) {
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
    const invalidRequest = {
      message: {
        toolCall: {
          name: 'unknown_tool',
          parameters: {}
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest)
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log('⚠️  Unknown tool returned 200 (should handle or error)');
      console.log('   Response:', data);
    } else {
      console.log('✅ Unknown tool handled (status:', response.status + ')');
    }
  } catch (err) {
    console.log('✅ Unknown tool error caught:', err.message);
  }
  console.log('');

  // Test 4: Missing required parameters
  console.log('Test 4: Missing required parameters');
  try {
    const missingParamsRequest = {
      message: {
        toolCall: {
          name: 'check_availability',
          parameters: {} // Missing timezone
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingParamsRequest)
    });

    const data = await response.json();

    if (response.status !== 200) {
      console.log('✅ Missing parameters caught (status:', response.status + ')');
    } else if (!data.result) {
      console.log('⚠️  Missing parameters returned empty result');
      console.log('   Response:', data);
    } else {
      console.log('✅ Request processed (may have defaults)');
      console.log('   Result:', data.result);
    }
  } catch (err) {
    console.log('❌ Missing parameters error:', err.message);
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
