/**
 * Rubber Armstrong Email Campaign - Gmail Automation
 * 
 * This Google Apps Script sends personalized emails with tracking
 * directly from Gmail, with built-in spam prevention.
 * 
 * USAGE:
 * 1. Copy this code to Apps Script (Extensions → Apps Script)
 * 2. Set SHEET_NAME to your tab name
 * 3. Update EMAIL_TEMPLATE with your HTML
 * 4. Run sendEmailCampaign() to send batch
 * 5. Or set up time-based trigger for automatic sending
 */

// ============================================================================
// CONFIGURATION - defined in config.gs (EMAIL_CONFIG, REMINDER_CONFIG,
// CONFIRMATION_CONFIG, TEST_EMAIL, TRACKING_*)
// ============================================================================

function encodeEmailForTracking(email) {
  if (!email || !email.includes('@')) return null;
  return Utilities.base64Encode(email.toLowerCase().trim())
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function getTrackingSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "' + name + '" not found');
    return null;
  }
  return sheet;
}

function ensureTrackingHeaders(sheet, startCol, headers) {
  for (var i = 0; i < headers.length; i++) {
    sheet.getRange(1, startCol + i).setValue(headers[i]);
  }
}

function addInvitationTrackingUrls(silent) {
  var sheet = getTrackingSheet(TRACKING_CAMPAIGN_COLS.SHEET_NAME);
  if (!sheet) return 0;
  ensureTrackingHeaders(sheet, TRACKING_CAMPAIGN_COLS.PIXEL_URL, ['PIXEL_TRACKING_URL', 'CLICK_TRACKING_URL']);
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var email = data[i][TRACKING_CAMPAIGN_COLS.EMAIL - 1];
    var hash = encodeEmailForTracking(email);
    if (!hash) continue;
    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.PIXEL_URL).setValue(TRACKING_WORKER_URL + '/p/' + hash + '.gif');
    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.CLICK_URL).setValue(TRACKING_WORKER_URL + '/c/' + hash + '/soi_form');
    count++;
  }
  if (!silent) SpreadsheetApp.getUi().alert('Invitation: generated URLs for ' + count + ' contacts');
  return count;
}

function addReminderTrackingUrls(silent) {
  var sheet = getTrackingSheet(TRACKING_CAMPAIGN_COLS.SHEET_NAME);
  if (!sheet) return 0;
  ensureTrackingHeaders(sheet, TRACKING_CAMPAIGN_COLS.REMINDER_PIXEL, ['Reminder_Pixel_URL', 'Reminder_Click_URL']);
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var email = data[i][TRACKING_CAMPAIGN_COLS.EMAIL - 1];
    var hash = encodeEmailForTracking(email);
    if (!hash) continue;
    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.REMINDER_PIXEL).setValue(TRACKING_WORKER_URL + '/p/' + hash + '/reminder.gif');
    sheet.getRange(i + 1, TRACKING_CAMPAIGN_COLS.REMINDER_CLICK).setValue(TRACKING_WORKER_URL + '/c/' + hash + '/reminder_soi_form');
    count++;
  }
  if (!silent) SpreadsheetApp.getUi().alert('SOI Reminder: generated URLs for ' + count + ' contacts');
  return count;
}

function addConfirmationTrackingUrls(silent) {
  var sheet = getTrackingSheet(TRACKING_APPROVED_COLS.SHEET_NAME);
  if (!sheet) return 0;
  ensureTrackingHeaders(sheet, TRACKING_APPROVED_COLS.CONFIRMATION_PIXEL, ['Confirmation_Pixel_URL']);
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var email = data[i][TRACKING_APPROVED_COLS.EMAIL - 1];
    var hash = encodeEmailForTracking(email);
    if (!hash) continue;
    sheet.getRange(i + 1, TRACKING_APPROVED_COLS.CONFIRMATION_PIXEL).setValue(TRACKING_WORKER_URL + '/p/' + hash + '/confirmation.gif');
    count++;
  }
  if (!silent) SpreadsheetApp.getUi().alert('Confirmation: generated URLs for ' + count + ' contacts');
  return count;
}

function addAllTrackingUrls() {
  var inv = addInvitationTrackingUrls(true);
  var rem = addReminderTrackingUrls(true);
  var conf = addConfirmationTrackingUrls(true);
  SpreadsheetApp.getUi().alert(
    'All tracking URLs generated:\n' +
    '  Invitation: ' + inv + ' (Email_Campaign_2026)\n' +
    '  SOI Reminder: ' + rem + ' (Email_Campaign_2026)\n' +
    '  Confirmation: ' + conf + ' (SOI_Approved)'
  );
}

/**
 * Add required columns and headers for Reminder & Confirmation campaigns.
 * Run once to prepare the sheet structure.
 */
function setupSheetColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];

  // Email_Campaign_2026: ensure columns AJ (36) through AR (44) exist
  var campaignSheet = ss.getSheetByName('Email_Campaign_2026');
  if (campaignSheet) {
    var lastCol = campaignSheet.getLastColumn();
    if (lastCol < 44) {
      campaignSheet.insertColumnsAfter(lastCol, 44 - lastCol);
      report.push('Email_Campaign_2026: added ' + (44 - lastCol) + ' columns');
    }
    // Set Reminder headers (AJ=36 through AR=44)
    var reminderHeaders = [
      'Reminder_Sent', 'Reminder_Sent_At', 'Reminder_Opened', 'Reminder_First_Open_At',
      'Reminder_Open_Count', 'Reminder_Clicked', 'Reminder_First_Click_At',
      'Reminder_Pixel_URL', 'Reminder_Click_URL'
    ];
    campaignSheet.getRange(1, 36, 1, 36 + reminderHeaders.length - 1).setValues([reminderHeaders]);
    report.push('Email_Campaign_2026: set Reminder headers (AJ-AR)');
  } else {
    report.push('Email_Campaign_2026: sheet not found');
  }

  // SOI_Approved: ensure column AH (34) exists
  var approvedSheet = ss.getSheetByName('SOI_Approved');
  if (approvedSheet) {
    var lastColApproved = approvedSheet.getLastColumn();
    if (lastColApproved < 34) {
      approvedSheet.insertColumnsAfter(lastColApproved, 34 - lastColApproved);
      report.push('SOI_Approved: added ' + (34 - lastColApproved) + ' columns');
    }
    // Set Confirmation headers (AA-AE to Confirmation_*, AH for pixel URL)
    var confirmationHeaders = [
      'Confirmation_Sent', 'Confirmation_Sent_At', 'Confirmation_Opened',
      'Confirmation_First_Open_At', 'Confirmation_Open_Count',
      'Link Clicked', 'First Click At',  // AF, AG - unused, keep or rename
      'Confirmation_Pixel_URL'
    ];
    approvedSheet.getRange(1, 27, 1, 34).setValues([confirmationHeaders]);
    report.push('SOI_Approved: set Confirmation headers (AA-AH)');
  } else {
    report.push('SOI_Approved: sheet not found');
  }

  SpreadsheetApp.getUi().alert('Sheet setup complete:\n\n' + report.join('\n'));
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

/**
 * Get plain text version of email
 */
function getPlainTextTemplate(firstName, clickUrl) {
  return `Hello past, present and future Rubbers,

Placement has given us the nod again. Rubber Armstrong is in good standing for the 10th year running.

Our Statement of Intent for Burning Man 2026 is submitted, and we are planning to return. We have also requested 40 Steward Sale tickets.

We are in advanced talks with a tent manufacturer on a new run of tents with serious upgrades. That means we will have around 25 existing Rubber Armstrong tents available for sale. If you know another camp that could use proven shelter, reach out to us at rubberarmstrongcamp@gmail.com.

We have been going through the post playa survey properly, and the changes are already being built into 2026 and we are working on some exciting upgrades.

If you're interested in joining us for 2026, please complete the Statement of Intent form. If you know someone that you think would be a good fit with our fam, feel free to forward them this invite.

About the Statement of Intent: This is a brief form (about 5 minutes) that helps us understand who you are, what you bring to the camp, and your interest in joining. It's not a ticket, not a guarantee of placement, but the first step in our process. Submissions are reviewed manually, and we'll contact approved applicants after major ticket sales conclude (typically mid-to-late March). If you're interested in potentially receiving a Steward Sale ticket allocation, indicate this in your SOI. Note: Expressing interest does not guarantee a ticket.

Complete Statement of Intent: ${clickUrl}

Use the questions at the end to tell us if you are keen to step into a new role within camp, if you can come help in August either at the yard or on playa, and if you are new to Rubber Armstrong then introduce yourself and share what you would bring to the crew.

Dusty hugs,
Rubber Armstrong
rubberarmstrong.com

Sent by Rubber Armstrong Camp for Burning Man 2026
Unsubscribe: mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please`;
}

function getEmailTemplate(firstName, pixelUrl, clickUrl) {
  // Standard greeting for all recipients
  const greeting = 'Hello past, present and future Rubbers,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <h2 style="color: #000; margin-top: 0;">${greeting}</h2>
    
    <p style="margin-bottom: 16px;">Placement has given us the nod again. Rubber Armstrong is in good standing for the 10th year running.</p>
    
    <p style="margin-bottom: 16px;">Our Statement of Intent for Burning Man 2026 is submitted, and we are planning to return. We have also requested 40 Steward Sale tickets.</p>
    
    <p style="margin-bottom: 16px;">We are in advanced talks with a tent manufacturer on a new run of tents with serious upgrades. That means we will have around 25 existing Rubber Armstrong tents available for sale. If you know another camp that could use proven shelter, reach out to us at rubberarmstrongcamp@gmail.com.</p>
    
    <p style="margin-bottom: 16px;">We have been going through the post playa survey properly, and the changes are already being built into 2026 and we are working on some exciting upgrades.</p>
    
    <p style="margin-bottom: 16px;">If you're interested in joining us for 2026, please complete the Statement of Intent form. If you know someone that you think would be a good fit with our fam, feel free to forward them this invite.</p>
    
    <p style="margin-bottom: 16px; font-size: 14px; color: #666; background-color: #f9f9f9; padding: 12px; border-left: 3px solid #000;">
      <strong>About the Statement of Intent:</strong> This is a brief form (about 5 minutes) that helps us understand who you are, what you bring to the camp, and your interest in joining. It's not a ticket, not a guarantee of placement, but the first step in our process. Submissions are reviewed manually, and we'll contact approved applicants after major ticket sales conclude (typically mid-to-late March). If you're interested in potentially receiving a Steward Sale ticket allocation, indicate this in your SOI. Note: Expressing interest does not guarantee a ticket.
    </p>
    
    <div style="margin: 40px 0; text-align: center;">
      <a href="${clickUrl}" 
         style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Complete Statement of Intent
      </a>
    </div>
    
    <p style="margin-bottom: 16px;">Use the questions at the end to tell us if you are keen to step into a new role within camp, if you can come help in August either at the yard or on playa, and if you are new to Rubber Armstrong then introduce yourself and share what you would bring to the crew.</p>
    
    <p style="margin-top: 40px; margin-bottom: 4px;">Dusty hugs,</p>
    
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; margin-bottom: 0;">
      <tr>
        <td style="padding-right: 15px; vertical-align: middle;">
          <img src="https://raw.githubusercontent.com/kimbersykes87-source/RA_Website/main/camp_assets/logos/RA-Full-Logo-Black-on-Clear.png" 
               alt="Rubber Armstrong Logo" 
               width="80" 
               height="80"
               style="display: block; border: 0;">
        </td>
        <td style="vertical-align: middle; border-left: 2px solid #000; padding-left: 15px;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #000;">Rubber Armstrong</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;">
            <a href="https://rubberarmstrong.com/" 
               style="color: #666; text-decoration: none;">
              rubberarmstrong.com
            </a>
          </p>
        </td>
      </tr>
    </table>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0 20px 0;">
    
    <div style="font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
      <p style="margin: 8px 0;">Sent by Rubber Armstrong Camp for Burning Man 2026</p>
      <p style="margin: 8px 0;">
        <a href="mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please&body=Please%20remove%20me%20from%20the%20Rubber%20Armstrong%20mailing%20list." 
           style="color: #666; text-decoration: underline;">
          Unsubscribe
        </a>
      </p>
    </div>
    
  </div>
  
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;opacity:0;position:absolute;" />
  
</body>
</html>
  `.trim();
}

/**
 * SOI Reminder template (matches invitation layout)
 */
function getSOIReminderTemplate(firstName, pixelUrl, clickUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #000; margin-top: 0;">Hello past, present and future Rubbers,</h2>
    <p style="margin-bottom: 16px;">A quick reminder: we sent you an invitation to complete the Statement of Intent for Rubber Armstrong at Burning Man 2026.</p>
    <p style="margin-bottom: 16px;">If you haven't submitted yet and would like to join us for our 10th year, please take a few minutes to complete the form. It helps us understand who you are, what you bring to the camp, and your interest in joining.</p>
    <p style="margin-bottom: 16px;">Submissions are reviewed manually. We'll contact approved applicants after major ticket sales conclude (typically mid-to-late March).</p>
    <div style="margin: 40px 0; text-align: center;">
      <a href="${clickUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Complete Statement of Intent</a>
    </div>
    <p style="margin-top: 40px; margin-bottom: 4px;">Dusty hugs,</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; margin-bottom: 0;">
      <tr>
        <td style="padding-right: 15px; vertical-align: middle;">
          <img src="https://raw.githubusercontent.com/kimbersykes87-source/RA_Website/main/camp_assets/logos/RA-Full-Logo-Black-on-Clear.png" alt="Rubber Armstrong Logo" width="80" height="80" style="display: block; border: 0;">
        </td>
        <td style="vertical-align: middle; border-left: 2px solid #000; padding-left: 15px;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #000;">Rubber Armstrong</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;"><a href="https://rubberarmstrong.com/" style="color: #666; text-decoration: none;">rubberarmstrong.com</a></p>
        </td>
      </tr>
    </table>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0 20px 0;">
    <div style="font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
      <p style="margin: 8px 0;">Sent by Rubber Armstrong Camp for Burning Man 2026</p>
      <p style="margin: 8px 0;"><a href="mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please&body=Please%20remove%20me%20from%20the%20Rubber%20Armstrong%20mailing%20list." style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
    </div>
  </div>
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;opacity:0;position:absolute;" />
</body>
</html>
  `.trim();
}

