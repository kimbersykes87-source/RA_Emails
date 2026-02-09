# Sheet Setup for SOI Reminder & Confirmation

For full column reference (index, letter, header, which campaign uses it), see **[SHEET_LAYOUT.md](SHEET_LAYOUT.md)**.

## Before Testing or Sending

### 1. Add columns (or run Setup Sheet Columns)

**Email_Campaign_2026** needs columns through AR (44 total). Reminder block: AJ–AR (Reminder_Sent through Reminder_Click_URL). **SOI_Approved** needs column AH (34) for Confirmation_Pixel_URL. Easiest: run **Email Campaign → Tracking URLs → Setup Sheet Columns** once; it uses `scripts/config.gs` (HEADERS_EMAIL_CAMPAIGN, CAMPAIGN_SHEET_COLUMNS).

### 2. Add kimbersykes87@gmail.com for Testing

For pixel/click tracking to work during tests:

- **Email_Campaign_2026**: Add a row with kimbersykes87@gmail.com (any name). Run "Add All Tracking URLs" to populate Invitation + Reminder URLs.
- **SOI_Approved**: Add a row with kimbersykes87@gmail.com. Run "Add Confirmation URLs only" to populate the pixel URL.

### 3. Run Add All Tracking URLs

From menu: **Email Campaign → Tracking URLs → Add All Tracking URLs**

This populates Invitation (AH–AI), Reminder (AQ–AR), and Confirmation (AH on SOI_Approved).

## Testing Order

1. Run **Test Invitation** → open email → click CTA → verify columns AC–AG update.
2. Run **Test Reminder** → open email → click CTA → verify columns AL–AP update.
3. Run **Test Confirmation** → open email → verify columns AC–AE update on SOI_Approved.
