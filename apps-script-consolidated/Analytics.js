/**
 * Rubber Armstrong 2026 - Google Analytics Reporting
 * Sends weekly email reports with visitor stats and country breakdown
 */

// ============================================================================
// SETUP FUNCTION
// ============================================================================

/**
 * Set up weekly trigger (run this once manually)
 * Go to: Run → setupWeeklyAnalytics
 */
function setupWeeklyAnalytics() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyAnalyticsReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('sendWeeklyAnalyticsReport')
    .timeBased()
    .onWeekDay(ANALYTICS_CONFIG.schedule.dayOfWeek)
    .atHour(ANALYTICS_CONFIG.schedule.hour)
    .inTimezone(ANALYTICS_CONFIG.schedule.timezone)
    .create();
  
  Logger.log('Weekly trigger created successfully');
  
  SpreadsheetApp.getUi().alert(
    '✅ Weekly analytics report enabled!\n\n' +
    'Schedule: Every ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Recipient: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
    'Test it now by running: testAnalyticsReport'
  );
}

// ============================================================================
// MAIN REPORT FUNCTION
// ============================================================================

/**
 * Main function - runs weekly via trigger
 */
function sendWeeklyAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    sendEmail(emailBody);
    Logger.log('Weekly analytics report sent successfully');
  } catch (error) {
    Logger.log('Error sending weekly report: ' + error.message);
    // Send error notification
    MailApp.sendEmail({
      to: ANALYTICS_CONFIG.emailRecipient,
      subject: 'RA Analytics Report Error',
      body: 'Failed to generate analytics report: ' + error.message
    });
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch analytics data from GA4
 * @returns {Object} Parsed analytics data
 */
function getAnalyticsData() {
  const request = {
    dateRanges: [{
      startDate: ANALYTICS_CONFIG.dateRange.startDate,
      endDate: ANALYTICS_CONFIG.dateRange.endDate
    }],
    dimensions: [
      { name: 'country' }
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' }
    ]
  };
  
  const response = AnalyticsData.Properties.runReport(request, ANALYTICS_CONFIG.propertyId);
  
  return parseAnalyticsResponse(response);
}

/**
 * Parse GA4 API response
 * @param {Object} response - GA4 API response
 * @returns {Object} Parsed data with totals and country breakdown
 */
function parseAnalyticsResponse(response) {
  const data = {
    totalUsers: 0,
    totalSessions: 0,
    totalPageViews: 0,
    countries: []
  };
  
  if (!response.rows) {
    return data;
  }
  
  response.rows.forEach(row => {
    const country = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    const pageViews = parseInt(row.metricValues[2].value);
    
    data.totalUsers += users;
    data.totalSessions += sessions;
    data.totalPageViews += pageViews;
    
    data.countries.push({
      country: country,
      users: users,
      sessions: sessions,
      pageViews: pageViews
    });
  });
  
  // Sort countries by user count (descending)
  data.countries.sort((a, b) => b.users - a.users);
  
  return data;
}

// ============================================================================
// EMAIL FORMATTING
// ============================================================================

/**
 * Format data into email body
 * @param {Object} data - Parsed analytics data
 * @returns {string} Formatted email body
 */
function formatEmailReport(data) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd, yyyy');
  
  let body = `Rubber Armstrong Website Analytics - Weekly Report\n`;
  body += `Period: ${dateStr}\n`;
  body += `${'='.repeat(60)}\n\n`;
  
  // Summary
  body += `SUMMARY\n`;
  body += `${'-'.repeat(60)}\n`;
  body += `Unique Visitors: ${data.totalUsers}\n`;
  body += `Total Sessions: ${data.totalSessions}\n`;
  body += `Total Page Views: ${data.totalPageViews}\n\n`;
  
  // Country breakdown
  body += `VISITORS BY COUNTRY\n`;
  body += `${'-'.repeat(60)}\n`;
  
  if (data.countries.length === 0) {
    body += `No visitors recorded\n`;
  } else {
    data.countries.forEach((country, index) => {
      body += `${index + 1}. ${country.country}: ${country.users} visitor${country.users !== 1 ? 's' : ''}\n`;
    });
  }
  
  body += `\n${'-'.repeat(60)}\n`;
  body += `View full analytics: https://analytics.google.com/\n`;
  
  return body;
}

