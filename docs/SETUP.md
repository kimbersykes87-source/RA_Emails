# Email Tracking System - Complete Setup Guide

## Prerequisites

- Google Account with access to SOI Google Sheet
- Cloudflare account (free tier is fine)
- Basic familiarity with command line (for Cloudflare deployment)

## Phase 1: Google Sheet Update ✅ DONE

For the full sheet layout (all tabs and columns), see **[SHEET_LAYOUT.md](SHEET_LAYOUT.md)**. The 7 tracking columns have been added to `Config.gs`:
- Email Sent (Column 27)
- Email Sent At (Column 28)
- Email Opened (Column 29)
- First Open At (Column 30)
- Open Count (Column 31)
- Link Clicked (Column 32)
- First Click At (Column 33)

### Next Step: Run Setup in Apps Script

1. Open your Google Sheet: "RA 2026 SOI Submissions"
2. Go to Extensions → Apps Script
3. Find `Config.gs` - the columns should already be updated
4. Run the function: `setupAllTabs()`
   - This will add the 7 new columns to all tabs
   - Click Run, authorize if prompted
   - Wait for success message

## Phase 2: Google Cloud Project Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Project name: `RA-Email-Tracking`
4. Click "Create"
5. Wait for project to be created (30 seconds)

### Step 2: Enable Google Sheets API

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it, then click "Enable"
4. Wait for activation (10 seconds)

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Service account details:
   - **Name**: `email-tracking-worker`
   - **ID**: `email-tracking-worker` (auto-filled)
   - **Description**: `Cloudflare Worker for email tracking`
4. Click "Create and Continue"
5. **Grant this service account access to project**:
   - Role: Skip this (we'll grant access directly to the sheet)
   - Click "Continue"
6. **Grant users access to this service account**:
   - Skip this
   - Click "Done"

### Step 4: Generate Service Account Key (JSON)

1. Find your new service account in the list
2. Click on the service account email (e.g., `email-tracking-worker@ra-email-tracking.iam.gserviceaccount.com`)
3. Go to "Keys" tab
4. Click "Add Key" → "Create new key"
5. Choose "JSON"
6. Click "Create"
7. **IMPORTANT**: A JSON file will download - save it securely!
   - This file contains credentials
   - Keep it private (don't commit to Git)
   - You'll upload this to Cloudflare later

### Step 5: Share Google Sheet with Service Account

1. Open the JSON key file you just downloaded
2. Find the `client_email` field (looks like: `email-tracking-worker@ra-email-tracking.iam.gserviceaccount.com`)
3. Copy this email address
4. Open your Google Sheet: "RA 2026 SOI Submissions"
5. Click "Share" button (top right)
6. Paste the service account email
7. Give it "Editor" access
8. **Uncheck** "Notify people" (it's a bot, not a person)
9. Click "Share"

✅ **Google Cloud setup complete!** The Cloudflare Worker can now update your sheet.

## Phase 3: Cloudflare Worker Setup

### Step 1: Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

Or if you prefer using npx (no global install):
```bash
npx wrangler --version
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authorize.

### Step 3: Deploy the Worker

From the `cloudflare-worker/` directory:

```bash
cd cloudflare-worker
npm install
wrangler deploy
```

### Step 4: Set Up Secrets

You need to add two secrets to your Cloudflare Worker:

1. **GOOGLE_SERVICE_ACCOUNT_JSON** - The entire contents of the JSON key file
2. **SHEET_ID** - Your Google Sheet ID

```bash
# Set the Google Service Account JSON
# Copy the entire contents of your JSON key file, then:
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# Paste the JSON when prompted

# Set your Sheet ID
# Get it from your sheet URL: docs.google.com/spreadsheets/d/{SHEET_ID}/edit
wrangler secret put SHEET_ID
# Paste your sheet ID when prompted
```

### Step 5: Set Up Custom Domain (Optional but Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain: `rubberarmstrong.com`
3. Go to "Workers & Pages"
4. Find your `email-tracking-worker`
5. Click "Settings" → "Triggers" → "Custom Domains"
6. Click "Add Custom Domain"
7. Enter: `track.rubberarmstrong.com`
8. Click "Add Custom Domain"

Wait 1-2 minutes for DNS to propagate.

## Phase 4: Test the Setup

### Test 1: Verify Worker is Running

Open in browser:
```
https://track.rubberarmstrong.com/
```

You should see a message (not an error).

### Test 2: Test Tracking Pixel

1. Add a test row to your Google Sheet with your email address
2. Create a simple HTML file:

```html
<!DOCTYPE html>
<html>
<body>
  <p>Testing tracking pixel...</p>
  <img src="https://track.rubberarmstrong.com/p/test-email-base64.gif" width="1" height="1" />
</body>
</html>
```

3. Open this file in a browser
4. Check your Google Sheet - tracking columns should update

### Test 3: Test Link Redirect

Open in browser:
```
https://track.rubberarmstrong.com/c/test-email-base64/soi_form
```

Should redirect to `https://soi.rubberarmstrong.com` and log the click.

## Troubleshooting

### "Permission denied" when accessing sheet

- Make sure you shared the sheet with the service account email
- Check the service account has "Editor" access

### Worker returns 500 error

- Check secrets are set correctly: `wrangler secret list`
- View logs: `wrangler tail`
- Verify JSON key is valid

### Tracking pixel not working

- Check browser console for errors
- Verify custom domain is set up
- Test with the worker URL directly first

## Next Steps

Once setup is complete:
1. Read [SENDING_GUIDE.md](SENDING_GUIDE.md) for how to send campaigns
2. Read [TRACKING_GUIDE.md](TRACKING_GUIDE.md) for how to analyze data
3. See [DEPLOYMENT.md](DEPLOYMENT.md) for advanced deployment options

## Security Notes

- **Never commit** the Service Account JSON key to Git
- Add to `.gitignore`: `*service-account*.json`
- Store the JSON key in a secure password manager
- Rotate keys periodically (every 90 days recommended)
- The service account only has access to your one Google Sheet

## Support

For issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or check the Cloudflare Worker logs.

