#!/usr/bin/env node

/**
 * Add header row to contact_tracking sheet
 */

require('dotenv').config();
const { google } = require('googleapis');

async function addHeaderRow() {
  console.log('\n📝 Adding header row to contact_tracking sheet\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.SHEET_NAME || 'contact_tracking';

  try {
    // Get the sheet ID by name
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const sheetsApiId = sheet.properties.sheetId;

    console.log(`📊 Found sheet: ${sheetName} (ID: ${sheetsApiId})`);

    // Insert a row at the top
    console.log('📍 Inserting row at top...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetsApiId,
                dimension: 'ROWS',
                startIndex: 0,
                endIndex: 1,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });

    // Add header values
    const headers = [
      'ID',
      'Phone',
      'Name',
      'Channel',
      'Status',
      'Attempt Count',
      'Submitted',
      'Last Attempt',
      'Next Retry',
      'Resolved',
      'Vapi Call ID',
      'Notes'
    ];

    console.log('📝 Writing headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    console.log('✅ Header row added successfully!\n');
    console.log('Headers:');
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      console.log(`  ${col}: ${h}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addHeaderRow();
