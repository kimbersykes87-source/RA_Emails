# Campaign Preparation Guide

## Overview

This guide helps you prepare your recipient list and finalize everything before sending to 299 people.

## Adding a new campaign (e.g. 2027)

When you run a new year or campaign, use this checklist so the sheet and Apps Script stay in sync. The **campaign registry** in `scripts/config.gs` (`CAMPAIGN_REGISTRY`) and column layout (`CAMPAIGN_SHEET_COLUMNS`) are the single source of truth for Apps Script; the Worker uses `cloudflare-worker/config.js` (`CAMPAIGN_COLUMNS`) for column letters.

1. **Add a new tab** in the Google Sheet (e.g. `Email_Campaign_2027`) with the **same column layout** as `Email_Campaign_2026` (44 columns). See [SHEET_LAYOUT.md](SHEET_LAYOUT.md) for the full column reference. You can duplicate the `Email_Campaign_2026` tab and rename it, then clear data.
2. **Update config in `scripts/config.gs`**:
   - Add an entry to `CAMPAIGN_REGISTRY`, e.g. `{ id: '2027', invitationSheet: 'Email_Campaign_2027', approvedSheet: 'SOI_Approved' }`.
   - If the new campaign uses a different sheet name, add or extend `CAMPAIGN_SHEET_COLUMNS` (e.g. a new key or sheet names) and any `EMAIL_CONFIG`/`REMINDER_CONFIG` that should point to the new tab. If the layout is identical to 2026, you can reuse the same column indices and only change sheet names where needed.
3. **Worker (optional):** If the tracking Worker must write to the new tab, update `cloudflare-worker/config.js`: add a campaign type or duplicate the invitation/reminder mapping with the new sheet tab name. Redeploy the Worker.
4. **In the sheet:** Run **Email Campaign → Tracking URLs → Setup Sheet Columns** (if you added new columns), then **Add All Tracking URLs** so the new tab gets pixel and click URLs.
5. **Sync `apps-script-consolidated/`** from `scripts/` (copy the updated `config.gs` into `apps-script-consolidated/Config.gs`) and redeploy Apps Script if you use the consolidated folder.

You do **not** need to rename existing 2026 tabs or change existing 2026 behavior.

## Step 1: Gather Recipient List

### Sources

Where are your 299 recipients coming from?

**Option A: External List**
- CSV export from previous years
- Spreadsheet from camp leads
- Email list from referrals

**Option B: Existing SOI Database**
- Past campers from SOI_Approved tab
- Previous year applicants
- Returning campers

**Option C: Mixed Sources**
- Combine multiple lists
- Deduplicate
- Validate

### Required Information

For each recipient, you need:
- **Email** (required)
- **First Name** (recommended for personalization)
- Last Name (optional)

### Format

CSV file with headers:
```csv
Email,FirstName,LastName
john@example.com,John,Doe
jane@example.com,Jane,Smith
```

## Step 2: Import to Google Sheet

### Create Campaign Tab (Recommended)

1. Open "RA 2026 SOI Submissions" sheet
2. Create new tab: `Email_Campaign_2026`
3. Copy headers from `SOI_Staging` (all 33 columns)
4. Import your recipient list

### Or Use Existing SOI_Staging

If recipients are already in SOI_Staging:
1. Filter for who to email
2. Mark `Email Sent = No` for target recipients
3. Skip to Step 3

## Step 3: Validate Email List

### Remove Duplicates

```bash
# In Google Sheets:
# Data → Data cleanup → Remove duplicates
```

Or manually:
1. Sort by Email column
2. Look for duplicates
3. Keep only one copy of each

### Validate Email Format

Check for:
- Missing @ symbol
- Invalid domains
- Obvious typos

**Google Sheets formula:**
```
=IF(ISERROR(FIND("@",H2)),"Invalid","Valid")
```

### Remove Invalid Emails

Common issues:
- `noreply@...` addresses
- `test@test.com` test entries
- Incomplete addresses

