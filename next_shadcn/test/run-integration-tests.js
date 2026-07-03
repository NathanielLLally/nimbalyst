#!/usr/bin/env node

/**
 * Run all CJS integration tests
 * These require the dev server to be running
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = __dirname;
const integrationTests = [
  'test-contact-form.js',
  'test-contact-sms-booking.js',
  'test-google-sheets.js',
  'test-vapi-contact-tracker.js',
  'test-vapi-tools.js',
];

const availableTests = integrationTests.filter(test =>
  fs.existsSync(path.join(testDir, test))
);

if (availableTests.length === 0) {
  console.log('No integration tests found.');
  process.exit(0);
}

console.log(`\n🧪 Running ${availableTests.length} integration test(s)...\n`);

let passed = 0;
let failed = 0;

const runTest = (index) => {
  if (index >= availableTests.length) {
    console.log(`\n✅ Integration tests complete: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const testFile = availableTests[index];
  const testPath = path.join(testDir, testFile);

  console.log(`Running: ${testFile}`);

  const proc = spawn('node', [testPath], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  proc.on('close', (code) => {
    if (code === 0) {
      passed++;
    } else {
      failed++;
      console.log(`❌ ${testFile} failed with code ${code}\n`);
    }
    runTest(index + 1);
  });

  proc.on('error', (err) => {
    console.error(`Error running ${testFile}:`, err.message);
    failed++;
    runTest(index + 1);
  });
};

runTest(0);