/**
 * Send email report
 * @param {string} body - Email body content
 */
function sendEmail(body) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd');
  
  MailApp.sendEmail({
    to: ANALYTICS_CONFIG.emailRecipient,
    subject: `RA Website Analytics - ${dateStr}`,
    body: body
  });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test function - run manually to test email with real data
 * Go to: Run → testAnalyticsReport
 */
function testAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    Logger.log(emailBody);
    sendEmail(emailBody);
    
    SpreadsheetApp.getUi().alert(
      '✅ Test report sent!\n\n' +
      'Check your email: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
      'Data:\n' +
      'Unique Visitors: ' + report.totalUsers + '\n' +
      'Countries: ' + report.countries.length
    );
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
  }
}

/**
 * Test with sample data (no API call)
 * Go to: Run → testAnalyticsReportWithSampleData
 */
function testAnalyticsReportWithSampleData() {
  const testData = {
    totalUsers: 42,
    totalSessions: 58,
    totalPageViews: 127,
    countries: [
      { country: 'United States', users: 15, sessions: 22, pageViews: 45 },
      { country: 'United Kingdom', users: 8, sessions: 11, pageViews: 28 },
      { country: 'Australia', users: 7, sessions: 9, pageViews: 19 },
      { country: 'Canada', users: 5, sessions: 7, pageViews: 15 },
      { country: 'Germany', users: 4, sessions: 5, pageViews: 12 },
      { country: 'Netherlands', users: 3, sessions: 4, pageViews: 8 }
    ]
  };
  
  const emailBody = formatEmailReport(testData);
  Logger.log(emailBody);
  sendEmail(emailBody);
  
  SpreadsheetApp.getUi().alert(
    '✅ Test email sent with sample data!\n\n' +
    'Check your email: ' + ANALYTICS_CONFIG.emailRecipient
  );
}

/**
 * View current analytics configuration
 * Go to: Run → viewAnalyticsConfig
 */
function viewAnalyticsConfig() {
  const config = 
    '📊 Analytics Configuration\n\n' +
    'Property ID: ' + ANALYTICS_CONFIG.propertyId + '\n' +
    'Email: ' + ANALYTICS_CONFIG.emailRecipient + '\n' +
    'Schedule: ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Date Range: ' + ANALYTICS_CONFIG.dateRange.startDate + ' to ' + ANALYTICS_CONFIG.dateRange.endDate;
  
  Logger.log(config);
  SpreadsheetApp.getUi().alert(config);
}

/**
 * Rubber Armstrong 2026 - Google Analytics Reporting
 * Sends weekly email reports with visitor stats and country breakdown
 */

// ============================================================================
// SETUP FUNCTION
// ============================================================================

/**
 * Set up weekly trigger (run this once manually)
 * Go to: Run → setupWeeklyAnalytics
 */
function setupWeeklyAnalytics() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyAnalyticsReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('sendWeeklyAnalyticsReport')
    .timeBased()
    .onWeekDay(ANALYTICS_CONFIG.schedule.dayOfWeek)
    .atHour(ANALYTICS_CONFIG.schedule.hour)
    .inTimezone(ANALYTICS_CONFIG.schedule.timezone)
    .create();
  
  Logger.log('Weekly trigger created successfully');
  
  SpreadsheetApp.getUi().alert(
    '✅ Weekly analytics report enabled!\n\n' +
    'Schedule: Every ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Recipient: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
    'Test it now by running: testAnalyticsReport'
  );
}

// ============================================================================
// MAIN REPORT FUNCTION
// ============================================================================

/**
 * Main function - runs weekly via trigger
 */
function sendWeeklyAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    sendEmail(emailBody);
    Logger.log('Weekly analytics report sent successfully');
  } catch (error) {
    Logger.log('Error sending weekly report: ' + error.message);
    // Send error notification
    MailApp.sendEmail({
      to: ANALYTICS_CONFIG.emailRecipient,
      subject: 'RA Analytics Report Error',
      body: 'Failed to generate analytics report: ' + error.message
    });
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch analytics data from GA4
 * @returns {Object} Parsed analytics data
 */
function getAnalyticsData() {
  const request = {
    dateRanges: [{
      startDate: ANALYTICS_CONFIG.dateRange.startDate,
      endDate: ANALYTICS_CONFIG.dateRange.endDate
    }],
    dimensions: [
      { name: 'country' }
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' }
    ]
  };
  
  const response = AnalyticsData.Properties.runReport(request, ANALYTICS_CONFIG.propertyId);
  
  return parseAnalyticsResponse(response);
}

/**
 * Parse GA4 API response
 * @param {Object} response - GA4 API response
 * @returns {Object} Parsed data with totals and country breakdown
 */
function parseAnalyticsResponse(response) {
  const data = {
    totalUsers: 0,
    totalSessions: 0,
    totalPageViews: 0,
    countries: []
  };
  
  if (!response.rows) {
    return data;
  }
  
  response.rows.forEach(row => {
    const country = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    const pageViews = parseInt(row.metricValues[2].value);
    
    data.totalUsers += users;
    data.totalSessions += sessions;
    data.totalPageViews += pageViews;
    
    data.countries.push({
      country: country,
      users: users,
      sessions: sessions,
      pageViews: pageViews
    });
  });
  
  // Sort countries by user count (descending)
  data.countries.sort((a, b) => b.users - a.users);
  
  return data;
}

// ============================================================================
// EMAIL FORMATTING
// ============================================================================

/**
 * Format data into email body
 * @param {Object} data - Parsed analytics data
 * @returns {string} Formatted email body
 */
function formatEmailReport(data) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd, yyyy');
  
  let body = `Rubber Armstrong Website Analytics - Weekly Report\n`;
  body += `Period: ${dateStr}\n`;
  body += `${'='.repeat(60)}\n\n`;
  
  // Summary
  body += `SUMMARY\n`;
  body += `${'-'.repeat(60)}\n`;
  body += `Unique Visitors: ${data.totalUsers}\n`;
  body += `Total Sessions: ${data.totalSessions}\n`;
  body += `Total Page Views: ${data.totalPageViews}\n\n`;
  
  // Country breakdown
  body += `VISITORS BY COUNTRY\n`;
  body += `${'-'.repeat(60)}\n`;
  
  if (data.countries.length === 0) {
    body += `No visitors recorded\n`;
  } else {
    data.countries.forEach((country, index) => {
      body += `${index + 1}. ${country.country}: ${country.users} visitor${country.users !== 1 ? 's' : ''}\n`;
    });
  }
  
  body += `\n${'-'.repeat(60)}\n`;
  body += `View full analytics: https://analytics.google.com/\n`;
  
  return body;
}

/**
 * Send email report
 * @param {string} body - Email body content
 */
function sendEmail(body) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd');
  
  MailApp.sendEmail({
    to: ANALYTICS_CONFIG.emailRecipient,
    subject: `RA Website Analytics - ${dateStr}`,
    body: body
  });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test function - run manually to test email with real data
 * Go to: Run → testAnalyticsReport
 */
function testAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    Logger.log(emailBody);
    sendEmail(emailBody);
    
    SpreadsheetApp.getUi().alert(
      '✅ Test report sent!\n\n' +
      'Check your email: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
      'Data:\n' +
      'Unique Visitors: ' + report.totalUsers + '\n' +
      'Countries: ' + report.countries.length
    );
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
  }
}

/**
 * Test with sample data (no API call)
 * Go to: Run → testAnalyticsReportWithSampleData
 */
function testAnalyticsReportWithSampleData() {
  const testData = {
    totalUsers: 42,
    totalSessions: 58,
    totalPageViews: 127,
    countries: [
      { country: 'United States', users: 15, sessions: 22, pageViews: 45 },
      { country: 'United Kingdom', users: 8, sessions: 11, pageViews: 28 },
      { country: 'Australia', users: 7, sessions: 9, pageViews: 19 },
      { country: 'Canada', users: 5, sessions: 7, pageViews: 15 },
      { country: 'Germany', users: 4, sessions: 5, pageViews: 12 },
      { country: 'Netherlands', users: 3, sessions: 4, pageViews: 8 }
    ]
  };
  
  const emailBody = formatEmailReport(testData);
  Logger.log(emailBody);
  sendEmail(emailBody);
  
  SpreadsheetApp.getUi().alert(
    '✅ Test email sent with sample data!\n\n' +
    'Check your email: ' + ANALYTICS_CONFIG.emailRecipient
  );
}

