# Deployment Guide

## Overview

This guide covers deploying the email tracking system to production.

## Apps Script (Google Sheet)

**Canonical source:** All Apps Script code lives in the `scripts/` folder. The `apps-script-consolidated/` folder is a copy of the deployable set, synced from `scripts/` for convenience.

**To deploy to your Google Sheet:**

1. Open the spreadsheet → **Extensions** → **Apps Script**.
2. Copy these files into the Apps Script project (create one file per item; name the first file `Config.gs` to match references):

| File in repo | Name in Apps Script |
|--------------|---------------------|
| `scripts/config.gs` | `Config.gs` |
| `scripts/gmail-automation.gs` | `gmail-automation.gs` |
| `scripts/AddTracking.gs` | `AddTracking.gs` |
| `scripts/FormHandler.gs` | `FormHandler.gs` |
| `scripts/AutoMove.gs` | `AutoMove.gs` |
| `scripts/Analytics.gs` | `Analytics.gs` |
| `scripts/ContactsSync.gs` | `ContactsSync.gs` |

You can copy from either `scripts/` or `apps-script-consolidated/` (they are kept in sync). After pasting, save and run **refreshMenu** once so the **Email Campaign** menu appears in the sheet.

## Prerequisites

- [x] Google Cloud project created
- [x] Service Account with Sheets API access
- [x] Google Sheet shared with service account
- [x] Cloudflare account
- [x] Domain on Cloudflare (rubberarmstrong.com)

## Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

Or use npx (no install):
```bash
npx wrangler --version
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens browser for OAuth authorization.

### 3. Configure wrangler.toml

Edit `cloudflare-worker/wrangler.toml`:

```toml
name = "email-tracking-worker"
main = "worker.js"
compatibility_date = "2024-01-01"

# Add your account ID
account_id = "YOUR_ACCOUNT_ID_HERE"
```

Get account ID from: https://dash.cloudflare.com → Workers & Pages → Overview

### 4. Deploy Worker

```bash
cd cloudflare-worker
wrangler deploy
```

Output:
```
✨ Built successfully
⛅️ Deployed email-tracking-worker
   https://email-tracking-worker.YOUR_ACCOUNT.workers.dev
```

### 5. Set Secrets

```bash
# Google Service Account JSON
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# Paste the entire JSON when prompted

# Google Sheet ID
wrangler secret put SHEET_ID
# Paste your sheet ID (from URL)
```

Verify secrets:
```bash
wrangler secret list
```

### 6. Configure Custom Domain

**Option A: Via Dashboard**

1. Go to https://dash.cloudflare.com
2. Workers & Pages → email-tracking-worker
3. Settings → Triggers → Custom Domains
4. Add Custom Domain: `track.rubberarmstrong.com`
5. Wait 1-2 minutes for DNS

**Option B: Via wrangler.toml**

Add to `wrangler.toml`:
```toml
routes = [
  { pattern = "track.rubberarmstrong.com/*", zone_name = "rubberarmstrong.com" }
]
```

Redeploy:
```bash
wrangler deploy
```

### 7. Test Deployment

**Test worker is live:**
```bash
curl https://track.rubberarmstrong.com/
```

Should return JSON with service info.

**Test tracking pixel:**
```bash
curl https://track.rubberarmstrong.com/p/dGVzdEBleGFtcGxlLmNvbQ.gif
```

Should return GIF image.

**Test link redirect:**
```bash
curl -I https://track.rubberarmstrong.com/c/dGVzdEBleGFtcGxlLmNvbQ/soi_form
```

Should return `302 Found` with Location header.

### 8. Monitor Logs

```bash
wrangler tail
```

Keep this running while testing. You'll see:
- Pixel requests
- Click events
- Sheet API calls
- Any errors

## Production Checklist

Before going live:

- [ ] Worker deployed successfully
- [ ] Secrets set (verified with `wrangler secret list`)
- [ ] Custom domain active (`curl https://track.rubberarmstrong.com/`)
- [ ] Test pixel loads
- [ ] Test link redirects
- [ ] Test sheet updates (send email to yourself)
- [ ] Check worker logs show no errors
- [ ] Service account has Editor access to sheet
- [ ] Sheet has tracking columns (AA-AG)
- [ ] Email templates ready
- [ ] Recipient list prepared

## Environments

### Staging

Use a staging worker for testing:

```toml
[env.staging]
name = "email-tracking-worker-staging"
vars = { ENVIRONMENT = "staging" }
```

Deploy to staging:
```bash
wrangler deploy --env staging
```

Set staging secrets:
```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON --env staging
wrangler secret put SHEET_ID --env staging
```

Use staging subdomain:
```
track-staging.rubberarmstrong.com
```

### Production

```toml
[env.production]
name = "email-tracking-worker"
vars = { ENVIRONMENT = "production" }
```

Deploy to production:
```bash
wrangler deploy --env production
```