function getPlainTextReminderTemplate(clickUrl) {
  return `Hello past, present and future Rubbers,

A quick reminder: we sent you an invitation to complete the Statement of Intent for Rubber Armstrong at Burning Man 2026.

If you haven't submitted yet and would like to join us for our 10th year, please take a few minutes to complete the form.

Complete Statement of Intent: ${clickUrl}

Dusty hugs,
Rubber Armstrong
rubberarmstrong.com

Sent by Rubber Armstrong Camp for Burning Man 2026
Unsubscribe: mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please`;
}

/**
 * Confirmation template (no CTA)
 */
function getConfirmationTemplate(firstName, pixelUrl) {
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #000; margin-top: 0;">${greeting}</h2>
    <p style="margin-bottom: 16px;"><strong>Congratulations!</strong> Your Statement of Intent has been approved. You're officially part of Rubber Armstrong for Burning Man 2026.</p>
    <p style="margin-bottom: 16px;">Here's what happens next:</p>
    <ul style="margin-bottom: 16px; padding-left: 24px;">
      <li><strong>Tickets:</strong> We'll be in touch about Steward Sale allocations after major ticket sales conclude (typically mid-to-late March).</li>
      <li><strong>Join form:</strong> When you're ready, complete the Join form on our website to confirm your plans and share any logistics details.</li>
      <li><strong>Stay in touch:</strong> We'll send updates as 2026 approaches—yard work, playa prep, and camp logistics.</li>
    </ul>
    <p style="margin-bottom: 16px;">If you have questions in the meantime, reach out to rubberarmstrongcamp@gmail.com.</p>
    <p style="margin-bottom: 16px;">We can't wait to welcome you back to the playa.</p>
    <p style="margin-top: 40px; margin-bottom: 4px;">Dusty hugs,</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; margin-bottom: 0;">
      <tr>
        <td style="padding-right: 15px; vertical-align: middle;">
          <img src="https://raw.githubusercontent.com/kimbersykes87-source/RA_Website/main/camp_assets/logos/RA-Full-Logo-Black-on-Clear.png" alt="Rubber Armstrong Logo" width="80" height="80" style="display: block; border: 0;">
        </td>
        <td style="vertical-align: middle; border-left: 2px solid #000; padding-left: 15px;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #000;">Rubber Armstrong</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;"><a href="https://rubberarmstrong.com/" style="color: #666; text-decoration: none;">rubberarmstrong.com</a></p>
        </td>
      </tr>
    </table>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0 20px 0;">
    <div style="font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
      <p style="margin: 8px 0;">Sent by Rubber Armstrong Camp for Burning Man 2026</p>
      <p style="margin: 8px 0;"><a href="mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please&body=Please%20remove%20me%20from%20the%20Rubber%20Armstrong%20mailing%20list." style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
    </div>
  </div>
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;opacity:0;position:absolute;" />
</body>
</html>
  `.trim();
}

function getPlainTextConfirmationTemplate() {
  return `Hello,

Congratulations! Your Statement of Intent has been approved. You're officially part of Rubber Armstrong for Burning Man 2026.

Here's what happens next:
- Tickets: We'll be in touch about Steward Sale allocations after major ticket sales conclude (typically mid-to-late March).
- Join form: When you're ready, complete the Join form on our website to confirm your plans.
- Stay in touch: We'll send updates as 2026 approaches.

If you have questions, reach out to rubberarmstrongcamp@gmail.com.

We can't wait to welcome you back to the playa.

Dusty hugs,
Rubber Armstrong
rubberarmstrong.com

Sent by Rubber Armstrong Camp for Burning Man 2026
Unsubscribe: mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe%20please`;
}

// ============================================================================
// MAIN SENDING FUNCTION
// ============================================================================

function sendEmailCampaign() {
  // Use LockService to prevent concurrent executions
  const lock = LockService.getScriptLock();
  
  try {
    // Try to acquire lock (wait up to 10 seconds)
    if (!lock.tryLock(10000)) {
      SpreadsheetApp.getUi().alert('Another send operation is in progress. Please wait and try again.');
      Logger.log('Send operation blocked - another instance is running');
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${EMAIL_CONFIG.SHEET_NAME}" not found`);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let sentCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    // Check daily quota at start
    let quotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log(`Gmail quota remaining today: ${quotaRemaining}`);
    
    if (quotaRemaining === 0) {
      SpreadsheetApp.getUi().alert('Daily email quota reached. Try again tomorrow.');
      return;
    }
  
  // Process rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    
    // Stop if batch size reached
    if (sentCount >= EMAIL_CONFIG.BATCH_SIZE) {
      Logger.log(`Batch size limit (${EMAIL_CONFIG.BATCH_SIZE}) reached`);
      break;
    }
    
    // Stop if daily limit reached
    if (sentCount >= EMAIL_CONFIG.MAX_PER_DAY) {
      Logger.log(`Daily limit (${EMAIL_CONFIG.MAX_PER_DAY}) reached`);
      break;
    }
    
    // Check if already sent
    const alreadySent = row[EMAIL_CONFIG.COLUMNS.EMAIL_SENT - 1];
    if (alreadySent === 'Yes') {
      skippedCount++;
      continue;
    }
    
    // Get contact info
    const email = (row[EMAIL_CONFIG.COLUMNS.EMAIL - 1] || '').trim();
    const firstName = (row[EMAIL_CONFIG.COLUMNS.FIRST_NAME - 1] || '').trim();
    const pixelUrl = (row[EMAIL_CONFIG.COLUMNS.PIXEL_URL - 1] || '').trim();
    const clickUrl = (row[EMAIL_CONFIG.COLUMNS.CLICK_URL - 1] || '').trim();
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      Logger.log(`Row ${rowNumber}: Invalid email format: ${email}`);
      skippedCount++;
      continue;
    }
    
    // Validate tracking URLs format
    if (!pixelUrl || !pixelUrl.includes('/p/') || !pixelUrl.endsWith('.gif')) {
      Logger.log(`Row ${rowNumber}: Invalid pixel URL format: ${pixelUrl}`);
      skippedCount++;
      continue;
    }
    
    if (!clickUrl || !clickUrl.includes('/c/')) {
      Logger.log(`Row ${rowNumber}: Invalid click URL format: ${clickUrl}`);
      skippedCount++;
      continue;
    }
    
    // Check quota before EACH send (not just at start)
    quotaRemaining = MailApp.getRemainingDailyQuota();
    if (quotaRemaining === 0) {
      Logger.log('Daily quota exhausted during batch');
      break;
    }
    
    // Send email
    try {
      const htmlBody = getEmailTemplate(firstName, pixelUrl, clickUrl);
      const plainBody = getPlainTextTemplate(firstName, clickUrl);
      
      // Send email FIRST, then mark as sent (atomic operation)
      MailApp.sendEmail({
        to: email,
        subject: EMAIL_CONFIG.EMAIL_SUBJECT,
        htmlBody: htmlBody,
        body: plainBody, // Add plain text version
        name: EMAIL_CONFIG.FROM_NAME
      });
      
      // Only mark as sent AFTER successful send
      sheet.getRange(rowNumber, EMAIL_CONFIG.COLUMNS.EMAIL_SENT).setValue('Yes');
      sheet.getRange(rowNumber, EMAIL_CONFIG.COLUMNS.EMAIL_SENT_AT).setValue(new Date().toISOString());
      
      sentCount++;
      Logger.log(`✓ Sent to ${email} (${firstName})`);
      
      // Delay between emails to avoid rate limiting
      if (sentCount < EMAIL_CONFIG.BATCH_SIZE) {
        Utilities.sleep(EMAIL_CONFIG.DELAY_BETWEEN_EMAILS);
      }
      
    } catch (error) {
      Logger.log(`✗ Error sending to ${email}: ${error.message}`);
      errors.push({ email, error: error.message });
      // Don't mark as sent if error occurred
    }
  }
  
    // Summary
    const summary = `
📊 Email Campaign Summary

✓ Sent: ${sentCount}
⊘ Skipped: ${skippedCount}
✗ Errors: ${errors.length}
📭 Quota remaining: ${MailApp.getRemainingDailyQuota()}

${errors.length > 0 ? '\nErrors:\n' + errors.map(e => `- ${e.email}: ${e.error}`).join('\n') : ''}
    `;
    
    Logger.log(summary);
    SpreadsheetApp.getUi().alert(summary);
    
  } finally {
    // Always release lock, even if error occurred
    lock.releaseLock();
  }
}

