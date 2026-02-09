/**
 * Rubber Armstrong 2026 - Form Handler & Sheet Setup
 * Handles SOI form submissions and sheet configuration
 */

// ============================================================================
// SETUP FUNCTIONS - Run these once to configure your sheet
// ============================================================================

/**
 * Run this FIRST to set up all tabs with headers and formatting
 * Go to: Run → setupAllTabs
 */
function setupAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    
    // Create tab if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      Logger.log('Created tab: ' + tabName);
    }
    
    // Set headers
    sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(CONFIG.COLORS.HEADER);
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Auto-resize all columns
    for (let i = 1; i <= CONFIG.HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Format Burns and Phone Code columns as TEXT to prevent number coercion
    const phoneCodeCol = getColumnLetter('Phone Code');
    const burnsRACol = getColumnLetter('Burns (RA)');
    const burnsOtherCol = getColumnLetter('Burns (Other)');
    
    if (phoneCodeCol) {
      sheet.getRange(phoneCodeCol + '2:' + phoneCodeCol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsRACol) {
      sheet.getRange(burnsRACol + '2:' + burnsRACol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsOtherCol) {
      sheet.getRange(burnsOtherCol + '2:' + burnsOtherCol + '1000').setNumberFormat('@STRING@');
    }
    
    Logger.log('Set up tab: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert(
    '✅ All tabs set up successfully!\n\n' +
    'Tabs created: ' + tabNames.length + '\n' +
    'Columns: ' + CONFIG.HEADERS.length + '\n\n' +
    'Next: Run setupDataValidation'
  );
}

/**
 * Run this SECOND to add dropdown validations
 * Go to: Run → setupDataValidation
 */
function setupDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    
    // Get column letters for validation
    const sexCol = getColumnLetter('Sex');
    const firstBurnCol = getColumnLetter('First Burn?');
    const likelihoodCol = getColumnLetter('Likelihood');
    const stewardCol = getColumnLetter('Steward Ticket?');
    const statusCol = getColumnLetter('Status');
    
    // Sex validation
    if (sexCol) {
      const sexRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.SEX, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(sexCol + '2:' + sexCol + '1000').setDataValidation(sexRule);
    }
    
    // First Burn validation
    if (firstBurnCol) {
      const firstBurnRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.FIRST_BURN, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(firstBurnCol + '2:' + firstBurnCol + '1000').setDataValidation(firstBurnRule);
    }
    
    // Likelihood validation
    if (likelihoodCol) {
      const likelihoodRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.LIKELIHOOD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(likelihoodCol + '2:' + likelihoodCol + '1000').setDataValidation(likelihoodRule);
    }
    
    // Steward Ticket validation
    if (stewardCol) {
      const stewardRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STEWARD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(stewardCol + '2:' + stewardCol + '1000').setDataValidation(stewardRule);
    }
    
    // Status validation
    if (statusCol) {
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STATUS, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(statusCol + '2:' + statusCol + '1000').setDataValidation(statusRule);
    }
    
    Logger.log('Added data validation to: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert('✅ Data validation added to all tabs!\n\nNext: Run setupConditionalFormatting');
}

/**
 * Run this THIRD to add color coding for Status column
 * Go to: Run → setupConditionalFormatting
 */
function setupConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.STAGING + ' tab not found!');
    return;
  }
  
  // Clear existing rules
  sheet.clearConditionalFormatRules();
  
  // Get status column letter
  const statusCol = getColumnLetter('Status');
  if (!statusCol) {
    SpreadsheetApp.getUi().alert('❌ Status column not found!');
    return;
  }
  
  // Define the range (entire rows, all columns)
  const lastCol = getColumnLetter(CONFIG.HEADERS[CONFIG.HEADERS.length - 1]);
  const range = sheet.getRange('A2:' + lastCol + '1000');
  
  // Rule 1: Pending (Yellow)
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Pending"')
    .setBackground(CONFIG.COLORS.PENDING)
    .setRanges([range])
    .build();
  
  // Rule 2: Approved (Green)
  const approvedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Approved"')
    .setBackground(CONFIG.COLORS.APPROVED)
    .setRanges([range])
    .build();
  
  // Rule 3: Rejected (Red)
  const rejectedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Rejected"')
    .setBackground(CONFIG.COLORS.REJECTED)
    .setRanges([range])
    .build();
  
  // Apply rules
  sheet.setConditionalFormatRules([pendingRule, approvedRule, rejectedRule]);
  
  Logger.log('Added conditional formatting to ' + CONFIG.SHEETS.STAGING);
  SpreadsheetApp.getUi().alert('✅ Conditional formatting added!\n\nSetup complete! Now deploy as Web App.');
}

