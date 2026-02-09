# Sheet Layout Reference

This document is the single reference for tab names and column layout. Apps Script uses **column indices** (1-based) defined in `scripts/config.gs` (`CONFIG.HEADERS`, `HEADERS_EMAIL_CAMPAIGN`, `CAMPAIGN_SHEET_COLUMNS`). The Cloudflare Worker uses **column letters** in `cloudflare-worker/config.js` (`CAMPAIGN_COLUMNS`). Keep these in sync when adding columns or campaigns.

## Tabs and purpose

| Tab name | Purpose |
|----------|---------|
| SOI_Staging | New SOI form submissions; review and set Status here. |
| SOI_Approved | Rows moved here when Status = Approved; confirmation emails and tracking. |
| SOI_Rejected | Rows moved here when Status = Rejected. |
| SOI_2026 | Archive. |
| Email_Campaign_2026 | Invitation and reminder campaign recipients; invitation and reminder tracking. |

## Email_Campaign_2026 (44 columns)

Columns 1–33 match the base SOI layout (same as CONFIG.HEADERS). Columns 34–35 are invitation tracking URLs; 36–44 are the reminder block.

| Index | Letter | Header | Used by |
|-------|--------|--------|---------|
| 1 | A | Timestamp | — |
| 2 | B | First | Invitation, Reminder |
| 3 | C | Last | — |
| 4–7 | D–G | Sex, Birth Year, Country (Birth), Country (Res) | — |
| 8 | H | Email | All campaigns |
| 9–26 | I–Z | Phone, Ref. Campmate, Burns, etc. | — |
| 27 | AA | Email Sent | Invitation |
| 28 | AB | Email Sent At | Invitation |
| 29 | AC | Email Opened | Invitation (Worker: opened) |
| 30 | AD | First Open At | Invitation (Worker: firstOpenAt) |
| 31 | AE | Open Count | Invitation (Worker: openCount) |
| 32 | AF | Link Clicked | Invitation (Worker: clicked) |
| 33 | AG | First Click At | Invitation (Worker: firstClickAt) |
| 34 | AH | PIXEL_TRACKING_URL | Invitation |
| 35 | AI | CLICK_TRACKING_URL | Invitation |
| 36 | AJ | Reminder_Sent | Reminder |
| 37 | AK | Reminder_Sent_At | Reminder |
| 38 | AL | Reminder_Opened | Reminder (Worker: opened) |
| 39 | AM | Reminder_First_Open_At | Reminder (Worker: firstOpenAt) |
| 40 | AN | Reminder_Open_Count | Reminder (Worker: openCount) |
| 41 | AO | Reminder_Clicked | Reminder (Worker: clicked) |
| 42 | AP | Reminder_First_Click_At | Reminder (Worker: firstClickAt) |
| 43 | AQ | Reminder_Pixel_URL | Reminder |
| 44 | AR | Reminder_Click_URL | Reminder |

## SOI_Approved – confirmation tracking

Confirmation email and tracking reuse the same column indices as the base + invitation block (columns 27–34). The Worker writes open tracking to AC, AD, AE (no click CTA for confirmation).

| Index | Letter | Header | Used by |
|-------|--------|--------|---------|
| 27 | AA | Confirmation_Sent | Confirmation |
| 28 | AB | Confirmation_Sent_At | Confirmation |
| 29 | AC | Confirmation_Opened | Confirmation (Worker: opened) |
| 30 | AD | Confirmation_First_Open_At | Confirmation (Worker: firstOpenAt) |
| 31 | AE | Confirmation_Open_Count | Confirmation (Worker: openCount) |
| 32–33 | AF–AG | Link Clicked, First Click At | Unused for confirmation |
| 34 | AH | Confirmation_Pixel_URL | Confirmation |

## Worker column mapping

Column **letters** used by the Cloudflare Worker are defined in `cloudflare-worker/config.js` under `CAMPAIGN_COLUMNS` (invitation, reminder, confirmation). Do not change letters there without updating this doc and the Apps Script config comments.
