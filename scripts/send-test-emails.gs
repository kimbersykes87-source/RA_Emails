/**
 * Send Test Emails to Specific Recipients
 * 
 * Sends 3 test emails with full tracking to verify everything works
 * before sending to the full 290 contact list.
 */

const TEST_CONFIG = {
  EMAIL_SUBJECT: 'Rubber Armstrong 2026 - Statement of Intent Invitation',
  FROM_NAME: 'Rubber Armstrong',
  WORKER_URL: 'https://email-tracking-worker.kimbersykes87.workers.dev',
  
  // Test recipients
  TEST_RECIPIENTS: [
    { email: 'kimber@kimbersykes.com', firstName: 'Kimber' },
    { email: 'rubberarmstrongcamp@gmail.com', firstName: 'RA Team' },
    { email: 'kimbersykes87@gmail.com', firstName: 'Kimber' }
  ]
};

// ============================================================================
// EMAIL TEMPLATE (Same as main campaign)
// ============================================================================

function getTestEmailTemplate(firstName, pixelUrl, clickUrl) {
  const greeting = firstName ? `Dear ${firstName},` : 'Dear Old, Current and Aspiring Rubbers,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- TEST BANNER -->
    <div style="background-color: #ff6b6b; color: white; padding: 10px; text-align: center; margin-bottom: 20px; border-radius: 4px;">
      <strong>🧪 TEST EMAIL - Email Tracking System</strong>
    </div>
    
    <h2 style="color: #000; margin-top: 0;">${greeting}</h2>
    
    <p style="margin-bottom: 16px;">Placement has given us the nod again. Rubber Armstrong is in good standing for the 10th year running.</p>
    
    <p style="margin-bottom: 16px;">Our Statement of Intent for Burning Man 2026 is submitted, and we are planning to return. We have also requested 40 Steward Sale tickets.</p>
    
    <p style="margin-bottom: 16px;">We are in advanced talks with a tent manufacturer on a new run of tents with serious upgrades. That means we will have around 25 existing Rubber Armstrong tents available for sale. If you know another camp that could use proven shelter, reach out to me directly.</p>
    
    <p style="margin-bottom: 16px;">We have been going through the post playa survey properly, and the changes are already being built into 2026 and we are working on some exciting upgrades.</p>
    
    <p style="margin-bottom: 16px;">If you are interested in joining us for 2026 complete the Statement of Intent form. If you know someone that you think would be a good fit with our fam, feel free to forward them this invite.</p>
    
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
          <img src="https://rubberarmstrong.com/assets/logo-landscape.svg" 
               alt="Rubber Armstrong Logo" 
               width="80" 
               height="40"
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
    
    <!-- TEST INFO -->
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #856404;">
        <strong>📊 Test Email Info:</strong><br>
        • Email Hash: ${pixelUrl.split('/p/')[1]?.replace('.gif', '') || 'N/A'}<br>
        • Tracking Pixel: ${pixelUrl}<br>
        • Click URL: ${clickUrl}
      </p>
    </div>
    
  </div>
  
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;opacity:0;position:absolute;" />
  
</body>
</html>
  `.trim();
}

// ============================================================================
// SEND TEST EMAILS
// ============================================================================

function sendThreeTestEmails() {
  const results = [];
  
  Logger.log('🧪 Sending 3 test emails...\n');
  
  for (const recipient of TEST_CONFIG.TEST_RECIPIENTS) {
    try {
      // Generate tracking URLs
      const emailHash = Utilities.base64Encode(recipient.email.toLowerCase())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const pixelUrl = `${TEST_CONFIG.WORKER_URL}/p/${emailHash}.gif`;
      const clickUrl = `${TEST_CONFIG.WORKER_URL}/c/${emailHash}/soi_form`;
      
      // Generate email HTML
      const htmlBody = getTestEmailTemplate(recipient.firstName, pixelUrl, clickUrl);
      
      // Send email
      MailApp.sendEmail({
        to: recipient.email,
        subject: '[TEST] ' + TEST_CONFIG.EMAIL_SUBJECT,
        htmlBody: htmlBody,
        name: TEST_CONFIG.FROM_NAME
      });
      
      results.push({
        email: recipient.email,
        status: 'Sent ✓',
        pixelUrl: pixelUrl,
        clickUrl: clickUrl
      });
      
      Logger.log(`✓ Sent to ${recipient.email}`);
      
      // Small delay between sends
      Utilities.sleep(500);
      
    } catch (error) {
      results.push({
        email: recipient.email,
        status: 'Error ✗',
        error: error.message
      });
      Logger.log(`✗ Error sending to ${recipient.email}: ${error.message}`);
    }
  }
  
  // Generate summary
  const summary = generateTestSummary(results);
  Logger.log('\n' + summary);
  SpreadsheetApp.getUi().alert(summary);
}

// ============================================================================
// SUMMARY GENERATOR
// ============================================================================

function generateTestSummary(results) {
  const successCount = results.filter(r => r.status === 'Sent ✓').length;
  const errorCount = results.filter(r => r.status === 'Error ✗').length;
  
  let summary = `
🧪 TEST EMAIL CAMPAIGN RESULTS
═══════════════════════════════

📊 Summary:
✓ Sent: ${successCount}/3
✗ Errors: ${errorCount}/3

📧 Recipients:
`;

  results.forEach((result, index) => {
    summary += `\n${index + 1}. ${result.email}`;
    summary += `\n   Status: ${result.status}`;
    if (result.error) {
      summary += `\n   Error: ${result.error}`;
    }
    if (result.pixelUrl) {
      summary += `\n   Pixel: ${result.pixelUrl}`;
    }
    summary += '\n';
  });
  
  summary += `
✅ Next Steps:
1. Check your inboxes for "[TEST]" emails
2. Verify email design looks good
3. Click the "Complete Statement of Intent" button
4. Wait 10 seconds, then check tracking in sheet:
   - Email_Campaign_2026 tab
   - Look for test emails in the list
   - Check "Email Opened" and "Link Clicked" columns
5. If all looks good, proceed with full campaign!

📝 Note: Test emails have a red "TEST EMAIL" banner at the top
and show tracking URLs at the bottom for verification.
  `;
  
  return summary;
}

// ============================================================================
// VERIFY TEST TRACKING
// ============================================================================

function verifyTestTracking() {
  const SHEET_NAME = 'Email_Campaign_2026';
  const EMAIL_COLUMN = 8; // Column H
  const OPENED_COLUMN = 29; // Column AC
  const CLICKED_COLUMN = 32; // Column AF
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${SHEET_NAME}" not found`);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  let trackingResults = `
📊 TEST EMAIL TRACKING STATUS
═══════════════════════════════

`;
  
  for (const testRecipient of TEST_CONFIG.TEST_RECIPIENTS) {
    const email = testRecipient.email.toLowerCase();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][EMAIL_COLUMN - 1] || '').toLowerCase();
      
      if (rowEmail === email) {
        found = true;
        const opened = data[i][OPENED_COLUMN - 1] || 'No';
        const clicked = data[i][CLICKED_COLUMN - 1] || 'No';
        
        trackingResults += `
✉️  ${testRecipient.email}
    Email Opened: ${opened === 'Yes' ? '✓ YES' : '✗ No'}
    Link Clicked: ${clicked === 'Yes' ? '✓ YES' : '✗ No'}
`;
        break;
      }
    }
    
    if (!found) {
      trackingResults += `
✉️  ${testRecipient.email}
    ⚠️  Not found in sheet
`;
    }
  }
  
  trackingResults += `
  
💡 If tracking shows "No":
1. Make sure you opened the email
2. Make sure you clicked the button
3. Wait 30 seconds and run this again
4. Check worker is running: ${TEST_CONFIG.WORKER_URL}
  `;
  
  Logger.log(trackingResults);
  SpreadsheetApp.getUi().alert(trackingResults);
}