/**
 * View current analytics configuration
 * Go to: Run → viewAnalyticsConfig
 */
function viewAnalyticsConfig() {
  const config = 
    '📊 Analytics Configuration\n\n' +
    'Property ID: ' + ANALYTICS_CONFIG.propertyId + '\n' +
    'Email: ' + ANALYTICS_CONFIG.emailRecipient + '\n' +
    'Schedule: ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Date Range: ' + ANALYTICS_CONFIG.dateRange.startDate + ' to ' + ANALYTICS_CONFIG.dateRange.endDate;
  
  Logger.log(config);
  SpreadsheetApp.getUi().alert(config);
}

/**
 * Rubber Armstrong 2026 - Google Analytics Reporting
 * Sends weekly email reports with visitor stats and country breakdown
 */

// ============================================================================
// SETUP FUNCTION
// ============================================================================

/**
 * Set up weekly trigger (run this once manually)
 * Go to: Run → setupWeeklyAnalytics
 */
function setupWeeklyAnalytics() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyAnalyticsReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('sendWeeklyAnalyticsReport')
    .timeBased()
    .onWeekDay(ANALYTICS_CONFIG.schedule.dayOfWeek)
    .atHour(ANALYTICS_CONFIG.schedule.hour)
    .inTimezone(ANALYTICS_CONFIG.schedule.timezone)
    .create();
  
  Logger.log('Weekly trigger created successfully');
  
  SpreadsheetApp.getUi().alert(
    '✅ Weekly analytics report enabled!\n\n' +
    'Schedule: Every ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Recipient: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
    'Test it now by running: testAnalyticsReport'
  );
}

// ============================================================================
// MAIN REPORT FUNCTION
// ============================================================================

/**
 * Main function - runs weekly via trigger
 */
function sendWeeklyAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    sendEmail(emailBody);
    Logger.log('Weekly analytics report sent successfully');
  } catch (error) {
    Logger.log('Error sending weekly report: ' + error.message);
    // Send error notification
    MailApp.sendEmail({
      to: ANALYTICS_CONFIG.emailRecipient,
      subject: 'RA Analytics Report Error',
      body: 'Failed to generate analytics report: ' + error.message
    });
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch analytics data from GA4
 * @returns {Object} Parsed analytics data
 */
function getAnalyticsData() {
  const request = {
    dateRanges: [{
      startDate: ANALYTICS_CONFIG.dateRange.startDate,
      endDate: ANALYTICS_CONFIG.dateRange.endDate
    }],
    dimensions: [
      { name: 'country' }
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' }
    ]
  };
  
  const response = AnalyticsData.Properties.runReport(request, ANALYTICS_CONFIG.propertyId);
  
  return parseAnalyticsResponse(response);
}

/**
 * Parse GA4 API response
 * @param {Object} response - GA4 API response
 * @returns {Object} Parsed data with totals and country breakdown
 */
function parseAnalyticsResponse(response) {
  const data = {
    totalUsers: 0,
    totalSessions: 0,
    totalPageViews: 0,
    countries: []
  };
  
  if (!response.rows) {
    return data;
  }
  
  response.rows.forEach(row => {
    const country = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    const pageViews = parseInt(row.metricValues[2].value);
    
    data.totalUsers += users;
    data.totalSessions += sessions;
    data.totalPageViews += pageViews;
    
    data.countries.push({
      country: country,
      users: users,
      sessions: sessions,
      pageViews: pageViews
    });
  });
  
  // Sort countries by user count (descending)
  data.countries.sort((a, b) => b.users - a.users);
  
  return data;
}

// ============================================================================
// EMAIL FORMATTING
// ============================================================================

/**
 * Format data into email body
 * @param {Object} data - Parsed analytics data
 * @returns {string} Formatted email body
 */
function formatEmailReport(data) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd, yyyy');
  
  let body = `Rubber Armstrong Website Analytics - Weekly Report\n`;
  body += `Period: ${dateStr}\n`;
  body += `${'='.repeat(60)}\n\n`;
  
  // Summary
  body += `SUMMARY\n`;
  body += `${'-'.repeat(60)}\n`;
  body += `Unique Visitors: ${data.totalUsers}\n`;
  body += `Total Sessions: ${data.totalSessions}\n`;
  body += `Total Page Views: ${data.totalPageViews}\n\n`;
  
  // Country breakdown
  body += `VISITORS BY COUNTRY\n`;
  body += `${'-'.repeat(60)}\n`;
  
  if (data.countries.length === 0) {
    body += `No visitors recorded\n`;
  } else {
    data.countries.forEach((country, index) => {
      body += `${index + 1}. ${country.country}: ${country.users} visitor${country.users !== 1 ? 's' : ''}\n`;
    });
  }
  
  body += `\n${'-'.repeat(60)}\n`;
  body += `View full analytics: https://analytics.google.com/\n`;
  
  return body;
}

