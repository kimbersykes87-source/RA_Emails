// Rubber Armstrong 2026 - Unified Configuration
// Single source of truth for all Apps Script functions
// IMPORTANT: This is the ONLY place where column names and settings are defined.

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

const CONFIG = {
  // Sheet Names
  SHEETS: {
    STAGING: 'SOI_Staging',
    APPROVED: 'SOI_Approved',
    REJECTED: 'SOI_Rejected',
    ARCHIVE: 'SOI_2026',
    EMAIL_CAMPAIGN: 'Email_Campaign_2026'  // Email campaign tracking
  },
  
  // Column Headers (33 columns) - MUST match sheet exactly
  HEADERS: [
    'Timestamp',
    'First',
    'Last',
    'Sex',
    'Birth Year',
    'Country (Birth)',
    'Country (Res)',
    'Email',
    'Phone Code',
    'Phone',
    'Ref. Campmate',
    'Burns (RA)',
    'Burns (RA) Count',
    'Burns (Other)',
    'Burns (Other) Count',
    'First Burn?',
    'Likelihood',
    'Steward Ticket?',
    'What Offer',
    'Notes',
    'Status',
    'Reviewed By',
    'Reviewed At',
    'Internal Notes',
    'Form',
    'Synced to Contacts',
    // Email Tracking Columns (added for email campaign tracking)
    'Email Sent',          // Column 27 - Was invitation email sent?
    'Email Sent At',       // Column 28 - When was email sent
    'Email Opened',        // Column 29 - Did they open the email?
    'First Open At',       // Column 30 - When did they first open
    'Open Count',          // Column 31 - Number of times opened
    'Link Clicked',        // Column 32 - Did they click the SOI link?
    'First Click At'       // Column 33 - When did they first click
  ],
  
  // Data Validation Options
  VALIDATION: {
    SEX: ['Male', 'Female', 'Non-binary', 'Other'],
    FIRST_BURN: ['Yes', 'No'],
    LIKELIHOOD: ['Hell yeah!', 'Probably', 'Keep me in the loop'],
    STEWARD: ['Yes', 'No'],
    STATUS: ['Pending', 'Approved', 'Rejected']
  },
  
  // Google Contacts Settings
  CONTACTS: {
    LABEL: '2026 Rubbers',
    SYNC_ON_APPROVAL: true
  },
  
  // Form Defaults
  DEFAULTS: {
    FORM_NAME: 'Statement of Intent 2026',
    DEFAULT_STATUS: 'Pending',
    DEFAULT_FIRST_BURN: 'No'
  },
  
  // Conditional Formatting Colors
  COLORS: {
    PENDING: '#fff3cd',
    APPROVED: '#d4edda',
    REJECTED: '#f8d7da',
    HEADER: '#f3f3f3'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get column index (1-based) for a given header name
// Returns -1 if not found
function getColumnIndex(headerName) {
  const index = CONFIG.HEADERS.indexOf(headerName);
  return index === -1 ? -1 : index + 1;
}

// Get column letter for a given header name (e.g., 'A', 'B', 'AA')
// Returns null if not found
function getColumnLetter(headerName) {
  const index = getColumnIndex(headerName);
  if (index === -1) return null;
  
  let letter = '';
  let num = index;
  
  while (num > 0) {
    const remainder = (num - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    num = Math.floor((num - 1) / 26);
  }
  
  return letter;
}

// Get all sheet names as an array
function getAllSheetNames() {
  return Object.values(CONFIG.SHEETS);
}

// Get header row from a sheet
function getSheetHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// Validate that sheet headers match CONFIG.HEADERS
// Returns: { valid: boolean, missing: Array, extra: Array }
function validateHeaders(sheet) {
  const sheetHeaders = getSheetHeaders(sheet);
  const configHeaders = CONFIG.HEADERS;
  
  const missing = configHeaders.filter(h => !sheetHeaders.includes(h));
  const extra = sheetHeaders.filter(h => !configHeaders.includes(h));
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing: missing,
    extra: extra
  };
}

// ============================================================================
// EMAIL CAMPAIGN CONFIGURATION
// ============================================================================

const EMAIL_CONFIG = {
  SHEET_NAME: 'Email_Campaign_2026',
  EMAIL_SUBJECT: 'Rubber Armstrong 2026 - Statement of Intent Invitation',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: 8,
    FIRST_NAME: 2,
    PIXEL_URL: 34,             // AH
    CLICK_URL: 35,             // AI
    EMAIL_SENT: 27,            // AA
    EMAIL_SENT_AT: 28          // AB
  }
};

const REMINDER_CONFIG = {
  SHEET_NAME: 'Email_Campaign_2026',
  EMAIL_SUBJECT: 'Reminder: Complete Your Statement of Intent | Rubber Armstrong 2026',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: 8,
    FIRST_NAME: 2,
    PIXEL_URL: 43,             // AQ
    CLICK_URL: 44,             // AR
    REMINDER_SENT: 36,         // AJ
    REMINDER_SENT_AT: 37       // AK
  }
};

const CONFIRMATION_CONFIG = {
  SHEET_NAME: 'SOI_Approved',
  EMAIL_SUBJECT: 'Welcome to Rubber Armstrong 2026 | You\'re Approved!',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: 8,
    FIRST_NAME: 2,
    PIXEL_URL: 34,             // AH
    CONFIRMATION_SENT: 27,     // AA
    CONFIRMATION_SENT_AT: 28   // AB
  }
};

const TEST_EMAIL = 'kimbersykes87@gmail.com';

// Tracking URL generation (used by addAllTrackingUrls, etc.)
const TRACKING_WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
const TRACKING_CAMPAIGN_COLS = {
  SHEET_NAME: 'Email_Campaign_2026',
  EMAIL: 8, PIXEL_URL: 34, CLICK_URL: 35,
  REMINDER_PIXEL: 43, REMINDER_CLICK: 44
};
const TRACKING_APPROVED_COLS = {
  SHEET_NAME: 'SOI_Approved',
  EMAIL: 8, CONFIRMATION_PIXEL: 34
};

// ============================================================================
// TIMEZONE CONFIGURATION
// ============================================================================

const TIMEZONE = {
  LA: 'America/Los_Angeles',
  DENVER: 'America/Denver'
};

// ============================================================================
// ANALYTICS CONFIGURATION
// ============================================================================

const ANALYTICS_CONFIG = {
  // Your GA4 Property ID
  propertyId: 'properties/518391310',
  
  // Email to send reports to
  emailRecipient: 'rubberarmstrongcamp@gmail.com',
  
  // Report schedule
  schedule: {
    dayOfWeek: ScriptApp.WeekDay.MONDAY,
    hour: 9,
    timezone: TIMEZONE.LA
  },
  
  // Date range for weekly report
  dateRange: {
    startDate: '7daysAgo',
    endDate: 'yesterday'
  }
};
