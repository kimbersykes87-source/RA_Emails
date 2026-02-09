# Contacts Cleaned CSV Usage Guide

This guide explains how to use the cleaned contacts file for the 2026 campaign with the email tracking workflow.

## Source File
- Path: `assets/contacts-cleaned.csv`
- Canonical roster for 2026 (addresses removed, phones/emails standardized, year columns added).
- Columns: First Name, Last Name, Middle Name, Nickname, Email, Email 2, Phone 1-3, Birthday, Year_2019/2022/2023/2024/2025/2026, Steward_Interest, Notes.

## Import into SOI Google Sheet
1. Open the SOI Google Sheet (tab `SOI_Staging` or your working tab).
2. File → Import → Upload `contacts-cleaned.csv`.
3. Replace or append as needed; ensure the email column remains column H (used by the Cloudflare Worker).
4. Keep the Year_YYYY columns for filtering segments before sending.

## Prepare Recipients for Sending
You need an EmailHash for tracking pixel and links. Use the existing helper:

```bash
cd scripts
node test-tracking.js batch ../assets/contacts-cleaned.csv > recipients_ready.txt
```

If you prefer per-email:
```bash
node test-tracking.js encode someone@example.com
```

Expected output columns (for mail merge or staging sheet):
- First Name, Last Name, Email, EmailHash, Year_2019..Year_2026, Steward_Interest (others optional)

## Embed Tracking in Templates
Use `EmailHash` from the prepared output:
- Pixel: `https://track.rubberarmstrong.com/p/{EmailHash}.gif`
- SOI CTA: `https://track.rubberarmstrong.com/c/{EmailHash}/soi_form`

Templates live in `templates/` (HTML and TXT). Ensure your mail merge substitutes `EmailHash`.

## Sending Workflow (quick checklist)
1. Generate `recipients_ready` with hashes (see above).
2. Load into your sending tool/mail merge with fields: First Name, Email, EmailHash, optional segmentation fields.
3. Verify tracking links render correctly in a test send to yourself.
4. Send batch; the Cloudflare Worker will update the sheet (AC-AG columns) on opens/clicks.

## Follow-up & Segmentation
- Use Year_YYYY and Steward_Interest from the cleaned file to target initial sends.
- After sending, use tracking columns in the sheet:
  - Non-openers: Email Sent = Yes, Email Opened = No/blank.
  - Opened but no click: Email Opened = Yes, Link Clicked = No/blank.
  - Clicked but no submit: Link Clicked = Yes, Timestamp blank.

## File Hygiene
- Keep `contacts-cleaned.csv` under version control as the canonical list.
- Retire `contacts (1).csv` or move it to an archive to avoid confusion.
- If you re-clean a new export, overwrite `contacts-cleaned.csv` and rerun recipient prep.