/**
 * Optional: Run all setup functions at once
 * Go to: Run → runCompleteSetup
 */
function runCompleteSetup() {
  setupAllTabs();
  Utilities.sleep(1000);
  setupDataValidation();
  Utilities.sleep(1000);
  setupConditionalFormatting();
  SpreadsheetApp.getUi().alert('🎉 Complete setup finished!\n\nNow go to Deploy → New Deployment');
}

// ============================================================================
// FORM SUBMISSION HANDLER - This runs automatically when form is submitted
// ============================================================================

/**
 * Handles GET requests (needed for CORS to work properly)
 * Google Apps Script requires this even for POST-only endpoints
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'info',
      message: 'This endpoint accepts POST requests only'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests from the SOI form
 * This is called automatically when someone submits the form
 */
function doPost(e) {
  try {
    // Parse incoming JSON
    const data = JSON.parse(e.postData.contents);
    
    // Open the spreadsheet and get SOI_Staging sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
    
    if (!sheet) {
      throw new Error(CONFIG.SHEETS.STAGING + ' sheet not found');
    }
    
    // Get headers from first row
    const headers = getSheetHeaders(sheet);
    
    // Process burns data - convert arrays to comma-separated strings and count
    const burnsWithRA = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.join(', ') 
      : (data.burnsWithRA || '');
    const burnsWithRACount = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.length 
      : (data.burnsWithRA ? data.burnsWithRA.split(',').filter(y => y.trim()).length : 0);
    
    const burnsWithoutRA = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.join(', ') 
      : (data.burnsWithoutRA || '');
    const burnsWithoutRACount = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.length 
      : (data.burnsWithoutRA ? data.burnsWithoutRA.split(',').filter(y => y.trim()).length : 0);
    
    // Create a map of column names to values
    const columnData = {
      'Timestamp': new Date(),
      'First': data.firstName || '',
      'Last': data.lastName || '',
      'Sex': data.sex || '',
      'Birth Year': data.birthYear || '',
      'Country (Birth)': data.countryOfBirth || '',
      'Country (Res)': data.countryOfResidence || '',
      'Email': data.email || '',
      'Phone Code': data.phoneCountryCode || '',
      'Phone': data.phoneNumber || '',
      'Ref. Campmate': data.referringCampmate || '',
      'Burns (RA)': burnsWithRA,
      'Burns (RA) Count': burnsWithRACount,
      'Burns (Other)': burnsWithoutRA,
      'Burns (Other) Count': burnsWithoutRACount,
      'First Burn?': data.firstBurn || CONFIG.DEFAULTS.DEFAULT_FIRST_BURN,
      'Likelihood': data.likelihoodOfAttending || '',
      'Steward Ticket?': data.stewardTicketInterest || '',
      'What Offer': data.whatYouOffer || '',
      'Notes': data.notes || '',
      'Status': CONFIG.DEFAULTS.DEFAULT_STATUS,
      'Reviewed By': '',
      'Reviewed At': '',
      'Internal Notes': '',
      'Form': data.formName || CONFIG.DEFAULTS.FORM_NAME,
      'Synced to Contacts': ''
    };
    
    // Build row array based on header order
    const row = headers.map(header => columnData[header] || '');
    
    // Append row to sheet
    sheet.appendRow(row);
    
    // Log successful submission
    Logger.log('Submission received from: ' + data.email);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success',
        success: true,
        message: 'Submission received'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error
    Logger.log('Error processing submission: ' + error.toString());
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test the doPost function with sample data
 * Go to: Run → testFormSubmission
 */
function testFormSubmission() {
  const testData = {
    firstName: 'Test',
    lastName: 'User',
    sex: 'Non-binary',
    birthYear: '1990',
    countryOfBirth: 'United States',
    countryOfResidence: 'United States',
    email: 'test@example.com',
    phoneCountryCode: '+1',
    phoneNumber: '5551234567',
    referringCampmate: 'Jane Doe',
    burnsWithRA: ['2014', '2015', '2016'],  // Array of years
    burnsWithoutRA: ['2022', '2023'],       // Array of years
    firstBurn: 'No',
    likelihoodOfAttending: 'Hell yeah!',
    stewardTicketInterest: 'Yes',
    whatYouOffer: 'Testing the form submission',
    notes: 'This is a test submission from Apps Script',
    formName: 'Statement of Intent 2026'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(mockEvent);
  const result = JSON.parse(response.getContent());
  
  if (result.success) {
    SpreadsheetApp.getUi().alert(
      '✅ Test submission successful!\n\n' +
      'Check ' + CONFIG.SHEETS.STAGING + ' tab for the test row.\n\n' +
      'Burns (RA): 2014, 2015, 2016 (Count: 3)\n' +
      'Burns (Other): 2022, 2023 (Count: 2)'
    );
  } else {
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + result.message);
  }
}

/**
 * Validate all sheet headers
 * Go to: Run → validateAllHeaders
 */
function validateAllHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  let report = '📋 Header Validation Report\n\n';
  let allValid = true;
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report += '❌ ' + tabName + ': Sheet not found\n';
      allValid = false;
      return;
    }
    
    const validation = validateHeaders(sheet);
    
    if (validation.valid) {
      report += '✅ ' + tabName + ': All headers correct\n';
    } else {
      report += '❌ ' + tabName + ':\n';
      if (validation.missing.length > 0) {
        report += '  Missing: ' + validation.missing.join(', ') + '\n';
      }
      if (validation.extra.length > 0) {
        report += '  Extra: ' + validation.extra.join(', ') + '\n';
      }
      allValid = false;
    }
  });
  
  report += '\n';
  if (allValid) {
    report += '✅ All sheets are correctly configured!';
  } else {
    report += '⚠️ Some sheets need attention.\nRun setupAllTabs() to fix.';
  }
  
  SpreadsheetApp.getUi().alert(report);
}

