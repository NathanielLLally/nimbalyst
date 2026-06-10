#!/usr/bin/env node

/**
 * Attach book_meeting_tool to Happy Tails Assistant
 * Run: node attach-tool-to-assistant.js
 */

require('dotenv').config();

const ASSISTANT_ID = '3b55189f-fbc6-4861-a7d7-7f746191ea81';
const TOOL_NAME = 'book_meeting_tool';

async function attachTool() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set in .env');
    process.exit(1);
  }

  try {
    console.log(`\n🔧 Attaching ${TOOL_NAME} to assistant ${ASSISTANT_ID}\n`);

    // Step 1: List all tools to find the book_meeting_tool
    console.log('📋 Searching for book_meeting_tool...');
    const toolsResponse = await fetch('https://api.vapi.ai/tool', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!toolsResponse.ok) {
      throw new Error(`Failed to list tools: ${toolsResponse.status}`);
    }

    const tools = await toolsResponse.json();
    const bookMeetingTool = tools.find((t) => t.function?.name === TOOL_NAME);

    if (!bookMeetingTool) {
      console.error(`❌ Tool "${TOOL_NAME}" not found in Vapi`);
      console.log('Available tools:', tools.map((t) => t.function?.name).filter(Boolean));
      process.exit(1);
    }

    const toolId = bookMeetingTool.id;
    console.log(`✅ Found tool ID: ${toolId}\n`);

    // Step 2: Get current assistant config
    console.log('📖 Fetching assistant configuration...');
    const assistantResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!assistantResponse.ok) {
      throw new Error(`Failed to get assistant: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();
    console.log(`✅ Current model: ${assistant.model?.provider} ${assistant.model?.model}\n`);

    // Step 3: Update assistant with tool
    console.log('🔗 Attaching tool to assistant...');

    const currentToolIds = assistant.model?.toolIds || [];
    const updatedToolIds = [...new Set([...currentToolIds, toolId])]; // Avoid duplicates

    const updatePayload = {
      model: {
        ...assistant.model,
        toolIds: updatedToolIds,
      },
    };

    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update assistant: ${updateResponse.status} ${error}`);
    }

    const updatedAssistant = await updateResponse.json();
    console.log(`✅ Assistant updated successfully\n`);

    // Step 4: Confirm
    console.log('📊 Summary:');
    console.log(`  Assistant ID: ${ASSISTANT_ID}`);
    console.log(`  Tool ID: ${toolId}`);
    console.log(`  Tool Name: ${TOOL_NAME}`);
    console.log(`  Total tools attached: ${updatedAssistant.model?.toolIds?.length || 0}\n`);

    console.log('✨ Ready to book meetings!\n');
    console.log('The assistant can now:');
    console.log('  - Accept book_meeting requests from callers');
    console.log('  - Call your /api/vapi-tools endpoint');
    console.log('  - Book meetings via Cal.com\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

attachTool();
