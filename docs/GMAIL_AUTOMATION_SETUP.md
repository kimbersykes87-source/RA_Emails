# Gmail Automation Setup Guide

Complete guide to set up free, automated email sending with tracking via Google Apps Script.

## Overview

- ✅ **100% Free** - No paid tools required
- ✅ **Automated** - Set and forget
- ✅ **Spam-Safe** - Built-in rate limiting
- ✅ **Tracking** - Opens, clicks, timestamps
- ✅ Sends from YOUR Gmail

---

## Step 1: Add Tracking URLs to Sheet

### 1.1 Open Apps Script

1. Open your **Google Sheet**: "Rubber Armstrong 2026 - SOI Submissions"
2. Go to **Extensions → Apps Script**
3. You should see your existing `Config.gs` and `FormHandler.gs` files

### 1.2 Add Tracking URL Script

1. Click **+ (Add File)** → **Script**
2. Name it: `AddTrackingUrls`
3. **Delete the default code**
4. Copy the contents of `scripts/add-tracking-urls.gs`
5. Paste into the new file
6. Click **Save** (💾 icon)

### 1.3 Run the Script

1. Select **`addTrackingUrls`** from the function dropdown
2. Click **Run** (▶️)
3. **First time:** Click "Review Permissions" → Choose your account → "Advanced" → "Go to ... (unsafe)" → "Allow"
4. Wait 10-20 seconds
5. You'll see: **"✓ Generated tracking URLs for 290 contacts"**

### 1.4 Verify

Go to your **Email_Campaign_2026** tab and scroll right to columns **AH** and **AI**. You should see:
- **AH (PIXEL_TRACKING_URL)**: URLs ending in `.gif`
- **AI (CLICK_TRACKING_URL)**: URLs with `/c/...`

---

## Step 2: Add Email Automation Script

### 2.1 Create Email Script

1. In Apps Script, click **+ (Add File)** → **Script**
2. Name it: `EmailCampaign`
3. Copy the contents of `scripts/gmail-automation.gs`
4. Paste and **Save**

### 2.2 Reload the Sheet

1. Close Apps Script
2. **Refresh your Google Sheet** (F5)
3. You'll see a new menu: **📧 Email Campaign**

---

## Step 3: Test Send

### 3.1 Send Test Email to Yourself

1. Click **📧 Email Campaign → ✉️ Test Send (to yourself)**
2. Click "Allow" if prompted
3. Check your Gmail inbox
4. Verify:
   - Email looks good
   - Logo appears
   - Button works
   - No spam folder

---

## Step 4: Send Campaign

### Option A: Manual Batches (Recommended)

**Best for:** Control over when emails are sent

**Two batch size options:**

1. **📤 Send Small Batch (20 emails)** - For careful, gradual sending
   - Best for: Testing, first-time sends, or when you want more control
   - Run 5 times = 100 emails
   - Wait 5-10 minutes between batches

2. **🚀 Send Batch (50 emails)** - Standard batch size
   - Best for: Faster sending once you're confident
   - Run 2 times = 100 emails
   - Wait 5-10 minutes between batches

**How it works:**
- Script automatically skips emails already marked as "Sent"
- Checks quota before each send
- Marks emails as sent only after successful delivery
- Shows summary when complete

**Recommended Schedule for 290 emails:**
- **Day 1:** 100 emails
  - Option A: 5 batches of 20 emails (use "Send Small Batch")
  - Option B: 2 batches of 50 emails (use "Send Batch")
- **Day 2:** 100 emails (same approach)
- **Day 3:** Remaining ~90 emails
- ✅ **Done!**

### Option B: Automated Sending

**Best for:** Set and forget

1. Click **📧 Email Campaign → ⚙️ Setup Automated Sending**
2. Script will send 50 emails every 2 hours
3. Runs from 8am-8pm automatically
4. All 290 sent in ~2 days

**To stop automated sending:**
- **📧 Email Campaign → ⏹ Stop Automated Sending**

---

## Step 5: Monitor Results

### View Campaign Statistics

Click **📧 Email Campaign → 📊 View Campaign Stats**

You'll see:
```
📊 Campaign Statistics

Total contacts: 290
✓ Sent: 150 (51.7%)
👁 Opened: 87 (58.0%)
🔗 Clicked: 43 (28.7%)
⏳ Remaining: 140
📭 Quota remaining today: 350
```

### Real-Time Tracking

Watch your **Email_Campaign_2026** tab update automatically:
- **AA (Email Sent)**: Yes/No
- **AB (Email Sent At)**: Timestamp
- **AC (Email Opened)**: Yes/No
- **AD (First Open At)**: Timestamp
- **AE (Open Count)**: Number
- **AF (Link Clicked)**: Yes/No
- **AG (First Click At)**: Timestamp

---

## Spam Prevention Features

The script automatically:
- ✅ Sends 20 or 50 per batch (your choice)
- ✅ 1-second delay between emails
- ✅ Max 150 per day (well under Gmail's 500 limit)
- ✅ Checks Gmail quota before each send
- ✅ Stops if quota reached
- ✅ Skips emails already marked as "Sent" (prevents duplicates)
- ✅ Uses LockService to prevent concurrent executions

---

## Troubleshooting

### "Daily email quota reached"
- You've hit Gmail's 500/day limit
- Wait until tomorrow
- Consider using 100/day limit instead

### Emails going to spam
- Reduce BATCH_SIZE to 25
- Increase MAX_PER_DAY delay
- Ask recipients to add you to contacts
- Warm up: Send 25 day 1, 50 day 2, 100 day 3

### Script not running
- Check: **Extensions → Apps Script → Triggers** (clock icon)
- Verify trigger is active
- Check execution log for errors

### Tracking not updating
- Verify worker is running: `https://email-tracking-worker.kimbersykes87.workers.dev/`
- Check tracking URLs are correct in columns AH/AI
- Test pixel manually in browser

---

## Advanced: Customize the Email

### Edit the Template

1. Open **Apps Script → EmailCampaign.gs**
2. Find `function getEmailTemplate(...)`
3. Edit the HTML
4. Save and test send

### Standard Greeting

All emails use the same greeting:
```javascript
const greeting = 'Hello past, present and future Rubbers,';
```

### Change Sending Schedule

In `CONFIG` object:
```javascript
BATCH_SIZE: 50,           // Emails per batch
MAX_PER_DAY: 150,         // Maximum per day
DELAY_BETWEEN_EMAILS: 1000, // Milliseconds (1000 = 1 second)
```

---

## Support

If you encounter issues:
1. Check **Apps Script → Execution log** for errors
2. Run `getCampaignStats()` to see current state
3. Verify all columns are correct in CONFIG

---

## Summary

✅ **Free** Gmail automation  
✅ **Safe** spam prevention  
✅ **Tracked** opens & clicks  
✅ **Automated** or manual control  
✅ **290 emails** sent in 2 days

You're all set! 🚀