/**
 * Rubber Armstrong 2026 - Form Handler & Sheet Setup
 * Handles SOI form submissions and sheet configuration
 */

// ============================================================================
// SETUP FUNCTIONS - Run these once to configure your sheet
// ============================================================================

/**
 * Run this FIRST to set up all tabs with headers and formatting
 * Go to: Run → setupAllTabs
 */
function setupAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    
    // Create tab if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      Logger.log('Created tab: ' + tabName);
    }
    
    // Set headers
    sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(CONFIG.COLORS.HEADER);
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Auto-resize all columns
    for (let i = 1; i <= CONFIG.HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Format Burns and Phone Code columns as TEXT to prevent number coercion
    const phoneCodeCol = getColumnLetter('Phone Code');
    const burnsRACol = getColumnLetter('Burns (RA)');
    const burnsOtherCol = getColumnLetter('Burns (Other)');
    
    if (phoneCodeCol) {
      sheet.getRange(phoneCodeCol + '2:' + phoneCodeCol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsRACol) {
      sheet.getRange(burnsRACol + '2:' + burnsRACol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsOtherCol) {
      sheet.getRange(burnsOtherCol + '2:' + burnsOtherCol + '1000').setNumberFormat('@STRING@');
    }
    
    Logger.log('Set up tab: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert(
    '✅ All tabs set up successfully!\n\n' +
    'Tabs created: ' + tabNames.length + '\n' +
    'Columns: ' + CONFIG.HEADERS.length + '\n\n' +
    'Next: Run setupDataValidation'
  );
}

/**
 * Run this SECOND to add dropdown validations
 * Go to: Run → setupDataValidation
 */
function setupDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    
    // Get column letters for validation
    const sexCol = getColumnLetter('Sex');
    const firstBurnCol = getColumnLetter('First Burn?');
    const likelihoodCol = getColumnLetter('Likelihood');
    const stewardCol = getColumnLetter('Steward Ticket?');
    const statusCol = getColumnLetter('Status');
    
    // Sex validation
    if (sexCol) {
      const sexRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.SEX, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(sexCol + '2:' + sexCol + '1000').setDataValidation(sexRule);
    }
    
    // First Burn validation
    if (firstBurnCol) {
      const firstBurnRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.FIRST_BURN, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(firstBurnCol + '2:' + firstBurnCol + '1000').setDataValidation(firstBurnRule);
    }
    
    // Likelihood validation
    if (likelihoodCol) {
      const likelihoodRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.LIKELIHOOD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(likelihoodCol + '2:' + likelihoodCol + '1000').setDataValidation(likelihoodRule);
    }
    
    // Steward Ticket validation
    if (stewardCol) {
      const stewardRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STEWARD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(stewardCol + '2:' + stewardCol + '1000').setDataValidation(stewardRule);
    }
    
    // Status validation
    if (statusCol) {
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STATUS, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(statusCol + '2:' + statusCol + '1000').setDataValidation(statusRule);
    }
    
    Logger.log('Added data validation to: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert('✅ Data validation added to all tabs!\n\nNext: Run setupConditionalFormatting');
}

/**
 * Run this THIRD to add color coding for Status column
 * Go to: Run → setupConditionalFormatting
 */
function setupConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.STAGING + ' tab not found!');
    return;
  }
  
  // Clear existing rules
  sheet.clearConditionalFormatRules();
  
  // Get status column letter
  const statusCol = getColumnLetter('Status');
  if (!statusCol) {
    SpreadsheetApp.getUi().alert('❌ Status column not found!');
    return;
  }
  
  // Define the range (entire rows, all columns)
  const lastCol = getColumnLetter(CONFIG.HEADERS[CONFIG.HEADERS.length - 1]);
  const range = sheet.getRange('A2:' + lastCol + '1000');
  
  // Rule 1: Pending (Yellow)
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Pending"')
    .setBackground(CONFIG.COLORS.PENDING)
    .setRanges([range])
    .build();
  
  // Rule 2: Approved (Green)
  const approvedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Approved"')
    .setBackground(CONFIG.COLORS.APPROVED)
    .setRanges([range])
    .build();
  
  // Rule 3: Rejected (Red)
  const rejectedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Rejected"')
    .setBackground(CONFIG.COLORS.REJECTED)
    .setRanges([range])
    .build();
  
  // Apply rules
  sheet.setConditionalFormatRules([pendingRule, approvedRule, rejectedRule]);
  
  Logger.log('Added conditional formatting to ' + CONFIG.SHEETS.STAGING);
  SpreadsheetApp.getUi().alert('✅ Conditional formatting added!\n\nSetup complete! Now deploy as Web App.');
}

