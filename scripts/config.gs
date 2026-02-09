// Rubber Armstrong 2026 - Unified Configuration
// Single source of truth for all Apps Script functions
// IMPORTANT: This is the ONLY place where column names and settings are defined.
//
// Column letters used by the Cloudflare Worker are in:
//   cloudflare-worker/config.js (CAMPAIGN_COLUMNS)
// Keep Apps Script indices here and Worker letters there in sync.

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

  // Base column headers (33 columns) - used by SOI_Staging, SOI_Approved, SOI_Rejected, SOI_2026
  // FormHandler/setupAllTabs uses this for those tabs.
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
    // Invitation tracking (columns 27-33)
    'Email Sent',
    'Email Sent At',
    'Email Opened',
    'First Open At',
    'Open Count',
    'Link Clicked',
    'First Click At'
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

// Full headers for Email_Campaign_2026 (44 columns): base 33 + invitation URLs (2) + reminder block (9)
const HEADERS_EMAIL_CAMPAIGN = CONFIG.HEADERS.concat(
  ['PIXEL_TRACKING_URL', 'CLICK_TRACKING_URL'],
  [
    'Reminder_Sent', 'Reminder_Sent_At', 'Reminder_Opened', 'Reminder_First_Open_At',
    'Reminder_Open_Count', 'Reminder_Clicked', 'Reminder_First_Click_At',
    'Reminder_Pixel_URL', 'Reminder_Click_URL'
  ]
);

// Campaign → sheet name and column indices (1-based). Worker column letters: cloudflare-worker/config.js CAMPAIGN_COLUMNS
const CAMPAIGN_SHEET_COLUMNS = {
  invitation: {
    sheetName: 'Email_Campaign_2026',
    email: 8,
    firstName: 2,
    sent: 27,
    sentAt: 28,
    opened: 29,
    firstOpenAt: 30,
    openCount: 31,
    clicked: 32,
    firstClickAt: 33,
    pixelUrl: 34,
    clickUrl: 35
  },
  reminder: {
    sheetName: 'Email_Campaign_2026',
    email: 8,
    firstName: 2,
    sent: 36,
    sentAt: 37,
    opened: 38,
    firstOpenAt: 39,
    openCount: 40,
    clicked: 41,
    firstClickAt: 42,
    pixelUrl: 43,
    clickUrl: 44
  },
  confirmation: {
    sheetName: 'SOI_Approved',
    email: 8,
    firstName: 2,
    sent: 27,
    sentAt: 28,
    opened: 29,
    firstOpenAt: 30,
    openCount: 31,
    clicked: null,
    firstClickAt: null,
    pixelUrl: 34
  }
};

// Campaign registry for future campaigns. Add new entries (e.g. 2027) when adding a new tab + config.
const CAMPAIGN_REGISTRY = [
  { id: '2026', invitationSheet: 'Email_Campaign_2026', approvedSheet: 'SOI_Approved' }
];

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
  return getColumnLetterByIndex(index);
}

// Get column letter for a 1-based column index (e.g. 34 -> 'AH')
function getColumnLetterByIndex(index) {
  if (index < 1) return null;
  let letter = '';
  let num = index;
  while (num > 0) {
    const remainder = (num - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

// Get column index (1-based) for a header in the Email_Campaign_2026 header set (44 columns)
function getCampaignColumnIndex(headerName) {
  const idx = HEADERS_EMAIL_CAMPAIGN.indexOf(headerName);
  return idx === -1 ? -1 : idx + 1;
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
// Column indices match CAMPAIGN_SHEET_COLUMNS (invitation / reminder / confirmation).
// ============================================================================

const EMAIL_CONFIG = {
  SHEET_NAME: CONFIG.SHEETS.EMAIL_CAMPAIGN,
  EMAIL_SUBJECT: 'Rubber Armstrong 2026 - Statement of Intent Invitation',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: CAMPAIGN_SHEET_COLUMNS.invitation.email,
    FIRST_NAME: CAMPAIGN_SHEET_COLUMNS.invitation.firstName,
    PIXEL_URL: CAMPAIGN_SHEET_COLUMNS.invitation.pixelUrl,
    CLICK_URL: CAMPAIGN_SHEET_COLUMNS.invitation.clickUrl,
    EMAIL_SENT: CAMPAIGN_SHEET_COLUMNS.invitation.sent,
    EMAIL_SENT_AT: CAMPAIGN_SHEET_COLUMNS.invitation.sentAt
  }
};

const REMINDER_CONFIG = {
  SHEET_NAME: CAMPAIGN_SHEET_COLUMNS.reminder.sheetName,
  EMAIL_SUBJECT: 'Reminder: Complete Your Statement of Intent | Rubber Armstrong 2026',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: CAMPAIGN_SHEET_COLUMNS.reminder.email,
    FIRST_NAME: CAMPAIGN_SHEET_COLUMNS.reminder.firstName,
    PIXEL_URL: CAMPAIGN_SHEET_COLUMNS.reminder.pixelUrl,
    CLICK_URL: CAMPAIGN_SHEET_COLUMNS.reminder.clickUrl,
    REMINDER_SENT: CAMPAIGN_SHEET_COLUMNS.reminder.sent,
    REMINDER_SENT_AT: CAMPAIGN_SHEET_COLUMNS.reminder.sentAt
  }
};

const CONFIRMATION_CONFIG = {
  SHEET_NAME: CAMPAIGN_SHEET_COLUMNS.confirmation.sheetName,
  EMAIL_SUBJECT: 'Welcome to Rubber Armstrong 2026 | You\'re Approved!',
  FROM_NAME: 'Rubber Armstrong',
  BATCH_SIZE: 50,
  MAX_PER_DAY: 150,
  DELAY_BETWEEN_EMAILS: 1000,
  COLUMNS: {
    EMAIL: CAMPAIGN_SHEET_COLUMNS.confirmation.email,
    FIRST_NAME: CAMPAIGN_SHEET_COLUMNS.confirmation.firstName,
    PIXEL_URL: CAMPAIGN_SHEET_COLUMNS.confirmation.pixelUrl,
    CONFIRMATION_SENT: CAMPAIGN_SHEET_COLUMNS.confirmation.sent,
    CONFIRMATION_SENT_AT: CAMPAIGN_SHEET_COLUMNS.confirmation.sentAt
  }
};

const TEST_EMAIL = 'kimbersykes87@gmail.com';

// Tracking URL generation (used by addAllTrackingUrls, etc.)
const TRACKING_WORKER_URL = 'https://email-tracking-worker.kimbersykes87.workers.dev';
const TRACKING_CAMPAIGN_COLS = {
  SHEET_NAME: CAMPAIGN_SHEET_COLUMNS.invitation.sheetName,
  EMAIL: CAMPAIGN_SHEET_COLUMNS.invitation.email,
  PIXEL_URL: CAMPAIGN_SHEET_COLUMNS.invitation.pixelUrl,
  CLICK_URL: CAMPAIGN_SHEET_COLUMNS.invitation.clickUrl,
  REMINDER_PIXEL: CAMPAIGN_SHEET_COLUMNS.reminder.pixelUrl,
  REMINDER_CLICK: CAMPAIGN_SHEET_COLUMNS.reminder.clickUrl
};
const TRACKING_APPROVED_COLS = {
  SHEET_NAME: CAMPAIGN_SHEET_COLUMNS.confirmation.sheetName,
  EMAIL: CAMPAIGN_SHEET_COLUMNS.confirmation.email,
  CONFIRMATION_PIXEL: CAMPAIGN_SHEET_COLUMNS.confirmation.pixelUrl
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
