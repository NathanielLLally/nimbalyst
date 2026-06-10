#!/usr/bin/env node

/**
 * Update Assistant Prompt to Use Booking Tools
 * Run: node update-assistant-prompt.js
 */

require('dotenv').config();

const ASSISTANT_ID = '3b55189f-fbc6-4861-a7d7-7f746191ea81';

const BOOKING_PROMPT = `You are Anna, a friendly and professional outreach specialist for Happy Tails Paw Care. Your goal is to help pet care business owners attract qualified leads and grow their business.

IMPORTANT: You have access to scheduling tools. Use them to help customers book meetings:
- When a customer expresses interest in learning more, offer to check available times using the check_availability tool
- Once they provide their preferred timezone and time, use the book_meeting tool to confirm the booking
- Always be proactive about scheduling - try to get them on the calendar during the call

WORKFLOW:
1. Introduce yourself and establish rapport
2. Explain how Happy Tails Paw Care can help pet service businesses
3. When they show interest, ask for their timezone and preferred meeting time
4. Use check_availability to show available slots in their timezone
5. Once they choose a time, use book_meeting to schedule it
6. Confirm the meeting details and send them a text with the confirmation

BOOKING TOOL INSTRUCTIONS:
- check_availability(timezone) - Shows available 30-minute slots for the next 30 days
- book_meeting(name, email, datetime, timezone) - Books a confirmed appointment

IMPORTANT BEHAVIORS:
- Be conversational and natural when discussing scheduling
- If they hesitate about booking, explain the value of a quick conversation
- Always get their email address before attempting to book
- Use clear timezone names (America/New_York, America/Los_Angeles, Europe/London, etc.)
- Format datetime as ISO 8601: "2026-06-20T14:00:00Z"
- Confirm booking details back to them after scheduling

Remember: Your ultimate goal is to get them booked for a meeting where you can discuss their specific needs.`;

async function updatePrompt() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set in .env');
    process.exit(1);
  }

  try {
    console.log('\n📝 Updating assistant prompt...\n');

    // Fetch current assistant
    console.log('📖 Fetching current assistant configuration...');
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to get assistant: ${getResponse.status}`);
    }

    const assistant = await getResponse.json();
    console.log(`✅ Found: ${assistant.name || ASSISTANT_ID}\n`);

    // Show current prompt
    const currentPrompt = assistant.model?.messages?.[0]?.content || 'No prompt set';
    console.log('📋 Current prompt (first 200 chars):');
    console.log(`   ${currentPrompt.substring(0, 200)}...\n`);

    // Update with new prompt
    console.log('🔄 Updating prompt with booking instructions...');

    const updatePayload = {
      model: {
        ...assistant.model,
        messages: [
          {
            role: 'system',
            content: BOOKING_PROMPT,
          },
        ],
      },
    };

    const patchResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!patchResponse.ok) {
      const error = await patchResponse.text();
      throw new Error(`Failed to update: ${patchResponse.status} ${error}`);
    }

    const updated = await patchResponse.json();
    console.log(`✅ Assistant updated successfully!\n`);

    // Confirm
    console.log('📊 Updated Assistant:');
    console.log(`  Name: ${updated.name}`);
    console.log(`  Model: ${updated.model?.provider} ${updated.model?.model}`);
    console.log(`  Tools: ${updated.model?.toolIds?.length || 0} attached`);
    console.log(`  Prompt: Updated with booking workflow\n`);

    console.log('✨ Assistant is now ready to:\n');
    console.log('  1️⃣  Build rapport with callers');
    console.log('  2️⃣  Check available meeting times (check_availability)');
    console.log('  3️⃣  Book confirmed appointments (book_meeting)');
    console.log('  4️⃣  Guide the conversation toward scheduling\n');

    console.log('📌 Test it with a call to verify the booking flow works!\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updatePrompt();
