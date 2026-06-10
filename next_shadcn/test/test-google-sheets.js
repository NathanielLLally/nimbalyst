#!/usr/bin/env node

/**
 * Test Google Sheets credentials from .env
 * Run: node test-google-sheets.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testGoogleSheetsAuth() {
  console.log('\n📋 Google Sheets Credential Test\n');

  // Check env vars
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  console.log('✓ Checking environment variables...');
  console.log(`  - GOOGLE_SERVICE_ACCOUNT_EMAIL: ${email ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  - GOOGLE_PRIVATE_KEY: ${key ? '✅ SET' : '❌ MISSING'} (${key ? key.length : 0} chars)`);
  console.log(`  - GOOGLE_SHEET_ID: ${sheetId ? '✅ SET' : '❌ MISSING'}`);

  if (!email || !key || !sheetId) {
    console.error('\n❌ Missing required environment variables!');
    process.exit(1);
  }

  // Check private key format
  console.log('\n✓ Checking private key format...');
  if (key.includes('\\n')) {
    console.log('  ⚠️  Private key contains literal \\n (good for .env files)');
  } else if (key.includes('\n')) {
    console.log('  ⚠️  Private key contains actual newlines');
  }

  // Try to authenticate
  console.log('\n✓ Testing authentication...');
  try {
    const formattedKey = key.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: email,
        private_key: formattedKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Try to read the sheet
    console.log('  📍 Attempting to read spreadsheet...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    console.log('  ✅ Authentication successful!');
    console.log(`  📊 Sheet title: "${response.data.properties.title}"`);
    console.log(`  📑 Sheets in workbook: ${response.data.sheets.length}`);

    // List sheets
    console.log('\n✓ Available sheets:');
    response.data.sheets.forEach((sheet, idx) => {
      console.log(`  ${idx + 1}. ${sheet.properties.title}`);
    });

    // Try to append a test row
    console.log('\n✓ Testing write access (will append test row)...');
    const testRow = [
      'TEST_' + new Date().toISOString(),
      'test@example.com',
      'Test Contact',
    ];

    try {
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:C',
        valueInputOption: 'RAW',
        requestBody: { values: [testRow] },
      });

      console.log('  ✅ Write access confirmed!');
      console.log(`  📝 Test row appended to: ${appendResponse.data.updates.updatedRange}`);
    } catch (writeErr) {
      console.error(`  ❌ Write failed: ${writeErr.message}`);
      if (writeErr.status === 403) {
        console.error('     → Service account doesn\'t have Editor permission on this sheet');
      } else if (writeErr.status === 404) {
        console.error('     → Sheet ID not found or sheet name incorrect');
      }
    }

    console.log('\n✅ All tests passed!\n');
  } catch (err) {
    console.error('\n❌ Authentication failed!');
    console.error(`   Error: ${err.message}`);

    if (err.status === 401) {
      console.error('   → Invalid credentials. Check GOOGLE_PRIVATE_KEY format');
    } else if (err.status === 403) {
      console.error('   → Permission denied. Service account needs access');
    } else if (err.status === 404) {
      console.error('   → Sheet not found. Check GOOGLE_SHEET_ID');
    }

    process.exit(1);
  }
}

testGoogleSheetsAuth();
