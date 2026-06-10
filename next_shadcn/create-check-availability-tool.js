#!/usr/bin/env node

/**
 * Create check_availability_tool in Vapi
 * Run: node create-check-availability-tool.js
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
    console.log('\n🔧 Creating check_availability_tool in Vapi\n');

    const toolPayload = {
      type: 'function',
      function: {
        name: 'check_availability',
        description: 'Check available time slots for scheduling a meeting in a specific timezone',
        parameters: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone to check availability (e.g., America/New_York, Europe/London, America/Los_Angeles)',
            },
          },
          required: ['timezone'],
        },
      },
      server: {
        url: `${baseUrl}/api/vapi-tools`,
      },
      messages: [
        {
          type: 'request-start',
          content: 'Let me check what times are available for you.',
        },
        {
          type: 'request-complete',
          content: 'Here are the available time slots.',
        },
        {
          type: 'request-failed',
          content: "I'm having trouble checking availability. Let me try that again.",
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
    console.log(`  Parameters: timezone\n`);

    console.log('📌 Next steps:');
    console.log(`  1. Copy the tool ID: ${tool.id}`);
    console.log('  2. Run: node attach-availability-tool.js <tool-id>');
    console.log('  3. This will attach the tool to your assistant\n');

    return tool;
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTool();
