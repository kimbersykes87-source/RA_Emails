# Email Sending Guide

## Overview

This guide covers how to send the Burning Man 2026 invitation emails with tracking enabled.

## Campaigns and Batch Limits

| Campaign | Recipients | Batch Size | Max/Day | Tracking URLs |
|----------|------------|------------|---------|---------------|
| Invitation | Email_Campaign_2026 | 50 | 150 | AH, AI |
| SOI Reminder | Email_Campaign_2026 \ SOI_Approved | 50 | 150 | AQ, AR |
| Confirmation | SOI_Approved | 50 | 150 | AH |

All campaigns respect batch limits and daily quotas to avoid spam flags. Run **Tracking URLs → Add All** before sending.

## Before You Start

✅ **Prerequisites:**
- [ ] Google Sheet has tracking columns (add columns per plan)
- [ ] Cloudflare Worker deployed and working
- [ ] Run "Add All Tracking URLs" from menu
- [ ] Test emails sent to kimbersykes87@gmail.com for each campaign

## Sending Options

### Option A: Manual Gmail + BCC (Recommended)

**Best for:** Maximum deliverability, zero automation flags

**Pros:**
- ✅ Safest method (no spam flags)
- ✅ Gmail thinks you're manually sending
- ✅ Can personalize each batch
- ✅ Easy to pause/adjust

**Cons:**
- ⏱️ More manual work
- ⏱️ Takes longer (3 days for 299 emails)