/**
 * Send a small batch of 20 emails (for testing or careful sending)
 */
function sendSmallBatch() {
  const originalBatchSize = EMAIL_CONFIG.BATCH_SIZE;
  EMAIL_CONFIG.BATCH_SIZE = 20;
  try {
    sendEmailCampaign();
  } finally {
    EMAIL_CONFIG.BATCH_SIZE = originalBatchSize;
  }
}

// ============================================================================
// SOI REMINDER CAMPAIGN
// ============================================================================

/**
 * Load all emails from SOI_Approved (to exclude from Reminder sends)
 */
function getApprovedEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('SOI_Approved');
  if (!sheet) return new Set();
  const data = sheet.getDataRange().getValues();
  const emails = new Set();
  const emailCol = 8; // Column H
  for (let i = 1; i < data.length; i++) {
    const email = (data[i][emailCol - 1] || '').trim().toLowerCase();
    if (email && email.includes('@')) emails.add(email);
  }
  return emails;
}

/**
 * Send SOI Reminder to Email_Campaign_2026 who haven't received it and aren't in SOI_Approved
 */
function sendSOIReminderCampaign() {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      SpreadsheetApp.getUi().alert('Another send operation is in progress. Please wait.');
      return;
    }

    const approvedEmails = getApprovedEmails();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REMINDER_CONFIG.SHEET_NAME);
    if (!sheet) {
      SpreadsheetApp.getUi().alert(`Sheet "${REMINDER_CONFIG.SHEET_NAME}" not found`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    let sentCount = 0, skippedCount = 0;
    const errors = [];

    if (MailApp.getRemainingDailyQuota() === 0) {
      SpreadsheetApp.getUi().alert('Daily email quota reached. Try again tomorrow.');
      return;
    }

    for (let i = 1; i < data.length; i++) {
      if (sentCount >= REMINDER_CONFIG.BATCH_SIZE) break;
      if (sentCount >= REMINDER_CONFIG.MAX_PER_DAY) break;

      const row = data[i];
      const rowNumber = i + 1;
      const alreadySent = row[REMINDER_CONFIG.COLUMNS.REMINDER_SENT - 1];
      if (alreadySent === 'Yes') { skippedCount++; continue; }

      const email = (row[REMINDER_CONFIG.COLUMNS.EMAIL - 1] || '').trim();
      if (!email || !email.includes('@')) { skippedCount++; continue; }
      if (approvedEmails.has(email.toLowerCase())) { skippedCount++; continue; }

      const pixelUrl = (row[REMINDER_CONFIG.COLUMNS.PIXEL_URL - 1] || '').trim();
      const clickUrl = (row[REMINDER_CONFIG.COLUMNS.CLICK_URL - 1] || '').trim();
      if (!pixelUrl.includes('/reminder.gif') || !clickUrl.includes('/reminder_soi_form')) {
        Logger.log(`Row ${rowNumber}: Missing Reminder tracking URLs. Run "Add Reminder URLs" first.`);
        skippedCount++;
        continue;
      }

      if (MailApp.getRemainingDailyQuota() === 0) break;

      try {
        const firstName = (row[REMINDER_CONFIG.COLUMNS.FIRST_NAME - 1] || '').trim();
        const htmlBody = getSOIReminderTemplate(firstName, pixelUrl, clickUrl);
        const plainBody = getPlainTextReminderTemplate(clickUrl);

        MailApp.sendEmail({
          to: email,
          subject: REMINDER_CONFIG.EMAIL_SUBJECT,
          htmlBody: htmlBody,
          body: plainBody,
          name: REMINDER_CONFIG.FROM_NAME
        });

        sheet.getRange(rowNumber, REMINDER_CONFIG.COLUMNS.REMINDER_SENT).setValue('Yes');
        sheet.getRange(rowNumber, REMINDER_CONFIG.COLUMNS.REMINDER_SENT_AT).setValue(new Date().toISOString());
        sentCount++;
        Logger.log(`✓ Reminder sent to ${email}`);

        Utilities.sleep(REMINDER_CONFIG.DELAY_BETWEEN_EMAILS);
      } catch (error) {
        errors.push({ email, error: error.message });
        Logger.log(`✗ Error: ${email}: ${error.message}`);
      }
    }

    SpreadsheetApp.getUi().alert(
      `📊 SOI Reminder Summary\n\n✓ Sent: ${sentCount}\n⊘ Skipped: ${skippedCount}\n✗ Errors: ${errors.length}\n📭 Quota: ${MailApp.getRemainingDailyQuota()}${errors.length ? '\n\nErrors: ' + errors.map(e => e.email).join(', ') : ''}`
    );
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// CONFIRMATION CAMPAIGN
// ============================================================================

/**
 * Send Confirmation to SOI_Approved who haven't received it
 */
function sendConfirmationCampaign() {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      SpreadsheetApp.getUi().alert('Another send operation is in progress. Please wait.');
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIRMATION_CONFIG.SHEET_NAME);
    if (!sheet) {
      SpreadsheetApp.getUi().alert(`Sheet "${CONFIRMATION_CONFIG.SHEET_NAME}" not found`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    let sentCount = 0, skippedCount = 0;
    const errors = [];

    if (MailApp.getRemainingDailyQuota() === 0) {
      SpreadsheetApp.getUi().alert('Daily email quota reached. Try again tomorrow.');
      return;
    }

    for (let i = 1; i < data.length; i++) {
      if (sentCount >= CONFIRMATION_CONFIG.BATCH_SIZE) break;
      if (sentCount >= CONFIRMATION_CONFIG.MAX_PER_DAY) break;

      const row = data[i];
      const rowNumber = i + 1;
      const alreadySent = row[CONFIRMATION_CONFIG.COLUMNS.CONFIRMATION_SENT - 1];
      if (alreadySent === 'Yes') { skippedCount++; continue; }

      const email = (row[CONFIRMATION_CONFIG.COLUMNS.EMAIL - 1] || '').trim();
      if (!email || !email.includes('@')) { skippedCount++; continue; }

      const pixelUrl = (row[CONFIRMATION_CONFIG.COLUMNS.PIXEL_URL - 1] || '').trim();
      if (!pixelUrl.includes('/confirmation.gif')) {
        Logger.log(`Row ${rowNumber}: Missing Confirmation pixel URL. Run "Add Confirmation URLs" first.`);
        skippedCount++;
        continue;
      }

      if (MailApp.getRemainingDailyQuota() === 0) break;

      try {
        const firstName = (row[CONFIRMATION_CONFIG.COLUMNS.FIRST_NAME - 1] || '').trim();
        const htmlBody = getConfirmationTemplate(firstName, pixelUrl);
        const plainBody = getPlainTextConfirmationTemplate();

        MailApp.sendEmail({
          to: email,
          subject: CONFIRMATION_CONFIG.EMAIL_SUBJECT,
          htmlBody: htmlBody,
          body: plainBody,
          name: CONFIRMATION_CONFIG.FROM_NAME
        });

        sheet.getRange(rowNumber, CONFIRMATION_CONFIG.COLUMNS.CONFIRMATION_SENT).setValue('Yes');
        sheet.getRange(rowNumber, CONFIRMATION_CONFIG.COLUMNS.CONFIRMATION_SENT_AT).setValue(new Date().toISOString());
        sentCount++;
        Logger.log(`✓ Confirmation sent to ${email}`);

        Utilities.sleep(CONFIRMATION_CONFIG.DELAY_BETWEEN_EMAILS);
      } catch (error) {
        errors.push({ email, error: error.message });
        Logger.log(`✗ Error: ${email}: ${error.message}`);
      }
    }

    SpreadsheetApp.getUi().alert(
      `📊 Confirmation Summary\n\n✓ Sent: ${sentCount}\n⊘ Skipped: ${skippedCount}\n✗ Errors: ${errors.length}\n📭 Quota: ${MailApp.getRemainingDailyQuota()}${errors.length ? '\n\nErrors: ' + errors.map(e => e.email).join(', ') : ''}`
    );
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// TEST FUNCTIONS (send to kimbersykes87@gmail.com)
// ============================================================================

/**
 * Send test Reminder to kimbersykes87@gmail.com
 */
function sendTestReminder() {
  const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
  const emailHash = Utilities.base64Encode(TEST_EMAIL.toLowerCase())
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const pixelUrl = `${WORKER_URL}/p/${emailHash}/reminder.gif`;
  const clickUrl = `${WORKER_URL}/c/${emailHash}/reminder_soi_form`;

  const htmlBody = getSOIReminderTemplate('', pixelUrl, clickUrl);
  const plainBody = getPlainTextReminderTemplate(clickUrl);

  MailApp.sendEmail({
    to: TEST_EMAIL,
    subject: '[TEST] ' + REMINDER_CONFIG.EMAIL_SUBJECT,
    htmlBody: htmlBody,
    body: plainBody,
    name: REMINDER_CONFIG.FROM_NAME
  });

  SpreadsheetApp.getUi().alert(`✓ Test Reminder sent to ${TEST_EMAIL}\n\nOpen the email and click the CTA to verify tracking.`);
}

/**
 * Send test Confirmation to kimbersykes87@gmail.com
 */
function sendTestConfirmation() {
  const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
  const emailHash = Utilities.base64Encode(TEST_EMAIL.toLowerCase())
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const pixelUrl = `${WORKER_URL}/p/${emailHash}/confirmation.gif`;

  const htmlBody = getConfirmationTemplate('', pixelUrl);
  const plainBody = getPlainTextConfirmationTemplate();

  MailApp.sendEmail({
    to: TEST_EMAIL,
    subject: '[TEST] ' + CONFIRMATION_CONFIG.EMAIL_SUBJECT,
    htmlBody: htmlBody,
    body: plainBody,
    name: CONFIRMATION_CONFIG.FROM_NAME
  });

  SpreadsheetApp.getUi().alert(`✓ Test Confirmation sent to ${TEST_EMAIL}\n\nOpen the email to verify pixel tracking.`);
}

/**
 * Send test Invitation to kimbersykes87@gmail.com
 */
function sendTestInvitation() {
  const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
  const emailHash = Utilities.base64Encode(TEST_EMAIL.toLowerCase())
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const pixelUrl = `${WORKER_URL}/p/${emailHash}.gif`;
  const clickUrl = `${WORKER_URL}/c/${emailHash}/soi_form`;

  const htmlBody = getEmailTemplate('', pixelUrl, clickUrl);
  const plainBody = getPlainTextTemplate('', clickUrl);

  MailApp.sendEmail({
    to: TEST_EMAIL,
    subject: '[TEST] ' + EMAIL_CONFIG.EMAIL_SUBJECT,
    htmlBody: htmlBody,
    body: plainBody,
    name: EMAIL_CONFIG.FROM_NAME
  });

  SpreadsheetApp.getUi().alert(`✓ Test Invitation sent to ${TEST_EMAIL}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Test send to yourself first
 */
function testSendEmail() {
  const testEmail = Session.getActiveUser().getEmail();
  const testPixelUrl = 'https://email-tracking-worker.kimbersykes87.workers.dev/p/dGVzdEBleGFtcGxlLmNvbQ.gif';
  const testClickUrl = 'https://email-tracking-worker.kimbersykes87.workers.dev/c/dGVzdEBleGFtcGxlLmNvbQ/soi_form';
  
  const htmlBody = getEmailTemplate('', testPixelUrl, testClickUrl);
  const plainBody = getPlainTextTemplate('', testClickUrl);
  
  MailApp.sendEmail({
    to: testEmail,
    subject: '[TEST] ' + EMAIL_CONFIG.EMAIL_SUBJECT,
    htmlBody: htmlBody,
    body: plainBody,
    name: EMAIL_CONFIG.FROM_NAME
  });
  
  SpreadsheetApp.getUi().alert(`Test email sent to ${testEmail}`);
}

/**
 * Get campaign statistics
 */
function getCampaignStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Use header-based column lookup instead of offsets
  const emailSentIndex = headers.indexOf('Email Sent');
  const emailOpenedIndex = headers.indexOf('Email Opened');
  const linkClickedIndex = headers.indexOf('Link Clicked');
  
  let total = data.length - 1; // Exclude header
  let sent = 0;
  let opened = 0;
  let clicked = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (emailSentIndex !== -1 && row[emailSentIndex] === 'Yes') sent++;
    if (emailOpenedIndex !== -1 && row[emailOpenedIndex] === 'Yes') opened++;
    if (linkClickedIndex !== -1 && row[linkClickedIndex] === 'Yes') clicked++;
  }
  
  const stats = `
📊 Campaign Statistics

Total contacts: ${total}
✓ Sent: ${sent} (${((sent/total)*100).toFixed(1)}%)
👁 Opened: ${opened} (${sent > 0 ? ((opened/sent)*100).toFixed(1) : 0}%)
🔗 Clicked: ${clicked} (${sent > 0 ? ((clicked/sent)*100).toFixed(1) : 0}%)
⏳ Remaining: ${total - sent}
📭 Quota remaining today: ${MailApp.getRemainingDailyQuota()}
  `;
  
  Logger.log(stats);
  SpreadsheetApp.getUi().alert(stats);
}

/**
 * Setup automated sending (run once)
 * Sends 50 emails every 2 hours during daytime
 * NOTE: LockService in sendEmailCampaign() prevents overlap
 */
function setupAutomatedSending() {
  // Delete existing triggers for this function only
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendEmailCampaign') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger: Every 2 hours
  // LockService in sendEmailCampaign() will prevent overlap if previous run still executing
  ScriptApp.newTrigger('sendEmailCampaign')
    .timeBased()
    .everyHours(2)
    .create();
  
  SpreadsheetApp.getUi().alert('✓ Automated sending enabled!\n\nEmails will be sent in batches of 50 every 2 hours.\n\nLockService prevents overlap if previous batch is still running.\n\nTo stop: Run deleteAllTriggers()');
}

/**
 * Delete all triggers (stop automated sending)
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  SpreadsheetApp.getUi().alert('✓ All automated triggers deleted');
}

// ============================================================================
// TEST EMAIL FUNCTIONS
// ============================================================================

/**
 * Send test emails to 3 specific addresses
 */
function sendThreeTestEmails() {
  const TEST_RECIPIENTS = [
    { email: 'kimber@kimbersykes.com', firstName: '' },
    { email: 'rubberarmstrongcamp@gmail.com', firstName: '' },
    { email: 'kimbersykes87@gmail.com', firstName: '' }
  ];
  
  const WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
  const results = [];
  
  for (const recipient of TEST_RECIPIENTS) {
    try {
      const emailHash = Utilities.base64Encode(recipient.email.toLowerCase())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const pixelUrl = `${WORKER_URL}/p/${emailHash}.gif`;
      const clickUrl = `${WORKER_URL}/c/${emailHash}/soi_form`;
      
      const htmlBody = getEmailTemplate(recipient.firstName, pixelUrl, clickUrl);
      const plainBody = getPlainTextTemplate(recipient.firstName, clickUrl);
      
      MailApp.sendEmail({
        to: recipient.email,
        subject: '[TEST] ' + EMAIL_CONFIG.EMAIL_SUBJECT,
        htmlBody: htmlBody,
        body: plainBody,
        name: EMAIL_CONFIG.FROM_NAME
      });
      
      results.push(`✓ Sent to ${recipient.email}`);
      Utilities.sleep(500);
      
    } catch (error) {
      results.push(`✗ Error: ${recipient.email} - ${error.message}`);
    }
  }
  
  const summary = `
🧪 TEST EMAILS SENT

${results.join('\n')}

✅ Next Steps:
1. Check your 3 inboxes
2. Open each email
3. Click the "Complete Statement of Intent" button
4. Wait 30 seconds
5. Run "📊 Verify Test Tracking" to check results
  `;
  
  SpreadsheetApp.getUi().alert(summary);
}

/**
 * Verify test email tracking
 */
function verifyTestTracking() {
  const TEST_EMAILS = [
    'kimber@kimbersykes.com',
    'rubberarmstrongcamp@gmail.com',
    'kimbersykes87@gmail.com'
  ];
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  let trackingResults = '\n📊 TEST EMAIL TRACKING STATUS\n\n';
  
  for (const testEmail of TEST_EMAILS) {
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][EMAIL_CONFIG.COLUMNS.EMAIL - 1] || '').toLowerCase();
      
      if (rowEmail === testEmail.toLowerCase()) {
        found = true;
        const headers = data[0];
        const emailOpenedIndex = headers.indexOf('Email Opened');
        const linkClickedIndex = headers.indexOf('Link Clicked');
        const opened = (emailOpenedIndex !== -1 ? data[i][emailOpenedIndex] : 'No') || 'No';
        const clicked = (linkClickedIndex !== -1 ? data[i][linkClickedIndex] : 'No') || 'No';
        
        trackingResults += `✉️  ${testEmail}\n`;
        trackingResults += `    Opened: ${opened === 'Yes' ? '✓ YES' : '✗ No'}\n`;
        trackingResults += `    Clicked: ${clicked === 'Yes' ? '✓ YES' : '✗ No'}\n\n`;
        break;
      }
    }
    
    if (!found) {
      trackingResults += `✉️  ${testEmail}\n    ⚠️  Not found in sheet\n\n`;
    }
  }
  
  SpreadsheetApp.getUi().alert(trackingResults);
}

// ============================================================================
// DATA CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clear false tracking data from bot/crawler activity
 * Only clears tracking for emails that haven't actually been sent
 */
function clearFalseTrackingData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${EMAIL_CONFIG.SHEET_NAME}" not found`);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Column indices (1-indexed for getRange)
  const EMAIL_SENT_COL = EMAIL_CONFIG.COLUMNS.EMAIL_SENT;
  const EMAIL_OPENED_COL = EMAIL_SENT_COL + 2;    // AC
  const FIRST_OPEN_COL = EMAIL_SENT_COL + 3;      // AD
  const OPEN_COUNT_COL = EMAIL_SENT_COL + 4;      // AE
  const LINK_CLICKED_COL = EMAIL_SENT_COL + 5;    // AF
  const FIRST_CLICK_COL = EMAIL_SENT_COL + 6;     // AG
  
  let clearedCount = 0;
  const clearedEmails = [];
  
  // Start from row 2 (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    const email = row[EMAIL_CONFIG.COLUMNS.EMAIL - 1];
    const emailSent = row[EMAIL_SENT_COL - 1];
    
    // Only clear tracking for emails that were NOT sent
    if (emailSent !== 'Yes') {
      const hasTracking = 
        row[EMAIL_OPENED_COL - 1] === 'Yes' || 
        row[LINK_CLICKED_COL - 1] === 'Yes' ||
        row[OPEN_COUNT_COL - 1] > 0;
      
      if (hasTracking) {
        // Clear all tracking data
        sheet.getRange(rowNumber, EMAIL_OPENED_COL).setValue('No');
        sheet.getRange(rowNumber, FIRST_OPEN_COL).setValue('');
        sheet.getRange(rowNumber, OPEN_COUNT_COL).setValue(0);
        sheet.getRange(rowNumber, LINK_CLICKED_COL).setValue('No');
        sheet.getRange(rowNumber, FIRST_CLICK_COL).setValue('');
        
        clearedCount++;
        clearedEmails.push(email || `Row ${rowNumber}`);
      }
    }
  }
  
  const summary = `
🧹 FALSE TRACKING DATA CLEANUP

✓ Cleared: ${clearedCount} contacts
📧 Affected emails: ${clearedEmails.slice(0, 10).join(', ')}${clearedEmails.length > 10 ? `\n...and ${clearedEmails.length - 10} more` : ''}

ℹ️ This removed tracking data from emails that were 
   crawled by bots/tools but never actually sent.

✅ Your sheet is now clean and ready for the campaign!
  `;
  
  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);
  
  return { clearedCount, clearedEmails };
}

/**
 * Hide tracking URL columns (they're not meant for human viewing)
 */
function hideTrackingURLColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${EMAIL_CONFIG.SHEET_NAME}" not found`);
    return;
  }
  
  // Hide columns AH (34) and AI (35) - PIXEL_TRACKING_URL and CLICK_TRACKING_URL
  sheet.hideColumns(34, 2); // Hide 2 columns starting at 34
  
  SpreadsheetApp.getUi().alert('✓ Tracking URL columns hidden\n\nThis prevents accidental clicks that trigger false tracking.');
}