/**
 * Optional: Run all setup functions at once
 * Go to: Run → runCompleteSetup
 */
function runCompleteSetup() {
  setupAllTabs();
  Utilities.sleep(1000);
  setupDataValidation();
  Utilities.sleep(1000);
  setupConditionalFormatting();
  SpreadsheetApp.getUi().alert('🎉 Complete setup finished!\n\nNow go to Deploy → New Deployment');
}

// ============================================================================
// FORM SUBMISSION HANDLER - This runs automatically when form is submitted
// ============================================================================

/**
 * Handles GET requests (needed for CORS to work properly)
 * Google Apps Script requires this even for POST-only endpoints
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'info',
      message: 'This endpoint accepts POST requests only'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests from the SOI form
 * This is called automatically when someone submits the form
 */
function doPost(e) {
  try {
    // Parse incoming JSON
    const data = JSON.parse(e.postData.contents);
    
    // Open the spreadsheet and get SOI_Staging sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
    
    if (!sheet) {
      throw new Error(CONFIG.SHEETS.STAGING + ' sheet not found');
    }
    
    // Get headers from first row
    const headers = getSheetHeaders(sheet);
    
    // Process burns data - convert arrays to comma-separated strings and count
    const burnsWithRA = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.join(', ') 
      : (data.burnsWithRA || '');
    const burnsWithRACount = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.length 
      : (data.burnsWithRA ? data.burnsWithRA.split(',').filter(y => y.trim()).length : 0);
    
    const burnsWithoutRA = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.join(', ') 
      : (data.burnsWithoutRA || '');
    const burnsWithoutRACount = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.length 
      : (data.burnsWithoutRA ? data.burnsWithoutRA.split(',').filter(y => y.trim()).length : 0);
    
    // Create a map of column names to values
    const columnData = {
      'Timestamp': new Date(),
      'First': data.firstName || '',
      'Last': data.lastName || '',
      'Sex': data.sex || '',
      'Birth Year': data.birthYear || '',
      'Country (Birth)': data.countryOfBirth || '',
      'Country (Res)': data.countryOfResidence || '',
      'Email': data.email || '',
      'Phone Code': data.phoneCountryCode || '',
      'Phone': data.phoneNumber || '',
      'Ref. Campmate': data.referringCampmate || '',
      'Burns (RA)': burnsWithRA,
      'Burns (RA) Count': burnsWithRACount,
      'Burns (Other)': burnsWithoutRA,
      'Burns (Other) Count': burnsWithoutRACount,
      'First Burn?': data.firstBurn || CONFIG.DEFAULTS.DEFAULT_FIRST_BURN,
      'Likelihood': data.likelihoodOfAttending || '',
      'Steward Ticket?': data.stewardTicketInterest || '',
      'What Offer': data.whatYouOffer || '',
      'Notes': data.notes || '',
      'Status': CONFIG.DEFAULTS.DEFAULT_STATUS,
      'Reviewed By': '',
      'Reviewed At': '',
      'Internal Notes': '',
      'Form': data.formName || CONFIG.DEFAULTS.FORM_NAME,
      'Synced to Contacts': ''
    };
    
    // Build row array based on header order
    const row = headers.map(header => columnData[header] || '');
    
    // Append row to sheet
    sheet.appendRow(row);
    
    // Log successful submission
    Logger.log('Submission received from: ' + data.email);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success',
        success: true,
        message: 'Submission received'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error
    Logger.log('Error processing submission: ' + error.toString());
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test the doPost function with sample data
 * Go to: Run → testFormSubmission
 */
function testFormSubmission() {
  const testData = {
    firstName: 'Test',
    lastName: 'User',
    sex: 'Non-binary',
    birthYear: '1990',
    countryOfBirth: 'United States',
    countryOfResidence: 'United States',
    email: 'test@example.com',
    phoneCountryCode: '+1',
    phoneNumber: '5551234567',
    referringCampmate: 'Jane Doe',
    burnsWithRA: ['2014', '2015', '2016'],  // Array of years
    burnsWithoutRA: ['2022', '2023'],       // Array of years
    firstBurn: 'No',
    likelihoodOfAttending: 'Hell yeah!',
    stewardTicketInterest: 'Yes',
    whatYouOffer: 'Testing the form submission',
    notes: 'This is a test submission from Apps Script',
    formName: 'Statement of Intent 2026'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(mockEvent);
  const result = JSON.parse(response.getContent());
  
  if (result.success) {
    SpreadsheetApp.getUi().alert(
      '✅ Test submission successful!\n\n' +
      'Check ' + CONFIG.SHEETS.STAGING + ' tab for the test row.\n\n' +
      'Burns (RA): 2014, 2015, 2016 (Count: 3)\n' +
      'Burns (Other): 2022, 2023 (Count: 2)'
    );
  } else {
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + result.message);
  }
}

/**
 * Validate all sheet headers
 * Go to: Run → validateAllHeaders
 */
function validateAllHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  let report = '📋 Header Validation Report\n\n';
  let allValid = true;
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report += '❌ ' + tabName + ': Sheet not found\n';
      allValid = false;
      return;
    }
    
    const validation = validateHeaders(sheet);
    
    if (validation.valid) {
      report += '✅ ' + tabName + ': All headers correct\n';
    } else {
      report += '❌ ' + tabName + ':\n';
      if (validation.missing.length > 0) {
        report += '  Missing: ' + validation.missing.join(', ') + '\n';
      }
      if (validation.extra.length > 0) {
        report += '  Extra: ' + validation.extra.join(', ') + '\n';
      }
      allValid = false;
    }
  });
  
  report += '\n';
  if (allValid) {
    report += '✅ All sheets are correctly configured!';
  } else {
    report += '⚠️ Some sheets need attention.\nRun setupAllTabs() to fix.';
  }
  
  SpreadsheetApp.getUi().alert(report);
}