**Target:** 299 valid, unique email addresses

## Step 4: Generate Email Hashes

Each recipient needs a unique tracking hash.

### Option A: Using Test Script

```bash
cd scripts

# Batch encode from file
node test-tracking.js batch recipients.txt

# Or encode one at a time
node test-tracking.js encode john@example.com
```

### Option B: Google Sheets Formula

Add column `EmailHash` with formula:
```
=REGEXREPLACE(REGEXREPLACE(REGEXREPLACE(BASE64(H2),"\+","-"),"/","_"),"=","")
```

Where H2 is the Email column.

**Note:** This formula works in Google Sheets (uses BASE64 function).

### Verify Hashes

Test a few hashes:
```bash
node scripts/test-tracking.js decode dGVzdEBleGFtcGxlLmNvbQ
# Should return: test@example.com
```

## Step 5: Segment Your List

### By Priority

**High Priority (Send Day 1):**
- Returning campers
- Referred by core team
- Past SOI approvals

**Medium Priority (Send Day 2):**
- Previous applicants
- Friends of campers
- Wait-listed from previous years

**Low Priority (Send Day 3):**
- Cold leads
- New referrals
- Unknown contacts

### By Region (Optional)

Consider time zones:
- West Coast: Send 10am-2pm PST
- East Coast: Send 1pm-5pm EST
- International: Send morning their time

### Mark Batches

Add column `Batch` with values:
- `Day 1` (50 people)
- `Day 2` (100 people)
- `Day 3` (149 people)

## Step 6: Prepare Sheet Columns

### Required Columns

For the full column list (index, letter, header), see **[SHEET_LAYOUT.md](SHEET_LAYOUT.md)**. Ensure these columns exist (should already from Config.gs / Setup Sheet Columns):

| Column | Letter | Initial Value |
|--------|---------|---------------|
| Email | H | recipient@example.com |
| First | B | John |
| Email Sent | AA (27) | No |
| Email Sent At | AB (28) | (blank) |
| Email Opened | AC (29) | (blank) |
| First Open At | AD (30) | (blank) |
| Open Count | AE (31) | 0 |
| Link Clicked | AF (32) | (blank) |
| First Click At | AG (33) | (blank) |

### Set Initial Values

For all 299 recipients:
1. `Email Sent` = `No`
2. `Email Sent At` = blank
3. All tracking columns = blank or 0

## Step 7: Finalize Email Content

### Review Template

1. Open `templates/invitation-2026.html`
2. Check all content is accurate:
   - Dates correct
   - Links work
   - Steward ticket info current
   - Contact info accurate

### Test Personalization

Replace template variables:
- Standard greeting (no personalization): "Hello past, present and future Rubbers,"
- `{{EmailHash}}` → Generated hash

**Test with real data:**
```html
Hello past, present and future Rubbers,
<img src="https://track.rubberarmstrong.com/p/dGVzdEBleGFtcGxlLmNvbQ.gif">  <!-- {{EmailHash}} -->
```

### Subject Line

Choose your subject line:
- "Invitation to Rubber Armstrong | Burning Man 2026" (current)
- "Join Rubber Armstrong at Burning Man 2026"
- "[FirstName], you're invited to Burning Man with Rubber Armstrong"

**Test:** Send to yourself with each subject line, see which you'd open.

## Step 8: Set Up Sending Method

### Option A: Manual Gmail + BCC

**Preparation:**
1. Export 50 emails for Day 1
2. Save as text file (comma-separated)
3. Ready to paste into BCC field

**Challenge:** Can't personalize or use unique tracking hashes with BCC.
**Solution:** Consider Options B or C.

### Option B: Mail Merge (YAMM)

**Preparation:**
1. Install YAMM add-on
2. Sign up for Starter plan ($25/month)
3. Configure mail merge with your sheet
4. Test with 2-3 emails

**Advantages:**
- Personalization works
- Tracking hashes work
- Professional sender

