#!/usr/bin/env node

/**
 * Test Contact Form Submission
 * Run: node test-contact-form.js
 */

require('dotenv').config();

async function testContactFormSubmission() {
  console.log('\n📝 Contact Form Submission Test\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const isLocalhost = baseUrl.includes('localhost');
  const endpoint = `${baseUrl}/api/contact`;

  // Test data
  const formData = {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '6464507917',
    company: 'Test Company',
    website: 'https://example.com',
    businessType: 'grooming',
    challenge: 'Need more bookings',
    message: 'We need help with marketing',
    receiveMessages: true,
    recaptchaToken: 'test-token', // Will fail reCAPTCHA but that's ok for testing
    timezone: 'America/New_York',
    submittedAt: new Date().toISOString(),
  };

  console.log('📤 Test Data:');
  console.log(`  Name: ${formData.fullName}`);
  console.log(`  Email: ${formData.email}`);
  console.log(`  Phone: ${formData.phone}`);
  console.log(`  Company: ${formData.company}`);
  console.log(`  Timezone: ${formData.timezone}`);

  console.log(`\n🚀 Submitting to: ${endpoint}`);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Skip reCAPTCHA on localhost by setting host header
    if (isLocalhost) {
      headers['host'] = 'localhost:3000';
      console.log('\n💡 Testing on localhost - reCAPTCHA verification will be skipped\n');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📋 Response Body:`, JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Form submission successful!');
      if (data.contactId) {
        console.log(`   Contact ID: ${data.contactId}`);
      }
      return true;
    } else {
      console.log('\n❌ Form submission failed!');
      if (data.error) {
        console.log(`   Error: ${data.error}`);
      }
      return false;
    }
  } catch (error) {
    console.error('\n❌ Request failed!');
    console.error(`   Error: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.error(`   → Server not running at ${baseUrl}`);
    }

    return false;
  }
}

testContactFormSubmission().then(success => {
  process.exit(success ? 0 : 1);
});
