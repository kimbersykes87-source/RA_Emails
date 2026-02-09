# Email Template Usage

## Active Templates

| Template | Campaign | Use |
|----------|----------|-----|
| `invitation-2026-final.html` | Invitation | Primary SOI invitation |
| `soi-reminder.html` | SOI Reminder | Reminder to complete SOI (sent to Email_Campaign_2026 \ SOI_Approved) |
| `confirmation.html` | Confirmation | Congratulations to approved applicants (SOI_Approved only) |
| `invitation-2026.html` | — | Reference only, not actively used |

**`gmail-automation.gs`** includes inline template functions for all three campaigns:
- `getEmailTemplate()` – Invitation
- `getSOIReminderTemplate()` – Reminder
- `getConfirmationTemplate()` – Confirmation

## Placeholders

| Placeholder | Invitation | Reminder | Confirmation |
|-------------|------------|----------|--------------|
| `{{PIXEL_TRACKING_URL}}` | Yes | Yes | Yes |
| `{{CLICK_TRACKING_URL}}` | Yes | Yes | No |
| `{{FirstName}}` | Optional | Optional | Optional |

## Which Template to Edit?

- **For Gmail automation:** Edit the inline template function in `gmail-automation.gs`
- **For standalone HTML (e.g. YAMM):** Edit `invitation-2026-final.html`, `soi-reminder.html`, or `confirmation.html`
- **Plain text fallbacks:** `invitation-2026.txt`, `soi-reminder.txt`, `confirmation.txt`

## Last Updated

January 2026 – Added SOI Reminder and Confirmation templates; synchronized contact info and disclaimers.