/**
 * Send email report
 * @param {string} body - Email body content
 */
function sendEmail(body) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const dateStr = Utilities.formatDate(startDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd') + 
                  ' - ' + 
                  Utilities.formatDate(endDate, ANALYTICS_CONFIG.schedule.timezone, 'MMM dd');
  
  MailApp.sendEmail({
    to: ANALYTICS_CONFIG.emailRecipient,
    subject: `RA Website Analytics - ${dateStr}`,
    body: body
  });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test function - run manually to test email with real data
 * Go to: Run → testAnalyticsReport
 */
function testAnalyticsReport() {
  try {
    const report = getAnalyticsData();
    const emailBody = formatEmailReport(report);
    Logger.log(emailBody);
    sendEmail(emailBody);
    
    SpreadsheetApp.getUi().alert(
      '✅ Test report sent!\n\n' +
      'Check your email: ' + ANALYTICS_CONFIG.emailRecipient + '\n\n' +
      'Data:\n' +
      'Unique Visitors: ' + report.totalUsers + '\n' +
      'Countries: ' + report.countries.length
    );
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
  }
}

/**
 * Test with sample data (no API call)
 * Go to: Run → testAnalyticsReportWithSampleData
 */
function testAnalyticsReportWithSampleData() {
  const testData = {
    totalUsers: 42,
    totalSessions: 58,
    totalPageViews: 127,
    countries: [
      { country: 'United States', users: 15, sessions: 22, pageViews: 45 },
      { country: 'United Kingdom', users: 8, sessions: 11, pageViews: 28 },
      { country: 'Australia', users: 7, sessions: 9, pageViews: 19 },
      { country: 'Canada', users: 5, sessions: 7, pageViews: 15 },
      { country: 'Germany', users: 4, sessions: 5, pageViews: 12 },
      { country: 'Netherlands', users: 3, sessions: 4, pageViews: 8 }
    ]
  };
  
  const emailBody = formatEmailReport(testData);
  Logger.log(emailBody);
  sendEmail(emailBody);
  
  SpreadsheetApp.getUi().alert(
    '✅ Test email sent with sample data!\n\n' +
    'Check your email: ' + ANALYTICS_CONFIG.emailRecipient
  );
}

/**
 * View current analytics configuration
 * Go to: Run → viewAnalyticsConfig
 */
function viewAnalyticsConfig() {
  const config = 
    '📊 Analytics Configuration\n\n' +
    'Property ID: ' + ANALYTICS_CONFIG.propertyId + '\n' +
    'Email: ' + ANALYTICS_CONFIG.emailRecipient + '\n' +
    'Schedule: ' + ANALYTICS_CONFIG.schedule.dayOfWeek + ' at ' + ANALYTICS_CONFIG.schedule.hour + ':00\n' +
    'Timezone: ' + ANALYTICS_CONFIG.schedule.timezone + '\n' +
    'Date Range: ' + ANALYTICS_CONFIG.dateRange.startDate + ' to ' + ANALYTICS_CONFIG.dateRange.endDate;
  
  Logger.log(config);
  SpreadsheetApp.getUi().alert(config);
}

