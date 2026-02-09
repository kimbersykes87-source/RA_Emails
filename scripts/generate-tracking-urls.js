/**
 * Generate Tracking URLs for Mail Merge
 * 
 * This script reads the Email_Campaign_2026 sheet and generates
 * unique tracking URLs for each recipient for use in mail merge.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';

// Simple base64url encoding
function encodeEmail(email) {
  return Buffer.from(email.toLowerCase()).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Read the cleaned contacts CSV
function readContactsCSV() {
  const csvPath = path.join(__dirname, '../assets/contacts-cleaned.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  
  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    const email = columns[4]; // Email is column 5 (index 4)
    
    if (email && email.includes('@')) {
      contacts.push({
        firstName: columns[0],
        lastName: columns[1],
        email: email
      });
    }
  }
  
  return contacts;
}

// Generate tracking URLs for each contact
function generateTrackingURLs(contacts) {
  return contacts.map(contact => {
    const emailHash = encodeEmail(contact.email);
    const pixelUrl = `${WORKER_URL}/p/${emailHash}.gif`;
    const clickUrl = `${WORKER_URL}/c/${emailHash}/soi_form`;
    
    return {
      ...contact,
      pixelUrl,
      clickUrl
    };
  });
}

// Generate CSV with tracking URLs for import
function generateTrackingCSV(contactsWithUrls) {
  const headers = ['Email', 'First Name', 'Last Name', 'PIXEL_TRACKING_URL', 'CLICK_TRACKING_URL'];
  const rows = contactsWithUrls.map(c => [
    c.email,
    c.firstName,
    c.lastName,
    c.pixelUrl,
    c.clickUrl
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csv;
}

// Main execution
function main() {
  console.log('📧 Generating Tracking URLs for Mail Merge\n');
  
  // Read contacts
  const contacts = readContactsCSV();
  console.log(`✓ Found ${contacts.length} contacts\n`);
  
  // Generate tracking URLs
  const contactsWithUrls = generateTrackingURLs(contacts);
  console.log(`✓ Generated tracking URLs for ${contactsWithUrls.length} contacts\n`);
  
  // Save as CSV
  const csv = generateTrackingCSV(contactsWithUrls);
  const outputPath = path.join(__dirname, '../assets/tracking-urls.csv');
  fs.writeFileSync(outputPath, csv);
  console.log(`✓ Saved tracking URLs to: ${outputPath}\n`);
  
  // Show sample
  console.log('📊 Sample (first 3 contacts):\n');
  contactsWithUrls.slice(0, 3).forEach((c, i) => {
    console.log(`${i + 1}. ${c.firstName} ${c.lastName} <${c.email}>`);
    console.log(`   Pixel: ${c.pixelUrl}`);
    console.log(`   Click: ${c.clickUrl}\n`);
  });
  
  console.log('🎯 Next Steps:');
  console.log('   1. Open your Google Sheet: Email_Campaign_2026');
  console.log('   2. Add two new columns: PIXEL_TRACKING_URL, CLICK_TRACKING_URL');
  console.log('   3. Import tracking-urls.csv to populate those columns');
  console.log('   4. Install YAMM (Yet Another Mail Merge) from Google Workspace Marketplace');
  console.log('   5. Use invitation-2026-final.html as your template');
  console.log('   6. Map {{PIXEL_TRACKING_URL}} and {{CLICK_TRACKING_URL}} in YAMM');
  console.log('   7. Send!');
}

main();

