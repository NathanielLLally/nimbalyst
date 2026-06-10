#!/usr/bin/env node

/**
 * Create book_meeting_tool in Vapi
 * Run: node create-book-meeting-tool.js
 */

require('dotenv').config();

async function createTool() {
  const apiKey = process.env.VAPI_API_KEY;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set in .env');
    process.exit(1);
  }

  try {
    console.log('\n🔧 Creating book_meeting_tool in Vapi\n');

    const toolPayload = {
      type: 'function',
      function: {
        name: 'book_meeting',
        description: 'Books a meeting for the customer using available time slots from their calendar',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Full name of the person booking the meeting',
            },
            email: {
              type: 'string',
              description: 'Email address of the person booking the meeting',
            },
            datetime: {
              type: 'string',
              description: 'Desired meeting time in ISO 8601 format (e.g., 2026-06-17T14:00:00Z)',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for the meeting (e.g., America/New_York, Europe/London)',
            },
          },
          required: ['name', 'email', 'datetime', 'timezone'],
        },
      },
      server: {
        url: `${baseUrl}/api/vapi-tools`,
      },
      messages: [
        {
          type: 'request-start',
          content: 'Let me book that meeting for you.',
        },
        {
          type: 'request-complete',
          content: "Perfect! I've booked your meeting.",
        },
        {
          type: 'request-failed',
          content: "I'm having trouble booking that time. Let me try another time.",
        },
      ],
    };

    console.log('📋 Tool payload:');
    console.log(JSON.stringify(toolPayload, null, 2));
    console.log('');

    const response = await fetch('https://api.vapi.ai/tool', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create tool: ${response.status} ${error}`);
    }

    const tool = await response.json();
    console.log('✅ Tool created successfully!\n');
    console.log('📊 Tool Details:');
    console.log(`  ID: ${tool.id}`);
    console.log(`  Name: ${tool.function.name}`);
    console.log(`  Server URL: ${tool.server.url}`);
    console.log(`  Parameters: name, email, datetime, timezone\n`);

    console.log('📌 Next steps:');
    console.log(`  1. Copy the tool ID: ${tool.id}`);
    console.log('  2. Run: node attach-book-meeting-tool.js <tool-id>');
    console.log('  3. This will attach the tool to your assistant\n');

    return tool;
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTool();
