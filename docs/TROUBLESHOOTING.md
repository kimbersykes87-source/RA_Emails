# Troubleshooting Guide

## Common Issues and Solutions

### 1. Cloudflare Worker Not Deploying

**Error:** `Error: Could not find account`

**Solution:**
```bash
# Login to Cloudflare
wrangler login

# Or set account ID in wrangler.toml
account_id = "YOUR_ACCOUNT_ID"
```

**Error:** `Error: No such command: deploy`

**Solution:**
```bash
# Update wrangler
npm install -g wrangler@latest

# Or use npx
npx wrangler@latest deploy
```

### 2. Authentication Errors

**Error:** `Failed to get access token: 401`

**Cause:** Service Account JSON is invalid or malformed

**Solution:**
1. Re-download Service Account JSON from Google Cloud
2. Verify it's valid JSON (check with `jq` or JSON validator)
3. Set secret again:
```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# Paste the entire JSON content
```

**Error:** `Permission denied when accessing sheet`

**Solution:**
1. Open Google Sheet
2. Click Share
3. Find service account email in the JSON: `client_email`
4. Add with "Editor" permissions
5. Uncheck "Notify people"

### 3. Tracking Pixel Not Loading

**Symptom:** Pixel shows broken image or 404

**Checks:**
1. **Worker deployed?**
   ```bash
   curl https://YOUR-WORKER.workers.dev/
   ```

2. **Custom domain active?**
   ```bash
   curl https://track.rubberarmstrong.com/
   ```

3. **EmailHash correct format?**
   ```bash
   # Test with known email
   node -e "console.log(Buffer.from('test@example.com').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''))"
   ```

4. **Check worker logs:**
   ```bash
   wrangler tail
   # Then open pixel URL in browser
   ```

**Solution:** Most common issue is DNS not propagated. Wait 5-10 minutes.

### 4. Tracking Data Not Updating Sheet

**Symptom:** Emails opened but sheet not updating

**Debug steps:**

1. **Check worker logs:**
   ```bash
   wrangler tail
   # Open tracking pixel
   # Look for errors
   ```

2. **Verify Sheet ID:**
   ```bash
   wrangler secret list
   # Should show SHEET_ID
   
   # Check it matches your sheet URL
   # https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```

3. **Test API access:**
   ```javascript
   // In browser console on your sheet:
   console.log(window.location.href);
   // Copy the SHEET_ID
   ```

4. **Check service account permissions:**
   - Sheet → Share → Find service account email
   - Must have "Editor" access
   - Try removing and re-adding

5. **Verify column letters:**
   - Tracking columns should be AA-AG (columns 27-33)
   - If you've added/removed columns, update `config.js`

**Common fix:**
```bash
# Reset secrets
wrangler secret delete GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret delete SHEET_ID

# Re-add them
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put SHEET_ID

# Redeploy
wrangler deploy
```

### 5. Emails Going to Spam

**Symptom:** Low open rates, emails in spam folder

**Causes:**
1. Sending too many emails at once
2. Poor sender reputation
3. Spammy subject line or content
4. No SPF/DKIM records

**Solutions:**

1. **Send smaller batches:**
   - 25-50 emails at a time
   - 30-60 second delays between sends
   - Split over multiple days

2. **Check sender reputation:**
   ```bash
   # Check your domain/IP reputation
   # Visit: https://mxtoolbox.com/blacklists.aspx
   ```

3. **Fix SPF/DKIM:**
   - Go to Cloudflare DNS
   - Add SPF record: `v=spf1 include:_spf.google.com ~all`
   - Enable DKIM in Gmail settings
   - Add DMARC record

4. **Improve content:**
   - Remove spammy words (free, click here, etc.)
   - Add plain text version
   - Include unsubscribe link
   - Add physical address

5. **Warm up account:**
   - Send to engaged users first
   - Start with 10-20 emails/day
   - Increase gradually over 1-2 weeks

### 6. High Bounce Rate

**Symptom:** Many emails bounce or fail to deliver

**Causes:**
1. Invalid email addresses
2. Typos in email list
3. Old/inactive accounts
4. Corporate email blocks

**Solutions:**

1. **Validate email list:**
   ```bash
   # Use email validation service
   # Or check manually for obvious typos
   ```

2. **Remove bounces:**
   - Check Gmail sent folder for bounce messages
   - Remove bounced emails from list
   - Don't retry bounced addresses

3. **Check bounce type:**
   - Hard bounce (permanent) = remove from list
   - Soft bounce (temporary) = retry once

