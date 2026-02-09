/**
 * Configuration for email tracking worker
 */

/**
 * 1x1 transparent GIF pixel (base64 decoded)
 * This is the smallest possible GIF file
 */
export const TRACKING_PIXEL_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  c => c.charCodeAt(0)
);

/**
 * Link redirect URLs
 * Maps link IDs to destination URLs
 */
export const REDIRECT_URLS = {
  // Main SOI form (invitation)
  soi_form: 'https://soi.rubberarmstrong.com',
  // Reminder CTA (same destination, different tracking)
  reminder_soi_form: 'https://soi.rubberarmstrong.com',

  // Unsubscribe (redirects to a form or email)
  unsubscribe: 'mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe',

  // Main website
  main_site: 'https://rubberarmstrong.com',

  // Default fallback
  default: 'https://rubberarmstrong.com'
};

/**
 * Campaign → sheet tab and column mapping (column letters only; Worker uses letters for Sheets API).
 * Sheet column layout and 1-based indices: scripts/config.gs (CAMPAIGN_SHEET_COLUMNS, HEADERS_EMAIL_CAMPAIGN).
 * Pixel paths: /p/{hash}.gif | /p/{hash}/reminder.gif | /p/{hash}/confirmation.gif
 * Click paths: /c/{hash}/soi_form (invitation) | /c/{hash}/reminder_soi_form (reminder)
 */
export const CAMPAIGN_COLUMNS = {
  invitation: {
    sheetTab: 'Email_Campaign_2026',
    opened: 'AC',
    firstOpenAt: 'AD',
    openCount: 'AE',
    clicked: 'AF',
    firstClickAt: 'AG',
  },
  reminder: {
    sheetTab: 'Email_Campaign_2026',
    opened: 'AL',
    firstOpenAt: 'AM',
    openCount: 'AN',
    clicked: 'AO',
    firstClickAt: 'AP',
  },
  confirmation: {
    sheetTab: 'SOI_Approved',
    opened: 'AC',
    firstOpenAt: 'AD',
    openCount: 'AE',
    clicked: null,  // No CTA
    firstClickAt: null,
  },
};