/**
 * Show tracking URL columns (for debugging)
 */
function showTrackingURLColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EMAIL_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${EMAIL_CONFIG.SHEET_NAME}" not found`);
    return;
  }
  
  // Show columns AH (34) and AI (35)
  sheet.showColumns(34, 2);
  
  SpreadsheetApp.getUi().alert('✓ Tracking URL columns now visible');
}

// ============================================================================
// CUSTOM MENU
// ============================================================================

/**
 * Call this from the script editor (Run > refreshMenu) if the menu doesn't appear.
 * Then refresh the spreadsheet tab.
 */
function refreshMenu() {
  try {
    buildEmailCampaignMenu();
    Logger.log('Menu refreshed successfully');
    SpreadsheetApp.getUi().alert('Menu refreshed. If you don\'t see it, refresh the spreadsheet (F5 or reload).');
  } catch (e) {
    Logger.log('Menu error: ' + e.message);
    SpreadsheetApp.getUi().alert('Menu error: ' + e.message);
  }
}

function onOpen() {
  try {
    buildEmailCampaignMenu();
  } catch (e) {
    Logger.log('onOpen error: ' + e.message);
  }
}

function buildEmailCampaignMenu() {
  var ui = SpreadsheetApp.getUi();
  if (!ui) return;

  var testingMenu = ui.createMenu('Testing')
    .addItem('Test Invitation (kimbersykes87@gmail.com)', 'sendTestInvitation')
    .addItem('Test Reminder (kimbersykes87@gmail.com)', 'sendTestReminder')
    .addItem('Test Confirmation (kimbersykes87@gmail.com)', 'sendTestConfirmation')
    .addSeparator()
    .addItem('Send 3 Test Emails (Invitation)', 'sendThreeTestEmails')
    .addItem('Verify Test Tracking', 'verifyTestTracking');

  var trackingMenu = ui.createMenu('Tracking URLs')
    .addItem('Setup Sheet Columns (run first)', 'setupSheetColumns')
    .addSeparator()
    .addItem('Add All Tracking URLs', 'addAllTrackingUrls')
    .addItem('Add Invitation URLs only', 'addInvitationTrackingUrls')
    .addItem('Add Reminder URLs only', 'addReminderTrackingUrls')
    .addItem('Add Confirmation URLs only', 'addConfirmationTrackingUrls');

  var invitationMenu = ui.createMenu('Invitation')
    .addItem('Send Small Batch (20)', 'sendSmallBatch')
    .addItem('Send Batch (50)', 'sendEmailCampaign');

  var reminderMenu = ui.createMenu('SOI Reminder')
    .addItem('Send Batch (50)', 'sendSOIReminderCampaign');

  var confirmationMenu = ui.createMenu('Confirmation')
    .addItem('Send Batch (50)', 'sendConfirmationCampaign');

  ui.createMenu('Email Campaign')
    .addSubMenu(testingMenu)
    .addSubMenu(trackingMenu)
    .addSeparator()
    .addSubMenu(invitationMenu)
    .addSubMenu(reminderMenu)
    .addSubMenu(confirmationMenu)
    .addSeparator()
    .addItem('Setup Automated Sending', 'setupAutomatedSending')
    .addItem('Stop Automated Sending', 'deleteAllTriggers')
    .addSeparator()
    .addItem('Clear False Tracking Data', 'clearFalseTrackingData')
    .addItem('Hide Tracking URL Columns', 'hideTrackingURLColumns')
    .addSeparator()
    .addItem('View Campaign Stats', 'getCampaignStats')
    .addToUi();
}