/**
 * Rubber Armstrong 2026 - Form Handler & Sheet Setup
 * Handles SOI form submissions and sheet configuration
 */

// ============================================================================
// SETUP FUNCTIONS - Run these once to configure your sheet
// ============================================================================

/**
 * Run this FIRST to set up all tabs with headers and formatting
 * Go to: Run → setupAllTabs
 */
function setupAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    
    // Create tab if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      Logger.log('Created tab: ' + tabName);
    }
    
    // Set headers
    sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(CONFIG.COLORS.HEADER);
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Auto-resize all columns
    for (let i = 1; i <= CONFIG.HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Format Burns and Phone Code columns as TEXT to prevent number coercion
    const phoneCodeCol = getColumnLetter('Phone Code');
    const burnsRACol = getColumnLetter('Burns (RA)');
    const burnsOtherCol = getColumnLetter('Burns (Other)');
    
    if (phoneCodeCol) {
      sheet.getRange(phoneCodeCol + '2:' + phoneCodeCol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsRACol) {
      sheet.getRange(burnsRACol + '2:' + burnsRACol + '1000').setNumberFormat('@STRING@');
    }
    if (burnsOtherCol) {
      sheet.getRange(burnsOtherCol + '2:' + burnsOtherCol + '1000').setNumberFormat('@STRING@');
    }
    
    Logger.log('Set up tab: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert(
    '✅ All tabs set up successfully!\n\n' +
    'Tabs created: ' + tabNames.length + '\n' +
    'Columns: ' + CONFIG.HEADERS.length + '\n\n' +
    'Next: Run setupDataValidation'
  );
}

/**
 * Run this SECOND to add dropdown validations
 * Go to: Run → setupDataValidation
 */
function setupDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    
    // Get column letters for validation
    const sexCol = getColumnLetter('Sex');
    const firstBurnCol = getColumnLetter('First Burn?');
    const likelihoodCol = getColumnLetter('Likelihood');
    const stewardCol = getColumnLetter('Steward Ticket?');
    const statusCol = getColumnLetter('Status');
    
    // Sex validation
    if (sexCol) {
      const sexRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.SEX, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(sexCol + '2:' + sexCol + '1000').setDataValidation(sexRule);
    }
    
    // First Burn validation
    if (firstBurnCol) {
      const firstBurnRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.FIRST_BURN, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(firstBurnCol + '2:' + firstBurnCol + '1000').setDataValidation(firstBurnRule);
    }
    
    // Likelihood validation
    if (likelihoodCol) {
      const likelihoodRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.LIKELIHOOD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(likelihoodCol + '2:' + likelihoodCol + '1000').setDataValidation(likelihoodRule);
    }
    
    // Steward Ticket validation
    if (stewardCol) {
      const stewardRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STEWARD, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(stewardCol + '2:' + stewardCol + '1000').setDataValidation(stewardRule);
    }
    
    // Status validation
    if (statusCol) {
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.VALIDATION.STATUS, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(statusCol + '2:' + statusCol + '1000').setDataValidation(statusRule);
    }
    
    Logger.log('Added data validation to: ' + tabName);
  });
  
  SpreadsheetApp.getUi().alert('✅ Data validation added to all tabs!\n\nNext: Run setupConditionalFormatting');
}

