# Email Tracking System for Rubber Armstrong

## Overview

This system tracks email opens and clicks for Burning Man 2026 invitations, integrating directly with your existing SOI Google Sheet database. It uses Cloudflare Workers and Google Sheets API to avoid the phishing flags that Apps Script webhooks trigger.

## Key Features

- ✅ **Zero cost** - Uses free tiers only
- ✅ **No phishing flags** - No Apps Script webhooks
- ✅ **Integrated** - Works with existing SOI database  
- ✅ **Full funnel tracking** - Email sent → opened → clicked → form submitted
- ✅ **Reusable** - Use for future campaigns

## Architecture

```
Email → Recipient opens → Cloudflare Worker → Google Sheets API → Updates your SOI sheet
```

**Key difference from typical solutions:** Cloudflare Worker talks directly to Google Sheets API (not Apps Script webhooks).

## Quick Start

1. **Setup Infrastructure** (see [`docs/SETUP.md`](docs/SETUP.md))
   - Update Google Sheet with tracking columns ✅ (Done!)
   - Create Google Cloud Service Account
   - Deploy Cloudflare Worker

2. **Send Campaign** (see [`docs/SENDING_GUIDE.md`](docs/SENDING_GUIDE.md))
   - Prepare recipient list
   - Send emails (manual or automated)
   - Monitor tracking data

3. **Analyze Results** (see [`docs/TRACKING_GUIDE.md`](docs/TRACKING_GUIDE.md))
   - View dashboard in Google Sheet
   - Filter non-openers for follow-up
   - Track complete funnel

## Folder Structure

```
RA_Emails/
├── cloudflare-worker/    # Tracking pixel and link redirect worker
├── apps-script-consolidated/  # Apps Script (form handler, contacts, analytics)
├── templates/            # HTML email templates
├── docs/                 # Complete documentation
├── scripts/              # Gmail automation, tracking, helper scripts
├── assets/               # Contacts, tracking URLs
└── README.md             # This file
```

## Documentation

- **[SETUP.md](docs/SETUP.md)** - Complete setup instructions
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deploy Cloudflare Worker
- **[SENDING_GUIDE.md](docs/SENDING_GUIDE.md)** - How to send the campaign
- **[TRACKING_GUIDE.md](docs/TRACKING_GUIDE.md)** - Read and analyze tracking data
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and fixes

## Status

- ✅ Google Sheet structure updated (7 tracking columns added)
- ✅ Email templates updated (January 2026) - All templates synchronized with clarifications
- ✅ Pre-launch audit fixes applied - Contact info, SOI explanations, Steward disclaimers
- ⏳ Next: Complete Google Cloud setup
- ⏳ Then: Deploy Cloudflare Worker
- ⏳ Finally: Send campaign

## Email Campaigns

| Campaign | Recipients | CTA | Tracking |
|----------|------------|-----|----------|
| **Invitation** | Email_Campaign_2026 | Complete SOI | Pixel + click |
| **SOI Reminder** | Email_Campaign_2026 \ SOI_Approved | Complete SOI | Pixel + click |
| **Confirmation** | SOI_Approved | None | Pixel only |

## Email Templates

**Active Templates:**
- `templates/invitation-2026-final.html` - Invitation
- `templates/soi-reminder.html` - SOI Reminder
- `templates/confirmation.html` - Confirmation
- `scripts/gmail-automation.gs` - Inline templates for Gmail automation

**Template Updates (January 2026):**
- ✅ Added contact email (rubberarmstrongcamp@gmail.com)
- ✅ Added SOI explanation section
- ✅ Added Steward Sale ticket disclaimers
- ✅ Clarified timeline expectations
- ✅ Removed false urgency from follow-up email

See [templates/README_TEMPLATE_USAGE.md](templates/README_TEMPLATE_USAGE.md) for template usage details.

## Support

For questions or issues, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) or refer to the main plan document.