### 7. Low Open Rates

**Symptom:** <30% open rate after 3 days

**Possible causes:**

1. **Bad subject line**
   - Too generic
   - Too spammy
   - Not personalized

   **Fix:** A/B test subject lines:
   - "Invitation to Rubber Armstrong | Burning Man 2026"
   - "Join us at Burning Man 2026 - Rubber Armstrong"
   - "[FirstName], you're invited to Rubber Armstrong 2026"

2. **Wrong send time**
   - Sent at night (people asleep)
   - Sent Friday afternoon (weekend mode)
   - Sent Monday morning (inbox overload)

   **Fix:** Resend at optimal time:
   - Tuesday-Thursday
   - 10am-2pm recipient timezone

3. **Emails in Promotions tab (Gmail)**
   - Gmail auto-categorizes bulk emails

   **Fix:**
   - Ask recipients to move to Primary
   - Reply to their responses (builds relationship)
   - Avoid marketing language

4. **Audience not engaged**
   - Wrong email list
   - Old/inactive contacts
   - Not interested in Burning Man

   **Fix:**
   - Segment list (returning campers vs new)
   - Personalize message per segment
   - Ask for opt-in before sending

### 8. Tracking Pixel Blocked

**Symptom:** Open Count not incrementing

**Causes:**
1. Apple Mail Privacy Protection (blocks all tracking)
2. Gmail "Show images" disabled
3. Corporate email policy
4. Privacy extensions (uBlock, Privacy Badger)

**Expected accuracy:** 70-80% of opens tracked

**Solution:** Accept that not all opens can be tracked. Focus on:
- Click tracking (more accurate)
- Form submissions (definitive)
- Direct replies (best signal)

### 9. Click Tracking Not Working

**Symptom:** Link redirects but doesn't log click

**Debug:**

1. **Test redirect manually:**
   ```bash
   curl -I https://track.rubberarmstrong.com/c/dGVzdEBleGFtcGxlLmNvbQ/soi_form
   # Should return 302 redirect
   ```

2. **Check worker logs:**
   ```bash
   wrangler tail
   # Click link
   # Look for error messages
   ```

3. **Verify link format:**
   - Correct: `/c/{emailHash}/soi_form`
   - Wrong: `/c/{email}/soi_form` (not encoded)
   - Wrong: `/c/{emailHash}/SOI_form` (case-sensitive link ID)

**Solution:** Regenerate email with correct link format

### 10. Worker Timeout Errors

**Error:** `Error: Worker exceeded CPU time limit`

**Cause:** Sheet API calls taking too long

**Solutions:**

1. **Don't wait for sheet update in pixel/click handlers:**
   - Pixel should return immediately
   - Sheet update happens asynchronously
   - Already implemented in provided code