/**
 * Run this THIRD to add color coding for Status column
 * Go to: Run → setupConditionalFormatting
 */
function setupConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.STAGING + ' tab not found!');
    return;
  }
  
  // Clear existing rules
  sheet.clearConditionalFormatRules();
  
  // Get status column letter
  const statusCol = getColumnLetter('Status');
  if (!statusCol) {
    SpreadsheetApp.getUi().alert('❌ Status column not found!');
    return;
  }
  
  // Define the range (entire rows, all columns)
  const lastCol = getColumnLetter(CONFIG.HEADERS[CONFIG.HEADERS.length - 1]);
  const range = sheet.getRange('A2:' + lastCol + '1000');
  
  // Rule 1: Pending (Yellow)
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Pending"')
    .setBackground(CONFIG.COLORS.PENDING)
    .setRanges([range])
    .build();
  
  // Rule 2: Approved (Green)
  const approvedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Approved"')
    .setBackground(CONFIG.COLORS.APPROVED)
    .setRanges([range])
    .build();
  
  // Rule 3: Rejected (Red)
  const rejectedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Rejected"')
    .setBackground(CONFIG.COLORS.REJECTED)
    .setRanges([range])
    .build();
  
  // Apply rules
  sheet.setConditionalFormatRules([pendingRule, approvedRule, rejectedRule]);
  
  Logger.log('Added conditional formatting to ' + CONFIG.SHEETS.STAGING);
  SpreadsheetApp.getUi().alert('✅ Conditional formatting added!\n\nSetup complete! Now deploy as Web App.');
}

