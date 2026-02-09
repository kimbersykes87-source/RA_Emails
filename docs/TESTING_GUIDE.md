# Testing Guide

## Before You Test

Ensure these are complete:
- ✅ Google Sheet has tracking columns (Config.gs updated)
- ✅ Cloudflare Worker deployed
- ✅ Custom domain `track.rubberarmstrong.com` configured
- ✅ Secrets set (Service Account JSON, Sheet ID)
- ✅ Service Account has Editor access to sheet

## Testing Workflow

### Phase 1: Component Tests (10 minutes)

**Test 1: Worker is Running**

```bash
curl https://track.rubberarmstrong.com/
```

Expected: JSON response with service info

**Test 2: Tracking Pixel**

```bash
node scripts/test-tracking.js pixel test@example.com
```

Expected:
- Status: 200
- Content-Type: image/gif
- Size: 43 bytes

**Test 3: Link Redirect**

```bash
node scripts/test-tracking.js click test@example.com soi_form
```

Expected:
- Status: 302
- Location: https://soi.rubberarmstrong.com

### Phase 2: End-to-End Test (30 minutes)

**Step 1: Add Test Row to Sheet**

1. Open Google Sheet: "RA 2026 SOI Submissions"
2. Go to `SOI_Staging` tab
3. Add a test row with YOUR email address
4. Set `Email Sent = No`

**Step 2: Generate Test Email**

```bash
cd scripts
node test-tracking.js template YourName your@email.com
```

Copy the HTML output.

**Step 3: Send Test Email**

1. Open Gmail
2. Compose new email
3. To: your@email.com (yourself)
4. Subject: "TEST - Rubber Armstrong 2026"
5. Paste the HTML from Step 2
6. Send

**Step 4: Verify Tracking Pixel**

1. Open the test email (in Gmail web or app)
2. Wait 5-10 seconds
3. Check Google Sheet - `Email Opened` should be "Yes"
4. Check `First Open At` has timestamp
5. Check `Open Count` = 1

**Step 5: Verify Click Tracking**

1. Click the link in the test email
2. Should redirect to https://soi.rubberarmstrong.com
3. Check Google Sheet - `Link Clicked` should be "Yes"
4. Check `First Click At` has timestamp

**Step 6: Test Multiple Opens**

1. Close and reopen the email
2. Wait 10 seconds
3. Check Google Sheet - `Open Count` should increment to 2

**Step 7: Monitor Worker Logs**

```bash
cd cloudflare-worker
wrangler tail
```

You should see:
- Pixel requests being logged
- Click events being logged
- Sheet API calls succeeding

### Phase 3: Multi-Client Test (1 hour)

**Test on different email clients:**

1. **Gmail Web** (Chrome)
   - Send test email
   - Open in Gmail web
   - Verify tracking works

2. **Gmail Mobile** (iOS/Android)
   - Forward test email to phone
   - Open in Gmail app
   - Verify tracking works

3. **Outlook** (if available)
   - Forward test email
   - Open in Outlook
   - Verify tracking works

4. **Apple Mail** (if available)
   - Forward test email
   - Open in Apple Mail
   - Note: May be blocked by privacy protection

**Expected Results:**
- Gmail: ✅ Tracking works
- Outlook: ✅ Tracking works
- Apple Mail: ⚠️ May not track (privacy feature)

### Phase 4: Peer Review (2-3 days)

**Step 1: Send to Trusted Campers**

Send test email to 2-3 close camp friends:
1. Use real invitation template
2. Personalize with their names
3. Ask them to:
   - Open the email
   - Click the link
   - Provide feedback on content
   - Check spam folder (make sure it's not there)

**Step 2: Collect Feedback**

Ask them:
- Did email arrive in inbox (not spam)?
- Was content clear and engaging?
- Did link work correctly?
- Any technical issues?
- Would they respond to this invite?

**Step 3: Review Tracking Data**

Check your Google Sheet:
- Did all 2-3 test emails track correctly?
- Are open/click timestamps accurate?
- Is Open Count reasonable?

## Troubleshooting Test Issues

### Tracking Pixel Not Loading

**Check:**
```bash
# Test pixel directly
curl https://track.rubberarmstrong.com/p/dGVzdEBleGFtcGxlLmNvbQ.gif

# Check worker logs
wrangler tail
```

**Common causes:**
- DNS not propagated (wait 10 minutes)
- Worker not deployed
- EmailHash incorrect format

### Sheet Not Updating

**Check:**
1. Service Account has Editor access
2. Sheet ID is correct in worker secrets
3. Tracking columns exist (AA-AG)
4. Worker logs show no errors

**Test manually:**
```bash
# Check secrets are set
wrangler secret list

# Should show:
# - GOOGLE_SERVICE_ACCOUNT_JSON
# - SHEET_ID
```

### Email Going to Spam

**If test email lands in spam:**
1. Send smaller test (just you)
2. Check content for spam triggers
3. Verify SPF/DKIM records
4. Send from warmed-up Gmail account

**Prevention:**
- Use established Gmail account
- Send test to yourself first
- Keep content professional
- Include unsubscribe link

## Test Checklist

### Before Peer Review

- [ ] Worker deployed and accessible
- [ ] Secrets configured correctly
- [ ] Test email sent to yourself
- [ ] Pixel tracking verified (opens logged)
- [ ] Click tracking verified (clicks logged)
- [ ] Sheet updates correctly
- [ ] Worker logs show no errors
- [ ] Tested on Gmail web
- [ ] Tested on Gmail mobile
- [ ] No spam warnings

### After Peer Review

- [ ] 2-3 test emails sent
- [ ] All tracking data collected
- [ ] Feedback received and addressed
- [ ] Content refined based on feedback
- [ ] Technical issues resolved
- [ ] Ready for full campaign

## Success Criteria

**Your system is ready when:**

1. ✅ 100% of test emails tracked correctly
2. ✅ Pixel loads in <100ms
3. ✅ Click redirects work instantly
4. ✅ Sheet updates within 5 seconds
5. ✅ No errors in worker logs
6. ✅ No spam folder placements
7. ✅ Peer reviewers approve content
8. ✅ All tracking columns populate correctly

## Next Steps

Once testing is complete:
1. Read [SENDING_GUIDE.md](SENDING_GUIDE.md)
2. Prepare recipient list (299 emails)
3. Schedule send times (3-day plan)
4. Send first batch (50 emails)
5. Monitor and adjust

## Quick Test Commands

```bash
# Encode email to hash
node scripts/test-tracking.js encode your@email.com

# Test pixel
node scripts/test-tracking.js pixel your@email.com

# Test click
node scripts/test-tracking.js click your@email.com soi_form

# Generate test email
node scripts/test-tracking.js template YourName your@email.com

# View worker logs
cd cloudflare-worker && wrangler tail
```

## Support

- [SETUP.md](SETUP.md) - If setup incomplete
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - For specific errors
- [DEPLOYMENT.md](DEPLOYMENT.md) - For deployment issues

