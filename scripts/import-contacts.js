/**
 * Import Contacts to Google Sheet with Email Tracking Setup
 * 
 * This script reads the contacts CSV and prepares data for import
 * into the Google Sheet with tracking URLs pre-generated.
 */

const fs = require('fs');
const path = require('path');

// Simple base64url encoding (like the worker uses)
function encodeEmail(email) {
  return Buffer.from(email.toLowerCase()).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Configuration
const TRACKING_DOMAIN = 'https://track.rubberarmstrong.com'; // Will use workers.dev for now until DNS propagates
const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';

// Read and parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const contact = {};
    headers.forEach((header, index) => {
      contact[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    // Only include if there's an email
    if (contact['Email']) {
      contacts.push(contact);
    }
  }
  
  return contacts;
}

// Map CSV to Google Sheet format
function mapToSheetFormat(contact) {
  const email = contact['Email'].toLowerCase();
  const hash = encodeEmail(email);
  
  return {
    // Original fields
    'Timestamp': '', // Will be filled when email is sent
    'First': contact['First Name'] || '',
    'Last': contact['Last Name'] || '',
    'Sex': '', // Not in CSV
    'Birth Year': contact['Birthday'] ? contact['Birthday'].split('-')[0] : '',
    'Country (Birth)': '', // Not in CSV
    'Country (Res)': '', // Not in CSV
    'Email': email,
    'Phone Code': '', // Would need to parse from phone
    'Phone': contact['Phone 1'] || '',
    'Ref. Campmate': '', // Not in CSV
    'Burns (RA)': '', // Not in CSV
    'Burns (RA) Count': '', // Not in CSV
    'Burns (Other)': '', // Not in CSV
    'Burns (Other) Count': '', // Not in CSV
    'First Burn?': '', // Not in CSV
    'Likelihood': '', // Not in CSV
    'Steward Ticket?': contact['Steward_Interest'] || '',
    'What Offer': '', // Not in CSV
    'Notes': contact['Notes'] || '',
    'Status': '', // Not in CSV - will default to staging
    'Reviewed By': '', // Not in CSV
    'Reviewed At': '', // Not in CSV
    'Internal Notes': '', // Not in CSV
    'Form': '', // Not in CSV
    'Synced to Contacts': 'No',
    
    // NEW: Email Tracking fields
    'Email Sent': 'No',
    'Email Sent At': '',
    'Email Opened': 'No',
    'First Open At': '',
    'Open Count': '0',
    'Link Clicked': 'No',
    'First Click At': '',
    
    // EXTRA: Tracking URLs (not in sheet, just for reference)
    '_email_hash': hash,
    '_pixel_url': `${WORKER_URL}/p/${hash}.gif`,
    '_click_url': `${WORKER_URL}/c/${hash}/soi_form`
  };
}

// Generate TSV for easy paste into Google Sheets
function generateTSV(contacts) {
  const headers = [
    'Timestamp', 'First', 'Last', 'Sex', 'Birth Year', 'Country (Birth)', 'Country (Res)',
    'Email', 'Phone Code', 'Phone', 'Ref. Campmate', 'Burns (RA)', 'Burns (RA) Count',
    'Burns (Other)', 'Burns (Other) Count', 'First Burn?', 'Likelihood', 'Steward Ticket?',
    'What Offer', 'Notes', 'Status', 'Reviewed By', 'Reviewed At', 'Internal Notes',
    'Form', 'Synced to Contacts', 'Email Sent', 'Email Sent At', 'Email Opened',
    'First Open At', 'Open Count', 'Link Clicked', 'First Click At'
  ];
  
  const rows = contacts.map(contact => {
    return headers.map(header => {
      const value = contact[header] || '';
      // Escape tabs and newlines
      return value.toString().replace(/\t/g, ' ').replace(/\n/g, ' ');
    }).join('\t');
  });
  
  return [headers.join('\t'), ...rows].join('\n');
}

// Generate email tracking reference
function generateTrackingReference(contacts) {
  const reference = contacts.map(contact => {
    return {
      email: contact['Email'],
      firstName: contact['First'],
      lastName: contact['Last'],
      hash: contact['_email_hash'],
      pixelUrl: contact['_pixel_url'],
      clickUrl: contact['_click_url']
    };
  });
  
  return reference;
}

// Main execution
function main() {
  console.log('📧 Contact Import & Tracking Setup\n');
  
  // Read CSV
  const csvPath = path.join(__dirname, '../assets/contacts-cleaned.csv');
  console.log(`Reading contacts from: ${csvPath}`);
  
  const contacts = parseCSV(csvPath);
  console.log(`✓ Parsed ${contacts.length} contacts with emails\n`);
  
  // Map to sheet format
  const mappedContacts = contacts.map(mapToSheetFormat);
  console.log(`✓ Mapped contacts to Google Sheet format\n`);
  
  // Generate TSV for import
  const tsv = generateTSV(mappedContacts);
  const tsvPath = path.join(__dirname, '../assets/import-ready.tsv');
  fs.writeFileSync(tsvPath, tsv);
  console.log(`✓ Generated TSV file: ${tsvPath}\n`);
  
  // Generate tracking reference
  const trackingRef = generateTrackingReference(mappedContacts);
  const refPath = path.join(__dirname, '../assets/tracking-reference.json');
  fs.writeFileSync(refPath, JSON.stringify(trackingRef, null, 2));
  console.log(`✓ Generated tracking reference: ${refPath}\n`);
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Total contacts: ${contacts.length}`);
  console.log(`   Ready for import: ${mappedContacts.length}`);
  console.log(`\n🎯 Next Steps:`);
  console.log(`   1. Open the Google Sheet`);
  console.log(`   2. Update Config.gs in Apps Script (already done!)`);
  console.log(`   3. Run setupAllTabs() to create Email_Campaign_2026 tab`);
  console.log(`   4. Go to Email_Campaign_2026 tab`);
  console.log(`   5. Select cell A2 (first row after headers)`);
  console.log(`   6. Open: ${tsvPath}`);
  console.log(`   7. Copy all contents (Ctrl+A, Ctrl+C)`);
  console.log(`   8. Paste into Google Sheet (Ctrl+V)`);
  console.log(`   9. All 290 contacts ready with tracking!`);
}

// Run it
main();

