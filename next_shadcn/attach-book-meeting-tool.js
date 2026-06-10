#!/usr/bin/env node

/**
 * Attach book_meeting_tool to Happy Tails Assistant
 * Run: node attach-book-meeting-tool.js <tool-id>
 */

require('dotenv').config();

const ASSISTANT_ID = '3b55189f-fbc6-4861-a7d7-7f746191ea81';
const TOOL_ID = process.argv[2];

if (!TOOL_ID) {
  console.error('❌ Usage: node attach-book-meeting-tool.js <tool-id>');
  console.error('Example: node attach-book-meeting-tool.js 95b3fb42-0c27-426b-89cb-bd5aaf3c8326');
  process.exit(1);
}

async function attachTool() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set in .env');
    process.exit(1);
  }

  try {
    console.log(`\n🔗 Attaching tool ${TOOL_ID} to assistant\n`);

    // Get current assistant config
    console.log('📖 Fetching assistant configuration...');
    const assistantResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!assistantResponse.ok) {
      throw new Error(`Failed to get assistant: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();
    console.log(`✅ Found assistant: ${assistant.name || 'Unnamed'}\n`);

    // Update assistant with tool
    console.log('🔄 Updating assistant with tool...');

    const currentToolIds = assistant.model?.toolIds || [];
    const updatedToolIds = [...new Set([...currentToolIds, TOOL_ID])]; // Avoid duplicates

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
    console.log(`✅ Assistant updated successfully!\n`);

    // Confirm
    console.log('📊 Summary:');
    console.log(`  Assistant: ${updatedAssistant.name || ASSISTANT_ID}`);
    console.log(`  Tool ID: ${TOOL_ID}`);
    console.log(`  Total tools: ${updatedAssistant.model?.toolIds?.length || 0}`);
    console.log(`  Tools: ${updatedAssistant.model?.toolIds?.join(', ')}\n`);

    console.log('✨ Ready to go!\n');
    console.log('Your assistant can now:');
    console.log('  📅 Accept book_meeting requests from callers');
    console.log('  🔗 Call your /api/vapi-tools endpoint');
    console.log('  📌 Book meetings via Cal.com\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

attachTool();
