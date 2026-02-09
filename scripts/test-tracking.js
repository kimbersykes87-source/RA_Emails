/**
 * Test script for email tracking system
 * Run: node test-tracking.js
 */

// Email encoding/decoding functions
function encodeEmail(email) {
  const encoded = Buffer.from(email).toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeEmail(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

// Test pixel URL
function generatePixelUrl(email, domain = 'track.rubberarmstrong.com') {
  const hash = encodeEmail(email);
  return `https://${domain}/p/${hash}.gif`;
}

// Test click URL
function generateClickUrl(email, linkId = 'soi_form', domain = 'track.rubberarmstrong.com') {
  const hash = encodeEmail(email);
  return `https://${domain}/c/${hash}/${linkId}`;
}

// Main test
async function test() {
  console.log('🧪 Email Tracking Test Script\n');
  
  // Get command from args
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  if (command === 'encode') {
    if (!arg1) {
      console.error('Usage: node test-tracking.js encode <email>');
      console.log('Example: node test-tracking.js encode test@example.com');
      process.exit(1);
    }
    
    const email = arg1;
    const hash = encodeEmail(email);
    
    console.log('Email:', email);
    console.log('Hash:', hash);
    console.log('\nTracking Pixel URL:');
    console.log(generatePixelUrl(email));
    console.log('\nClick Tracking URL:');
    console.log(generateClickUrl(email));
    
  } else if (command === 'decode') {
    if (!arg1) {
      console.error('Usage: node test-tracking.js decode <hash>');
      process.exit(1);
    }
    
    const hash = arg1;
    try {
      const email = decodeEmail(hash);
      console.log('Hash:', hash);
      console.log('Email:', email);
    } catch (error) {
      console.error('Error decoding:', error.message);
    }
    
  } else if (command === 'pixel') {
    if (!arg1) {
      console.error('Usage: node test-tracking.js pixel <email> [domain]');
      process.exit(1);
    }
    
    const email = arg1;
    const domain = arg2 || 'track.rubberarmstrong.com';
    const url = generatePixelUrl(email, domain);
    
    console.log('Testing pixel URL:\n', url);
    console.log('\nFetching...');
    
    try {
      const response = await fetch(url);
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Size:', response.headers.get('content-length'), 'bytes');
      
      if (response.status === 200) {
        console.log('\n✅ Pixel loaded successfully!');
      } else {
        console.log('\n❌ Unexpected status code');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
    
  } else if (command === 'click') {
    if (!arg1) {
      console.error('Usage: node test-tracking.js click <email> [linkId] [domain]');
      process.exit(1);
    }
    
    const email = arg1;
    const linkId = arg2 || 'soi_form';
    const domain = process.argv[5] || 'track.rubberarmstrong.com';
    const url = generateClickUrl(email, linkId, domain);
    
    console.log('Testing click URL:\n', url);
    console.log('\nFetching (should redirect)...');
    
    try {
      const response = await fetch(url, { redirect: 'manual' });
      console.log('Status:', response.status);
      console.log('Location:', response.headers.get('location'));
      
      if (response.status === 302) {
        console.log('\n✅ Click tracking working! Redirects to:');
        console.log(response.headers.get('location'));
      } else {
        console.log('\n❌ Expected 302 redirect');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
    
  } else if (command === 'batch') {
    if (!arg1) {
      console.error('Usage: node test-tracking.js batch <file.txt>');
      console.log('File should contain one email per line');
      process.exit(1);
    }
    
    const fs = require('fs');
    const emails = fs.readFileSync(arg1, 'utf-8').split('\n').filter(e => e.trim());
    
    console.log(`Processing ${emails.length} emails...\n`);
    
    emails.forEach((email, i) => {
      const hash = encodeEmail(email.trim());
      console.log(`${i + 1}. ${email}`);
      console.log(`   Hash: ${hash}`);
      console.log(`   Pixel: https://track.rubberarmstrong.com/p/${hash}.gif`);
      console.log(`   Click: https://track.rubberarmstrong.com/c/${hash}/soi_form\n`);
    });
    
  } else if (command === 'template') {
    if (!arg1 || !arg2) {
      console.error('Usage: node test-tracking.js template <firstName> <email>');
      console.log('Generates a test email with tracking');
      process.exit(1);
    }
    
    const firstName = arg1;
    const email = arg2;
    const hash = encodeEmail(email);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Email</title>
</head>
<body>
  <p>Dear ${firstName},</p>
  <p>This is a test email with tracking.</p>
  <p><a href="https://track.rubberarmstrong.com/c/${hash}/soi_form">Click here</a></p>
  <img src="https://track.rubberarmstrong.com/p/${hash}.gif" width="1" height="1" />
</body>
</html>
    `.trim();
    
    console.log('Generated HTML:\n');
    console.log(html);
    console.log('\n\nTo use:');
    console.log('1. Copy the HTML above');
    console.log('2. Paste into Gmail compose (rich text mode)');
    console.log('3. Send to yourself');
    console.log('4. Open email and click link');
    console.log('5. Check Google Sheet for tracking updates');
    
  } else {
    console.log('Usage:');
    console.log('  node test-tracking.js encode <email>');
    console.log('  node test-tracking.js decode <hash>');
    console.log('  node test-tracking.js pixel <email> [domain]');
    console.log('  node test-tracking.js click <email> [linkId] [domain]');
    console.log('  node test-tracking.js batch <file.txt>');
    console.log('  node test-tracking.js template <firstName> <email>');
    console.log('\nExamples:');
    console.log('  node test-tracking.js encode test@example.com');
    console.log('  node test-tracking.js pixel test@example.com');
    console.log('  node test-tracking.js click test@example.com soi_form');
    console.log('  node test-tracking.js batch recipients.txt');
    console.log('  node test-tracking.js template John john@example.com');
  }
}

// Run
test().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

