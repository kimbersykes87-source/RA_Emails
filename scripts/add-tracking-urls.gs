/**
 * Add Tracking URLs for All Email Campaigns
 *
 * Generates unique tracking URLs per contact for:
 * 1. Email_Campaign_2026: Invitation (AH–AI) + SOI Reminder (AQ–AR)
 * 2. SOI_Approved: Confirmation (AH)
 *
 * URL format:
 *   Invitation pixel:     /p/{hash}.gif
 *   Reminder pixel:       /p/{hash}/reminder.gif
 *   Confirmation pixel:   /p/{hash}/confirmation.gif
 *   Invitation click:     /c/{hash}/soi_form
 *   Reminder click:       /c/{hash}/reminder_soi_form
 *
 * Run from menu: "Tracking URLs" → "Add All Tracking URLs"
 * Or run individual functions for one tab.
 */

const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';

// Email_Campaign_2026 column indices (1-based)
const CAMPAIGN_COLS = {
  SHEET_NAME: 'Email_Campaign_2026',
  EMAIL: 8,              // H
  PIXEL_URL: 34,         // AH - Invitation
  CLICK_URL: 35,         // AI - Invitation
  REMINDER_PIXEL: 43,    // AQ - SOI Reminder
  REMINDER_CLICK: 44     // AR - SOI Reminder
};

// SOI_Approved column indices (1-based)
const APPROVED_COLS = {
  SHEET_NAME: 'SOI_Approved',
  EMAIL: 8,              // H
  CONFIRMATION_PIXEL: 34 // AH - Confirmation
};

/**
 * Base64URL encode email for tracking hash
 */
function encodeEmailForTracking(email) {
  if (!email || !email.includes('@')) return null;
  return Utilities.base64Encode(email.toLowerCase().trim())
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Add Invitation tracking URLs to Email_Campaign_2026 (AH, AI)
 * @param {boolean} silent - if true, don't show alert
 */
function addInvitationTrackingUrls(silent) {
  const sheet = getSheet(CAMPAIGN_COLS.SHEET_NAME);
  if (!sheet) return 0;

  ensureHeaders(sheet, CAMPAIGN_COLS.PIXEL_URL, ['PIXEL_TRACKING_URL', 'CLICK_TRACKING_URL']);

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const email = data[i][CAMPAIGN_COLS.EMAIL - 1];
    const hash = encodeEmailForTracking(email);
    if (!hash) continue;

    const pixelUrl = `${WORKER_URL}/p/${hash}.gif`;
    const clickUrl = `${WORKER_URL}/c/${hash}/soi_form`;

    sheet.getRange(i + 1, CAMPAIGN_COLS.PIXEL_URL).setValue(pixelUrl);
    sheet.getRange(i + 1, CAMPAIGN_COLS.CLICK_URL).setValue(clickUrl);
    count++;
  }

  if (!silent) SpreadsheetApp.getUi().alert(`✓ Invitation: generated URLs for ${count} contacts`);
  return count;
}

/**
 * Add SOI Reminder tracking URLs to Email_Campaign_2026 (AQ, AR)
 * @param {boolean} silent - if true, don't show alert
 */
function addReminderTrackingUrls(silent) {
  const sheet = getSheet(CAMPAIGN_COLS.SHEET_NAME);
  if (!sheet) return 0;

  ensureHeaders(sheet, CAMPAIGN_COLS.REMINDER_PIXEL, ['Reminder_Pixel_URL', 'Reminder_Click_URL']);

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const email = data[i][CAMPAIGN_COLS.EMAIL - 1];
    const hash = encodeEmailForTracking(email);
    if (!hash) continue;

    const pixelUrl = `${WORKER_URL}/p/${hash}/reminder.gif`;
    const clickUrl = `${WORKER_URL}/c/${hash}/reminder_soi_form`;

    sheet.getRange(i + 1, CAMPAIGN_COLS.REMINDER_PIXEL).setValue(pixelUrl);
    sheet.getRange(i + 1, CAMPAIGN_COLS.REMINDER_CLICK).setValue(clickUrl);
    count++;
  }

  if (!silent) SpreadsheetApp.getUi().alert(`✓ SOI Reminder: generated URLs for ${count} contacts`);
  return count;
}

/**
 * Add Confirmation tracking URLs to SOI_Approved (AH)
 * @param {boolean} silent - if true, don't show alert
 */
function addConfirmationTrackingUrls(silent) {
  const sheet = getSheet(APPROVED_COLS.SHEET_NAME);
  if (!sheet) return 0;

  ensureHeaders(sheet, APPROVED_COLS.CONFIRMATION_PIXEL, ['Confirmation_Pixel_URL']);

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const email = data[i][APPROVED_COLS.EMAIL - 1];
    const hash = encodeEmailForTracking(email);
    if (!hash) continue;

    const pixelUrl = `${WORKER_URL}/p/${hash}/confirmation.gif`;

    sheet.getRange(i + 1, APPROVED_COLS.CONFIRMATION_PIXEL).setValue(pixelUrl);
    count++;
  }

  if (!silent) SpreadsheetApp.getUi().alert(`✓ Confirmation: generated URLs for ${count} contacts`);
  return count;
}

/**
 * Add all tracking URLs to both tabs (convenience)
 */
function addAllTrackingUrls() {
  const inv = addInvitationTrackingUrls(true);
  const rem = addReminderTrackingUrls(true);
  const conf = addConfirmationTrackingUrls(true);
  SpreadsheetApp.getUi().alert(
    `✓ All tracking URLs generated:\n` +
    `  Invitation: ${inv} (Email_Campaign_2026)\n` +
    `  SOI Reminder: ${rem} (Email_Campaign_2026)\n` +
    `  Confirmation: ${conf} (SOI_Approved)`
  );
}

/**
 * Get sheet by name; show alert if missing
 */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${name}" not found`);
    return null;
  }
  return sheet;
}

/**
 * Ensure header row has the given headers at the start column
 */
function ensureHeaders(sheet, startCol, headers) {
  for (let i = 0; i < headers.length; i++) {
    sheet.getRange(1, startCol + i).setValue(headers[i]);
  }
}

/**
 * To add a "Tracking URLs" menu: add these items to your existing onOpen()
 * in gmail-automation.gs, or run addAllTrackingUrls() / addInvitationTrackingUrls()
 * etc. from the script editor (Run).
 */