/**
 * Optional: Run all setup functions at once
 * Go to: Run → runCompleteSetup
 */
function runCompleteSetup() {
  setupAllTabs();
  Utilities.sleep(1000);
  setupDataValidation();
  Utilities.sleep(1000);
  setupConditionalFormatting();
  SpreadsheetApp.getUi().alert('🎉 Complete setup finished!\n\nNow go to Deploy → New Deployment');
}

// ============================================================================
// FORM SUBMISSION HANDLER - This runs automatically when form is submitted
// ============================================================================

/**
 * Handles GET requests (needed for CORS to work properly)
 * Google Apps Script requires this even for POST-only endpoints
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'info',
      message: 'This endpoint accepts POST requests only'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests from the SOI form
 * This is called automatically when someone submits the form
 */
function doPost(e) {
  try {
    // Parse incoming JSON
    const data = JSON.parse(e.postData.contents);
    
    // Open the spreadsheet and get SOI_Staging sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
    
    if (!sheet) {
      throw new Error(CONFIG.SHEETS.STAGING + ' sheet not found');
    }
    
    // Get headers from first row
    const headers = getSheetHeaders(sheet);
    
    // Process burns data - convert arrays to comma-separated strings and count
    const burnsWithRA = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.join(', ') 
      : (data.burnsWithRA || '');
    const burnsWithRACount = Array.isArray(data.burnsWithRA) 
      ? data.burnsWithRA.length 
      : (data.burnsWithRA ? data.burnsWithRA.split(',').filter(y => y.trim()).length : 0);
    
    const burnsWithoutRA = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.join(', ') 
      : (data.burnsWithoutRA || '');
    const burnsWithoutRACount = Array.isArray(data.burnsWithoutRA) 
      ? data.burnsWithoutRA.length 
      : (data.burnsWithoutRA ? data.burnsWithoutRA.split(',').filter(y => y.trim()).length : 0);
    
    // Create a map of column names to values
    const columnData = {
      'Timestamp': new Date(),
      'First': data.firstName || '',
      'Last': data.lastName || '',
      'Sex': data.sex || '',
      'Birth Year': data.birthYear || '',
      'Country (Birth)': data.countryOfBirth || '',
      'Country (Res)': data.countryOfResidence || '',
      'Email': data.email || '',
      'Phone Code': data.phoneCountryCode || '',
      'Phone': data.phoneNumber || '',
      'Ref. Campmate': data.referringCampmate || '',
      'Burns (RA)': burnsWithRA,
      'Burns (RA) Count': burnsWithRACount,
      'Burns (Other)': burnsWithoutRA,
      'Burns (Other) Count': burnsWithoutRACount,
      'First Burn?': data.firstBurn || CONFIG.DEFAULTS.DEFAULT_FIRST_BURN,
      'Likelihood': data.likelihoodOfAttending || '',
      'Steward Ticket?': data.stewardTicketInterest || '',
      'What Offer': data.whatYouOffer || '',
      'Notes': data.notes || '',
      'Status': CONFIG.DEFAULTS.DEFAULT_STATUS,
      'Reviewed By': '',
      'Reviewed At': '',
      'Internal Notes': '',
      'Form': data.formName || CONFIG.DEFAULTS.FORM_NAME,
      'Synced to Contacts': ''
    };
    
    // Build row array based on header order
    const row = headers.map(header => columnData[header] || '');
    
    // Append row to sheet
    sheet.appendRow(row);
    
    // Log successful submission
    Logger.log('Submission received from: ' + data.email);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success',
        success: true,
        message: 'Submission received'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error
    Logger.log('Error processing submission: ' + error.toString());
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test the doPost function with sample data
 * Go to: Run → testFormSubmission
 */
function testFormSubmission() {
  const testData = {
    firstName: 'Test',
    lastName: 'User',
    sex: 'Non-binary',
    birthYear: '1990',
    countryOfBirth: 'United States',
    countryOfResidence: 'United States',
    email: 'test@example.com',
    phoneCountryCode: '+1',
    phoneNumber: '5551234567',
    referringCampmate: 'Jane Doe',
    burnsWithRA: ['2014', '2015', '2016'],  // Array of years
    burnsWithoutRA: ['2022', '2023'],       // Array of years
    firstBurn: 'No',
    likelihoodOfAttending: 'Hell yeah!',
    stewardTicketInterest: 'Yes',
    whatYouOffer: 'Testing the form submission',
    notes: 'This is a test submission from Apps Script',
    formName: 'Statement of Intent 2026'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(mockEvent);
  const result = JSON.parse(response.getContent());
  
  if (result.success) {
    SpreadsheetApp.getUi().alert(
      '✅ Test submission successful!\n\n' +
      'Check ' + CONFIG.SHEETS.STAGING + ' tab for the test row.\n\n' +
      'Burns (RA): 2014, 2015, 2016 (Count: 3)\n' +
      'Burns (Other): 2022, 2023 (Count: 2)'
    );
  } else {
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + result.message);
  }
}

/**
 * Validate all sheet headers
 * Go to: Run → validateAllHeaders
 */
function validateAllHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabNames = getAllSheetNames();
  
  let report = '📋 Header Validation Report\n\n';
  let allValid = true;
  
  tabNames.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report += '❌ ' + tabName + ': Sheet not found\n';
      allValid = false;
      return;
    }
    
    const validation = validateHeaders(sheet);
    
    if (validation.valid) {
      report += '✅ ' + tabName + ': All headers correct\n';
    } else {
      report += '❌ ' + tabName + ':\n';
      if (validation.missing.length > 0) {
        report += '  Missing: ' + validation.missing.join(', ') + '\n';
      }
      if (validation.extra.length > 0) {
        report += '  Extra: ' + validation.extra.join(', ') + '\n';
      }
      allValid = false;
    }
  });
  
  report += '\n';
  if (allValid) {
    report += '✅ All sheets are correctly configured!';
  } else {
    report += '⚠️ Some sheets need attention.\nRun setupAllTabs() to fix.';
  }
  
  SpreadsheetApp.getUi().alert(report);
}

