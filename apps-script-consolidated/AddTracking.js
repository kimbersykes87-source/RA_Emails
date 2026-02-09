/**
 * Add Tracking URLs to Email_Campaign_2026 Sheet
 * 
 * Run this once to generate unique tracking URLs for each contact
 */

function addTrackingUrls() {
  const SHEET_NAME = 'Email_Campaign_2026';
  const EMAIL_COLUMN = 8; // Column H
  const PIXEL_URL_COLUMN = 34; // Column AH
  const CLICK_URL_COLUMN = 35; // Column AI
  const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${SHEET_NAME}" not found`);
    return;
  }
  
  // Add headers if needed
  sheet.getRange(1, PIXEL_URL_COLUMN).setValue('PIXEL_TRACKING_URL');
  sheet.getRange(1, CLICK_URL_COLUMN).setValue('CLICK_TRACKING_URL');
  
  const data = sheet.getDataRange().getValues();
  let processedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const email = data[i][EMAIL_COLUMN - 1];
    
    if (!email || !email.includes('@')) {
      continue;
    }
    
    // Generate email hash (base64url)
    const emailHash = Utilities.base64Encode(email.toLowerCase())
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const pixelUrl = `${WORKER_URL}/p/${emailHash}.gif`;
    const clickUrl = `${WORKER_URL}/c/${emailHash}/soi_form`;
    
    // Set URLs
    sheet.getRange(i + 1, PIXEL_URL_COLUMN).setValue(pixelUrl);
    sheet.getRange(i + 1, CLICK_URL_COLUMN).setValue(clickUrl);
    
    processedCount++;
  }
  
  SpreadsheetApp.getUi().alert(`✓ Generated tracking URLs for ${processedCount} contacts`);
}