## Rollback

If something goes wrong:

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback
```

Or redeploy previous version:
```bash
git checkout <previous-commit>
wrangler deploy
```

## Monitoring

### Real-time Logs

```bash
wrangler tail
```

### Error Logs Only

```bash
wrangler tail --status error
```

### Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Workers & Pages → email-tracking-worker
3. View:
   - Requests (graphs)
   - CPU time
   - Errors
   - Success rate

### Alerts

Set up alerts in Cloudflare:
1. Workers & Pages → email-tracking-worker
2. Observability → Alerts
3. Add alert for:
   - High error rate (>5%)
   - High latency (>1000ms)
   - Low success rate (<95%)

## Performance

### Expected Metrics

- **Latency:** <100ms (pixel), <200ms (click)
- **Success rate:** >99%
- **CPU time:** <10ms
- **Requests/day:** ~3,000 (for 299 recipients)

### Optimization

1. **Cache access tokens:**
   ```javascript
   // Cache token for 55 minutes
   let cachedToken = null;
   let tokenExpiry = 0;
   
   if (Date.now() < tokenExpiry) {
     return cachedToken;
   }
   ```

2. **Batch sheet updates:**
   - Already implemented
   - Updates multiple cells in one API call

3. **Return immediately:**
   - Pixel returns GIF without waiting for sheet update
   - Click redirects immediately
   - Sheet updates happen async

## Security

### Secrets Management

- **Never commit secrets** to git
- Store in Cloudflare encrypted storage
- Rotate Service Account keys every 90 days
- Use separate keys for staging/production

### Service Account Permissions

- Grant access only to specific sheet
- Use "Editor" role (minimum needed)
- Don't use personal account credentials
- Monitor access in Google Cloud audit logs

### Domain Security

- Use HTTPS only (enforced by Cloudflare)
- Enable Cloudflare firewall rules if needed
- Rate limit if spam becomes issue

## Cost

### Free Tier Limits

- **Requests:** 100,000/day
- **Duration:** 10ms CPU time per request
- **Storage:** 1GB (for secrets/KV)

### Expected Usage

- **Requests:** ~3,000 total
  - 299 pixels × 3 opens = 897 requests
  - 299 clicks × 0.3 = 90 requests
  - Misc: 100 requests
  - **Total: ~1,100 requests**

- **CPU time:** ~5ms per request = 5,500ms total
- **Storage:** <1MB (secrets only)

**Cost: $0** (well within free tier)

## Updates

### Updating Worker Code

1. Edit files in `cloudflare-worker/`
2. Test locally:
   ```bash
   wrangler dev
   ```
3. Deploy:
   ```bash
   wrangler deploy
   ```
4. Monitor logs:
   ```bash
   wrangler tail
   ```

### Updating Configuration

Edit `config.js`:
```javascript
export const REDIRECT_URLS = {
  soi_form: 'https://soi.rubberarmstrong.com',
  new_link: 'https://newlink.com',  // Add new
};
```

Redeploy:
```bash
wrangler deploy
```

### Updating Secrets

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# Paste new JSON

wrangler deploy
```

## Backup

### Backup Service Account Key

1. Keep JSON key in secure location:
   - Password manager (1Password, Bitwarden)
   - Encrypted file
   - Secure notes
   
2. **Never:**
   - Commit to git
   - Email
   - Share in Slack/Discord
   - Store in Google Drive (unless encrypted)

### Backup Worker Code

- Code is in git repo
- Cloudflare keeps deployment history
- Export via:
  ```bash
  wrangler deploy --dry-run
  ```

### Backup Sheet Data

1. Google Sheet → File → Download → CSV
2. Save with date stamp
3. Store in secure backup location

## Disaster Recovery

### If Worker Goes Down

1. Check Cloudflare status: https://www.cloudflarestatus.com
2. Check worker logs: `wrangler tail`
3. Redeploy: `wrangler deploy`
4. If still down, rollback: `wrangler rollback`

**Impact:** Tracking stops, but emails still work

### If Service Account Compromised

1. Revoke key in Google Cloud Console
2. Create new Service Account
3. Generate new JSON key
4. Update worker secret:
   ```bash
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
   ```
5. Re-share sheet with new service account
6. Redeploy worker

### If Sheet Deleted

1. Restore from Google Drive trash
2. Or restore from backup (CSV)
3. Re-share with service account
4. Verify SHEET_ID in worker secrets

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [Cloudflare Community](https://community.cloudflare.com/)

## Quick Reference

**Deploy:**
```bash
wrangler deploy
```

**Set secret:**
```bash
wrangler secret put SECRET_NAME
```

**View logs:**
```bash
wrangler tail
```

**Rollback:**
```bash
wrangler rollback
```

**Test locally:**
```bash
wrangler dev
```

**Check status:**
```bash
curl https://track.rubberarmstrong.com/
```