**How to do it:** See [Manual Sending](#manual-sending-method) below

### Option B: Apps Script Automated Sender

**Best for:** Fully automated, hands-off sending

**Pros:**
- ⚡ Fully automated
- ⏱️ Send all 299 in one run
- 📊 Automatic tracking in sheet

**Cons:**
- ⚠️ Uses Apps Script (but only for sending, no webhooks)
- ⚠️ Slight risk if account not warmed up

**How to do it:** See [`../apps-script/README.md`](../apps-script/README.md)

### Option C: Mail Merge Extension (YAMM, etc.)

**Best for:** Semi-automated with personalization

**Pros:**
- ⚡ Easier than manual
- ✅ Built for bulk sending
- 📊 Good deliverability

**Cons:**
- 💰 May require paid plan ($25/month)
- ⏱️ Learning curve

**How to do it:** See [Mail Merge Method](#mail-merge-method) below

## Manual Sending Method

### Step 1: Prepare Recipient List

1. Export emails from your source (existing campers, referrals, etc.)
2. Open Google Sheet: "RA 2026 SOI Submissions"
3. Go to `SOI_Staging` tab
4. Add recipients (or create a new tab `Email_Campaign_2026`)

**Required columns:**
- Email
- First (first name)
- Email Sent (set to "No")

### Step 2: Generate Email Hashes

You need a unique tracking hash for each recipient.

**Using the helper script:**
```bash
cd scripts
node prepare-recipients.js
```

This will:
- Read emails from your sheet
- Generate EmailHash for each
- Update the sheet with hashes

**Or manually (for small batches):**
```javascript
function btoa(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

console.log(btoa('test@example.com'));
// Output: dGVzdEBleGFtcGxlLmNvbQ
```

### Step 3: Create Email Batches

Split your 299 recipients into batches:
- **Day 1:** 50 emails (rows 1-50)
- **Day 2:** 100 emails (rows 51-150)
- **Day 3:** 149 emails (rows 151-299)

Export each batch to a text file with email addresses.

### Step 4: Send Batch 1 (Day 1 - 50 emails)

1. **Open Gmail** in browser
2. **Compose new email**
3. **Subject:** `Invitation to Rubber Armstrong | Burning Man 2026`
4. **To:** Your email address (yourself)
5. **BCC:** Paste first 50 email addresses (comma-separated)
6. **Body:** Copy from `templates/invitation-2026.html`
   - Replace `{{FirstName}}` with generic "Friend" or use mail merge
   - Replace `{{EmailHash}}` with... wait, this is the problem!

**⚠️ Challenge:** Each recipient needs a unique EmailHash

**Solution:** See "Semi-Automated BCC" below

### Step 5: Send Remaining Batches

Repeat for Day 2 (100 emails) and Day 3 (149 emails).

**Important:** Add 10-30 second delays between sends to mimic human behavior.

## Semi-Automated BCC Method

To send via BCC with unique tracking per recipient, you need a workaround:

### Option 1: No Personalization (Simple)

1. Use a generic tracking hash: `https://track.rubberarmstrong.com/p/campaign2026.gif`
2. Worker will need to handle "campaign" tracking differently
3. You lose per-recipient tracking

**Not recommended** - defeats the purpose!

### Option 2: Chrome Extension (Best)

Create a simple Chrome extension that:
1. Reads next 50 recipients from Google Sheet
2. Generates personalized emails (one per recipient)
3. Clicks "Send" for each (with delays)
4. Updates sheet: "Email Sent = Yes"

**This requires development** - See `scripts/chrome-extension/` (not implemented yet)

### Option 3: Use Apps Script or Mail Merge Instead

For 299 emails with tracking, manual BCC isn't practical. Use Apps Script or YAMM instead.

## Mail Merge Method (YAMM)

### Step 1: Install YAMM

1. Go to [YAMM website](https://yamm.com)
2. Install the Google Workspace add-on
3. Sign up for Starter plan ($25/month for 400 emails/day)

### Step 2: Prepare Sheet

1. Your Google Sheet needs columns:
   - Email
   - FirstName
   - EmailHash (generated by script)

2. Generate EmailHash column:
```bash
cd scripts
node prepare-recipients.js
```

### Step 3: Create Campaign in YAMM

1. Open Google Sheet
2. Extensions → Yet Another Mail Merge → Start mail merge
3. Subject: `Invitation to Rubber Armstrong | Burning Man 2026`
4. Compose email:
   - Copy from `templates/invitation-2026.html`
   - Use merge tags: `{{FirstName}}`, `{{EmailHash}}`
5. Preview to verify merge tags work
6. Send test email to yourself first!

### Step 4: Send Campaign

1. Click "Send emails"
2. Choose send immediately or schedule
3. **Recommended:** 
   - Day 1: 50 emails
   - Day 2: 100 emails
   - Day 3: 149 emails
4. Monitor YAMM dashboard for delivery status

### Step 5: Track in Google Sheet

YAMM will update your sheet with:
- Email sent status
- Delivery status
- Bounce tracking

Your Cloudflare Worker will add:
- Email opened
- Link clicked
- Click timestamps

## Apps Script Method (Recommended)

**Best for:** Automated sending with full tracking integration

**How to use:**

1. **Open Google Sheet → Extensions → Apps Script**
2. **Copy code from:** `scripts/gmail-automation.gs`
3. **Save the file** (Apps Script auto-saves)
4. **Reload Google Sheet** - You'll see menu: **📧 Email Campaign**

### Sending Options

**Menu Options:**
- **📤 Send Small Batch (20 emails)** - For careful testing or gradual sending
- **🚀 Send Batch (50 emails)** - Standard batch size
- **🧪 Send 3 Test Emails** - Test to yourself and 2 others first

### How It Works

The script automatically:
- ✅ Skips emails already marked as "Sent" (prevents duplicates)
- ✅ Checks quota before each send
- ✅ Validates email addresses and tracking URLs
- ✅ Marks emails as sent only after successful delivery
- ✅ Includes both HTML and plain text versions
- ✅ Uses LockService to prevent concurrent executions

### Recommended Sending Strategy

**For 290+ emails, send over 2-3 days:**

**Day 1:** 100 emails
- Option A: 5 batches of 20 emails (use "Send Small Batch")
- Option B: 2 batches of 50 emails (use "Send Batch")
- Wait 5-10 minutes between batches

**Day 2:** 100 emails
- Same approach as Day 1
- Monitor Day 1 results first

**Day 3:** Remaining ~90 emails
- Complete the campaign

**Why this works:**
- Stays well under daily limits (100-500 emails/day depending on account)
- Allows monitoring between days
- Easy to pause if issues arise
- Avoids spam flags

## Batch Sending Strategy

### Why Batch?

Sending 299 emails at once might:
- ❌ Trigger spam filters
- ❌ Overwhelm your Cloudflare Worker
- ❌ Make recipients feel it's spam
- ❌ Give you no chance to adjust

### Recommended Schedule

**Day 1 (Tuesday)** - 100 emails
- Send: 10am-12pm
- Use: 5 batches of 20 emails OR 2 batches of 50 emails
- Monitor: Opens start within 1 hour
- Check: Cloudflare logs, Google Sheet updates
- Adjust: If issues, pause before Day 2

**Day 2 (Wednesday)** - 100 emails
- Send: 10am-2pm
- Review: Day 1 open rate (~40-60%)
- Adjust: Subject line if needed
- Use: Same batch strategy as Day 1

**Day 3 (Thursday)** - Remaining ~90 emails
- Send: 10am-3pm
- Monitor: Final batch tracking
- Plan: Follow-up for non-openers (Day 7)

### Timing Tips

- **Best days:** Tuesday, Wednesday, Thursday
- **Best times:** 10am-2pm recipient timezone
- **Avoid:** Monday mornings, Friday afternoons, weekends
- **Delays:** 10-30 seconds between individual sends

## Email Content Best Practices

### Subject Line

**Good examples:**
- ✅ "Invitation to Rubber Armstrong | Burning Man 2026"
- ✅ "Join Rubber Armstrong at Burning Man 2026"
- ✅ "Rubber Armstrong 2026: Complete Your Statement of Intent"

**Avoid:**
- ❌ "FREE tickets to Burning Man!!!"
- ❌ "CLICK HERE - Limited time offer"
- ❌ All caps, excessive punctuation

### Email Body

**Do:**
- ✅ Personalize with first name
- ✅ Clear call to action
- ✅ Include unsubscribe link
- ✅ Add physical address/contact
- ✅ Use both HTML and plain text

**Don't:**
- ❌ Use spammy words (free, click here, act now)
- ❌ Too many images
- ❌ Excessive formatting
- ❌ Broken links

## Monitoring During Send

### Real-Time Checks

**Cloudflare Worker Logs:**
```bash
wrangler tail
```

Watch for:
- ✅ Successful tracking events
- ❌ Errors (500, authentication failures)

**Google Sheet:**
- Check "Email Opened" column updates
- Verify "First Open At" timestamps
- Monitor "Open Count" incrementing

**Gmail:**
- Check for bounce messages
- Monitor replies
- Watch for spam warnings

### Red Flags to Watch

**Stop sending immediately if:**
- ❌ High bounce rate (>5%)
- ❌ Spam warnings from Gmail
- ❌ Cloudflare Worker errors
- ❌ Sheet not updating

## After Sending

### Day 1-3: Monitor Opens

Expected timeline:
- **1-2 hours:** First opens start
- **4-6 hours:** 20-30% opened
- **24 hours:** 40-50% opened
- **3 days:** 50-60% opened

### Day 7: Follow-Up

1. Filter Google Sheet:
   - `Email Sent = Yes`
   - `Email Opened = No`
2. Export non-openers list
3. Send follow-up email (use `follow-up.html` template)
4. Use different subject line:
   - "Following up: Rubber Armstrong 2026"
   - "Don't miss out: Rubber Armstrong at Burning Man"

### Day 14: Final Follow-Up

1. Filter again for remaining non-openers
2. Send final reminder (make it urgent):
   - "Last call: Rubber Armstrong Steward Tickets"
3. After this, no more follow-ups (respect inbox)

## Troubleshooting

### Emails Going to Spam

**Solutions:**
- Send smaller batches (25-50 at a time)
- Increase delays between sends
- Check SPF/DKIM records
- Ask recipients to add you to contacts
- Warm up account with smaller sends first

### Tracking Not Working

**Check:**
- Cloudflare Worker is deployed
- Custom domain DNS is active
- EmailHash is correct format
- Sheet has tracking columns

**Test:**
- Send to yourself first
- Open in different email clients
- Click links to verify redirect

### Low Open Rates

**Possible causes:**
- Bad subject line (too generic/spammy)
- Wrong send time
- Emails in Promotions tab (Gmail)
- Audience not engaged

**Solutions:**
- A/B test subject lines
- Send at different times
- Ask recipients to move to Primary tab

## Support

For issues:
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [TRACKING_GUIDE.md](TRACKING_GUIDE.md)
- Check Cloudflare Worker logs: `wrangler tail`
- Review Google Sheet formula errors

## Checklist Before Sending

- [ ] Google Sheet updated with recipients
- [ ] EmailHash generated for all recipients
- [ ] Email template customized and tested
- [ ] Test email sent to yourself
- [ ] Test email sent to 2-3 trusted campers
- [ ] Tracking verified working
- [ ] Cloudflare Worker deployed and healthy
- [ ] Batches planned (20/50 per batch, 100-150 per day)
- [ ] Send times scheduled
- [ ] Monitoring plan in place
- [ ] Follow-up emails prepared

## Quick Reference

**Encode email to hash:**
```bash
echo -n "test@example.com" | base64 | tr '+/' '-_' | tr -d '='
```

**Test tracking pixel:**
```
https://track.rubberarmstrong.com/p/{EMAIL_HASH}.gif
```

**Test link redirect:**
```
https://track.rubberarmstrong.com/c/{EMAIL_HASH}/soi_form
```

**View worker logs:**
```bash
wrangler tail
```

**Check sheet:**
```
SOI_Staging tab → Columns AA-AG (tracking data)
```

Good luck with your campaign! 🔥