### Option C: Apps Script

**Preparation:**
1. Copy `apps-script/EmailSender.gs`
2. Paste into Apps Script (Extensions → Apps Script)
3. Update CONFIG to match your sheet
4. Test with 1-2 emails first

**Advantages:**
- Fully automated
- Complete control
- No monthly fees

**See:** [../apps-script/README.md](../apps-script/README.md)

## Step 9: Schedule Send Times

### Recommended Schedule

**Day 1: Tuesday, 10am-12pm**
- Send: 50 emails
- Target: High-priority recipients
- Monitor: First 2 hours closely

**Day 2: Wednesday, 10am-2pm**
- Send: 100 emails
- Review: Day 1 results first
- Adjust: If needed based on open rates

**Day 3: Thursday, 10am-3pm**
- Send: 149 emails
- Monitor: Final batch tracking

### Best Practices

**Good send times:**
- Tuesday-Thursday
- 10am-2pm recipient timezone
- Avoid Monday (busy), Friday (weekend mode)

**Batch delays:**
- Wait 10-30 seconds between individual sends
- Mimics human behavior
- Prevents spam flags

## Step 10: Prepare Monitoring

### Dashboard Setup

Create `Email_Dashboard` tab with formulas:

**Total Sent:**
```
=COUNTIF(Email_Campaign_2026!AA:AA,"Yes")
```

**Total Opened:**
```
=COUNTIF(Email_Campaign_2026!AC:AC,"Yes")
```

**Open Rate:**
```
=COUNTIF(Email_Campaign_2026!AC:AC,"Yes")/COUNTIF(Email_Campaign_2026!AA:AA,"Yes")
```

### Monitoring Plan

**During send (real-time):**
- [ ] Cloudflare Worker logs: `wrangler tail`
- [ ] Gmail sent folder (check for bounces)
- [ ] Google Sheet (watch for updates)

**After send (hourly first day):**
- [ ] Check open rates
- [ ] Review click rates
- [ ] Monitor for issues
- [ ] Reply to questions

**Days 2-7:**
- [ ] Daily dashboard check
- [ ] Plan follow-up for non-openers
- [ ] Engage with responders

## Final Checklist

### Data Preparation
- [ ] 299 valid, unique email addresses
- [ ] Duplicates removed
- [ ] Email format validated
- [ ] FirstName populated for personalization
- [ ] EmailHash generated for all recipients
- [ ] Batches assigned (Day 1/2/3)
- [ ] All columns set up correctly

### Technical Setup
- [ ] Cloudflare Worker deployed
- [ ] Custom domain active
- [ ] Secrets configured
- [ ] Service Account has sheet access
- [ ] Tracking tested and working
- [ ] Worker logs monitored

### Content
- [ ] Email template finalized
- [ ] Subject line chosen
- [ ] Links verified (all work)
- [ ] Personalization tested
- [ ] Plain text version ready
- [ ] Unsubscribe link included

### Sending Method
- [ ] Method chosen (manual/YAMM/Apps Script)
- [ ] Sender configured and tested
- [ ] Schedule planned (days/times)
- [ ] Batch sizes confirmed
- [ ] Delays configured

### Monitoring
- [ ] Dashboard created
- [ ] Formulas tested
- [ ] Monitoring plan documented
- [ ] Team notified (if applicable)
- [ ] Response plan ready

## Emergency Contacts

**If issues arise:**
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review Cloudflare Worker logs
3. Test with single email first
4. Pause campaign if major issues

## You're Ready When...

✅ All 299 recipients validated  
✅ Email hashes generated  
✅ Batches assigned  
✅ Tracking tested successfully  
✅ Email content finalized  
✅ Sending method configured  
✅ Schedule planned  
✅ Monitoring in place  
✅ Team briefed  
✅ Excited to launch! 🚀

## Next Step

Proceed to [SENDING_GUIDE.md](SENDING_GUIDE.md) to execute the campaign.

Good luck! 🔥

