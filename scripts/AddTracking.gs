/**
 * Add Tracking URLs to Email_Campaign_2026 Sheet
 * Uses config.gs (TRACKING_CAMPAIGN_COLS, TRACKING_WORKER_URL) only.
 * Run this once to generate unique tracking URLs for each contact.
 */

function addTrackingUrls() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRACKING_CAMPAIGN_COLS.SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "' + TRACKING_CAMPAIGN_COLS.SHEET_NAME + '" not found');
    return;
  }

  sheet.getRange(1, TRACKING_CAMPAIGN_COLS.PIXEL_URL).setValue('PIXEL_TRACKING_URL');
  sheet.getRange(1, TRACKING_CAMPAIGN_COLS.CLICK_URL).setValue('CLICK_TRACKING_URL');

  const data = sheet.getDataRange().getValues();
  let processedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const email = data[i][TRACKING_CAMPAIGN_COLS.EMAIL - 1];

    if (!email || !email.includes('@')) {
      continue;
    }

    const emailHash = Utilities.base64Encode(email.toLowerCase())
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const pixelUrl = TRACKING_WORKER_URL + '/p/' + emailHash + '.gif';
    const clickUrl = TRACKING_WORKER_URL + '/c/' + emailHash + '/soi_form';

    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.PIXEL_URL).setValue(pixelUrl);
    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.CLICK_URL).setValue(clickUrl);

    processedCount++;
  }

  SpreadsheetApp.getUi().alert('Generated tracking URLs for ' + processedCount + ' contacts');
}

