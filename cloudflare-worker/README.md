# Cloudflare Worker - Email Tracking

## Overview

This Cloudflare Worker handles email tracking by:
1. **Tracking Pixel** (`/p/{email-hash}.gif`) - Logs when emails are opened
2. **Link Redirect** (`/c/{email-hash}/{link-id}`) - Logs clicks and redirects to destination

It updates your Google Sheet directly via the Sheets API (no Apps Script webhooks).

## Files

- `worker.js` - Main worker entry point
- `sheets-api.js` - Google Sheets API client
- `config.js` - Configuration (pixel, redirect URLs, column mappings)
- `wrangler.toml` - Cloudflare deployment config
- `package.json` - npm dependencies

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

Edit `wrangler.toml` and add your Cloudflare account ID:

```toml
account_id = "YOUR_ACCOUNT_ID_HERE"
```

Get your account ID from: https://dash.cloudflare.com → Workers & Pages

### 3. Set Secrets

```bash
# Google Service Account JSON (entire contents)
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON

# Google Sheet ID (from sheet URL)
wrangler secret put SHEET_ID
```

### 4. Deploy

```bash
npm run deploy
```

Or use wrangler directly:

```bash
wrangler deploy
```

## Development

### Local Testing

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`

### View Logs

```bash
npm run tail
```

Or:

```bash
wrangler tail
```

## Usage

### Tracking Pixel

Add to email HTML:

```html
<img src="https://track.rubberarmstrong.com/p/{EMAIL_HASH}.gif" width="1" height="1" alt="" style="display:block;border:0;opacity:0;" />
```

Where `{EMAIL_HASH}` is the base64-encoded email address (URL-safe).

### Tracked Link

Replace regular links with:

```html
<a href="https://track.rubberarmstrong.com/c/{EMAIL_HASH}/soi_form">Complete SOI Form</a>
```

Link IDs (defined in `config.js`):
- `soi_form` - SOI form
- `unsubscribe` - Unsubscribe  
- `main_site` - Main website

## How It Works

### Email Hash

Emails are encoded to base64 (URL-safe) to:
- Protect privacy (not plain text in URLs)
- Create unique tracking IDs
- Prevent enumeration attacks

**Encoding** (done when sending emails):
```javascript
function encodeEmail(email) {
  return btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

**Decoding** (done by worker):
```javascript
function decodeEmail(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return atob(padded);
}
```

### Google Sheets API

1. Worker authenticates using Service Account (JWT)
2. Finds row by email address (column H)
3. Updates tracking columns (AC-AG)
4. If email not found, creates new row

### Performance

- Pixel returns **immediately** (don't wait for sheet update)
- Link redirects **immediately** (don't wait for sheet update)
- Sheet updates happen asynchronously
- Worker stays alive to complete updates

## Troubleshooting

### Worker returns 500 error

Check logs:
```bash
wrangler tail
```

Common causes:
- Invalid Service Account JSON
- Sheet ID incorrect
- Service account not shared with sheet

### Tracking not working

1. Check browser console for errors
2. Verify custom domain DNS is set up
3. Test with worker URL directly first
4. Check sheet has tracking columns (AA-AG)

### Authentication errors

- Verify Service Account JSON is valid
- Check Service Account has Editor access to sheet
- Ensure Sheets API is enabled in Google Cloud

## Security

- Service Account credentials stored as Cloudflare secret (encrypted)
- Service Account only has access to one Google Sheet
- Email addresses are base64-encoded in URLs
- No PII logged in Cloudflare

## Cost

- **Free tier**: 100,000 requests/day
- Expected usage: ~3,000 requests total (299 emails × 10 interactions)
- **Cost**: $0

## Custom Domain

To use `track.rubberarmstrong.com`:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select `email-tracking-worker`
3. Settings → Triggers → Custom Domains
4. Add: `track.rubberarmstrong.com`
5. Wait 1-2 minutes for DNS

Or add to `wrangler.toml`:

```toml
routes = [
  { pattern = "track.rubberarmstrong.com/*", zone_name = "rubberarmstrong.com" }
]
```

## Support

See main documentation:
- [SETUP.md](../docs/SETUP.md)
- [DEPLOYMENT.md](../docs/DEPLOYMENT.md)
- [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)