2. **Optimize sheet API calls:**
   - Use batch updates instead of individual
   - Cache access tokens (don't generate each time)
   - Reduce API calls where possible

3. **Increase Worker limits:**
   - Free tier: 10ms CPU time
   - Paid tier: 50ms CPU time
   - Usually free tier is enough

### 11. Custom Domain Not Working

**Symptom:** `track.rubberarmstrong.com` returns DNS error

**Solutions:**

1. **Check DNS propagation:**
   ```bash
   dig track.rubberarmstrong.com
   # Or visit: https://dnschecker.org
   ```

2. **Verify Cloudflare routing:**
   - Cloudflare Dashboard → Workers & Pages
   - Find your worker
   - Settings → Triggers → Custom Domains
   - Add: `track.rubberarmstrong.com`

3. **Check zone settings:**
   - Domain must be on Cloudflare
   - DNS records must be proxied (orange cloud)
   - Worker route must match domain

4. **Wait for DNS:**
   - Can take 1-2 minutes (usually)
   - Can take up to 24 hours (rare)
   - Test with worker URL first: `your-worker.workers.dev`

### 12. Sheet Column Misalignment

**Symptom:** Tracking data appears in wrong columns

**Cause:** Columns were added/removed after setup

**Solution:**

1. **Verify column positions:**
   - Email: Column H (8)
   - Email Sent: Column AA (27)
   - Email Opened: Column AC (29)
   - Link Clicked: Column AF (32)

2. **Update Config.gs:**
   ```javascript
   HEADERS: [
     // ... first 26 columns
     'Email Sent',      // Must be column 27
     'Email Sent At',   // Must be column 28
     'Email Opened',    // Must be column 29
     // ...
   ]
   ```

3. **Update worker config.js:**
   ```javascript
   export const SHEET_COLUMNS = {
     EMAIL: 'H',
     EMAIL_OPENED: 'AC',  // Adjust if needed
     // ...
   };
   ```

4. **Redeploy worker:**
   ```bash
   wrangler deploy
   ```

### 13. Multiple Opens from Same Person

**Symptom:** Open Count = 20+ for one person

**Causes:**
1. Email client pre-fetching images
2. Forwarded to friends/partners
3. Opening on multiple devices
4. Email client bug

**Is this a problem?** No! High open count shows engagement.

**Solution:** None needed. Filter by unique opens if needed:
```
=COUNTIF(AC:AC,"Yes")
```

### 14. No Opens After Sending

**Symptom:** Sent 50 emails, zero opens after 2 hours

**Emergency checklist:**

1. [ ] Did emails actually send? (check Gmail sent folder)
2. [ ] Are tracking pixels in the emails? (view source)
3. [ ] Is Cloudflare Worker running? (visit URL)
4. [ ] Are secrets set? (`wrangler secret list`)
5. [ ] Is Sheet ID correct? (check URL)
6. [ ] Does service account have access? (check sharing)
7. [ ] Check worker logs for errors (`wrangler tail`)

**Most common cause:** Forgot to include tracking pixel in email!

**Fix:** Resend with tracking pixel included

## Getting Help

### Check Logs First

```bash
# Worker logs (real-time)
wrangler tail

# Worker logs (recent)
wrangler tail --status error

# Worker deployment logs
wrangler deploy --dry-run
```

### Test Components Individually

1. **Test Worker:**
   ```bash
   curl https://track.rubberarmstrong.com/
   ```

2. **Test Pixel:**
   ```bash
   curl https://track.rubberarmstrong.com/p/dGVzdEBleGFtcGxlLmNvbQ.gif
   ```

3. **Test Redirect:**
   ```bash
   curl -I https://track.rubberarmstrong.com/c/dGVzdEBleGFtcGxlLmNvbQ/soi_form
   ```

4. **Test Sheet API:**
   - Manually add data to tracking columns
   - Verify formulas work
   - Check service account can edit

### Debug Mode

Add debug logging to worker:

```javascript
// In worker.js
console.log('Email:', email);
console.log('Event type:', eventType);
console.log('Row index:', rowIndex);
```

View logs:
```bash
wrangler tail
```

### Reset Everything

Last resort - start fresh:

1. **Delete and recreate Service Account**
2. **Redeploy Worker:**
   ```bash
   wrangler delete
   wrangler deploy
   ```
3. **Reset secrets:**
   ```bash
   wrangler secret delete GOOGLE_SERVICE_ACCOUNT_JSON
   wrangler secret delete SHEET_ID
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
   wrangler secret put SHEET_ID
   ```
4. **Re-share sheet with new service account**
5. **Test with single email first**

## Prevention

### Before Sending Campaign

- [ ] Send test email to yourself
- [ ] Verify tracking works (open + click)
- [ ] Check sheet updates correctly
- [ ] Send to 2-3 friends for peer review
- [ ] Monitor logs during test
- [ ] Wait 24 hours, check again
- [ ] Only then send to full list

### Monitoring During Campaign

- [ ] Check worker logs every hour
- [ ] Monitor sheet updates
- [ ] Watch for bounce messages
- [ ] Check open rates match expectations
- [ ] Pause if issues arise
- [ ] Adjust and continue

## Support Channels

1. **Documentation:**
   - [SETUP.md](SETUP.md)
   - [SENDING_GUIDE.md](SENDING_GUIDE.md)
   - [TRACKING_GUIDE.md](TRACKING_GUIDE.md)

2. **Cloudflare:**
   - [Workers Docs](https://developers.cloudflare.com/workers/)
   - [Community Forum](https://community.cloudflare.com/)

3. **Google Sheets API:**
   - [API Reference](https://developers.google.com/sheets/api)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/google-sheets-api)

4. **This Project:**
   - Check GitHub issues (if repo exists)
   - Review main plan document
   - Ask in Rubber Armstrong camp chat

## Quick Fixes

**Worker not accessible:**
```bash
wrangler deploy --compatibility-date=2024-01-01
```

**Secrets not set:**
```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put SHEET_ID
```

**DNS not working:**
- Wait 10 minutes
- Clear browser cache
- Try incognito mode

**Tracking not updating:**
```bash
wrangler tail  # Check for errors
```

**Start over:**
```bash
cd cloudflare-worker
rm -rf node_modules
npm install
wrangler deploy
```

