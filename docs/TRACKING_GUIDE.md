# Tracking Data Guide

## Overview

This guide explains how to read, interpret, and use the email tracking data in your Google Sheet.

## Tracking Columns

Your Google Sheet now has 7 new columns (27-33):

| Column | Letter | Purpose | Values |
|--------|---------|---------|--------|
| **Email Sent** | AA (27) | Was email sent? | `Yes`, `No`, blank |
| **Email Sent At** | AB (28) | When sent | `2026-01-15 10:30:00` |
| **Email Opened** | AC (29) | Did they open? | `Yes`, `No`, blank |
| **First Open At** | AD (30) | First open timestamp | `2026-01-15 14:22:10` |
| **Open Count** | AE (31) | # of opens | `3`, `5`, etc. |
| **Link Clicked** | AF (32) | Did they click SOI link? | `Yes`, `No`, blank |
| **First Click At** | AG (33) | First click timestamp | `2026-01-15 14:23:05` |

## Dashboard Setup

### Create Dashboard Tab

1. Open your Google Sheet
2. Create new tab: `Email_Dashboard`
3. Add these formulas:

### Key Metrics

**Total Sent:**
```
=COUNTIF(SOI_Staging!AA:AA,"Yes")
```

**Total Opened:**
```
=COUNTIF(SOI_Staging!AC:AC,"Yes")
```

**Open Rate:**
```
=COUNTIF(SOI_Staging!AC:AC,"Yes")/COUNTIF(SOI_Staging!AA:AA,"Yes")
```
Format as percentage.

**Total Clicked:**
```
=COUNTIF(SOI_Staging!AF:AF,"Yes")
```

**Click Rate (of opens):**
```
=COUNTIF(SOI_Staging!AF:AF,"Yes")/COUNTIF(SOI_Staging!AC:AC,"Yes")
```

**Total Submitted SOI:**
```
=COUNTIFS(SOI_Staging!A:A,"<>",SOI_Staging!AA:AA,"Yes")-1
```
(Count non-empty Timestamp where Email Sent = Yes, minus header)

**Conversion Rate (sent → submitted):**
```
=COUNTIFS(SOI_Staging!A:A,"<>",SOI_Staging!AA:AA,"Yes")/COUNTIF(SOI_Staging!AA:AA,"Yes")
```

### Dashboard Layout

```
┌─────────────────────────────────────────┐
│     RUBBER ARMSTRONG 2026 CAMPAIGN      │
│                                         │
│  📧 Sent:      299                      │
│  👁️ Opened:    180 (60%)               │
│  🖱️ Clicked:   55 (31% of opens)       │
│  ✅ Submitted: 28 (9% of sent)          │
│                                         │
│  Conversion Funnel:                     │
│  Sent: 100% ████████████████████        │
│  Open:  60% ████████████                │
│  Click: 18% ███                         │
│  Form:   9% ██                          │
└─────────────────────────────────────────┘
```

## Filter Views

### Non-Openers (for follow-up)

**Purpose:** Find who hasn't opened the email yet

**Filter:**
1. Select data range (columns A-AG)
2. Data → Create a filter
3. Filter conditions:
   - Column AA (Email Sent) = `Yes`
   - Column AC (Email Opened) = `No` or blank

**Result:** List of people to follow up with

**Export:** File → Download → CSV

### Opened but Didn't Click

**Purpose:** They're interested but didn't click through

**Filter:**
- Column AC (Email Opened) = `Yes`
- Column AF (Link Clicked) = `No` or blank

**Action:** Send targeted follow-up emphasizing the SOI link

### Clicked but Didn't Submit

**Purpose:** They started but didn't finish the SOI form

**Filter:**
- Column AF (Link Clicked) = `Yes`
- Column A (Timestamp) = blank

**Action:** Send reminder about completing the form

### Complete Funnel (Success)

**Purpose:** Who completed the entire journey?

**Filter:**
- Column AA (Email Sent) = `Yes`
- Column AC (Email Opened) = `Yes`
- Column AF (Link Clicked) = `Yes`
- Column A (Timestamp) ≠ blank

**Result:** Your engaged campers! 🎉

## Interpreting the Data

### Open Rates

**Expected open rates:**
- **Excellent:** 60%+ (known contacts, personal invite)
- **Good:** 40-60% (community email)
- **Average:** 20-40% (cold outreach)
- **Poor:** <20% (spam or wrong audience)

**Timeline:**
- **1-2 hours:** 20-30% open
- **24 hours:** 40-50% open
- **3 days:** 50-60% open
- **1 week:** 60-70% open (max)

**Factors affecting open rate:**
- Subject line quality
- Send time (day/hour)
- Sender reputation
- Audience quality
- Spam folder placement

### Click Rates

**Expected click rates (of opens):**
- **Excellent:** 30%+ (clear CTA, engaged audience)
- **Good:** 20-30% (standard invite)
- **Average:** 10-20% (multiple links)
- **Poor:** <10% (weak CTA or broken links)

**For your campaign:**
- Target: 20-30% click rate
- 180 opens × 30% = ~55 clicks
- This is GOOD for event invitations

### Conversion Rate (Click → Submit)

**Expected:**
- **Excellent:** 50%+ submit after clicking
- **Good:** 30-50%
- **Average:** 20-30%
- **Poor:** <20%

**Why people don't submit after clicking:**
- Form too long
- Technical issues
- "I'll do it later" (and forget)
- Changed mind after seeing form

## Open Count Analysis

### What Open Count Tells You

**Open Count = 1:**
- Read once, done (good or bad?)
- May have submitted immediately

**Open Count = 2-3:**
- Normal behavior
- Opened on phone, then desktop
- Or opened multiple times to review

**Open Count = 5+:**
- Very interested!
- Shared with partners/friends?
- Or email client re-loading images

### Multiple Opens Pattern

**High open count** (5-10+) might mean:
1. Very engaged (forwarded to partner)
2. Email client bug (keeps reloading)
3. Shared with camp mates
4. Using multiple devices

**Filter for high engagement:**
```
Column AE (Open Count) ≥ 5
Column AF (Link Clicked) = No
```

**Action:** Personal reach-out - they're clearly interested!

## Time-Based Analysis

### Peak Open Times

**Create a pivot table:**
1. Data → Pivot table
2. Rows: Hour (extract from First Open At)
3. Values: COUNT of First Open At
4. Chart: Column chart

**Use insights for future campaigns:**
- When do people read emails?
- Best time to send follow-ups?

### Open Velocity

**Track opens over time:**

Day 1:
```
=COUNTIFS(SOI_Staging!AD:AD,">="&DATE(2026,1,15),SOI_Staging!AD:AD,"<"&DATE(2026,1,16))
```

**Chart:** Opens per day

**Good:** Steady stream of opens over 3-7 days
**Bad:** All opens in first hour (bot?) or no opens after day 1

## Engagement Scoring

### Create Engagement Score

Add column in sheet:
```
=IF(AC2="Yes",1,0) + IF(AF2="Yes",2,0) + IF(A2<>"",3,0)
```

**Score:**
- 0 = Not opened
- 1 = Opened only
- 3 = Opened + Clicked
- 6 = Opened + Clicked + Submitted

**Filter by score ≥ 3** for most engaged people.

## Cohort Analysis

### By Source

If you track referral source:

**Filter:**
- Returning campers (Burns RA > 0)
- New applicants (Burns RA = 0)
- Referred by specific campmate

**Compare open rates:**
- Do returning campers open more?
- Which referrers bring engaged people?

### By Demographics

**Compare:**
- Open rate by country
- Click rate by birth year
- Submission rate by likelihood

**Insights for future campaigns:**
- Target demographics
- Personalize messaging

## Exporting Data

### Export Full Dataset

1. File → Download → CSV
2. Import to Excel/Google Sheets
3. Analyze with pivot tables

### Export Filtered View

1. Apply filter (e.g., non-openers)
2. Select visible cells
3. Copy → Paste to new sheet
4. Download as CSV

### Export for Mail Merge

**For follow-up emails:**
1. Filter non-openers
2. Export columns: Email, FirstName, EmailHash
3. Use for next campaign

## Advanced: Tracking Pixel Analytics

### Device/Browser Detection

The worker logs User-Agent, but doesn't parse it yet.

**To add:**
1. Edit `cloudflare-worker/worker.js`
2. Parse User-Agent string
3. Add columns: Device, Browser, OS
4. Track desktop vs mobile opens

### Geographic Tracking

**Using IP address:**
1. Worker gets request IP
2. Look up geo location (MaxMind, IP2Location)
3. Add column: Country, City
4. Map visualization

## Troubleshooting

### Tracking Not Updating

**Check:**
1. Cloudflare Worker is running: `wrangler tail`
2. Sheet ID is correct in worker secrets
3. Service Account has Editor access
4. Email column (H) has valid emails

**Test manually:**
```bash
# Test tracking pixel
curl https://track.rubberarmstrong.com/p/dGVzdEBleGFtcGxlLmNvbQ.gif

# Check worker logs
wrangler tail
```

### Duplicate Tracking Events

**If Open Count increments too fast:**
- Email client may be pre-fetching images
- Multiple devices opening simultaneously
- Forwarded email being opened

**Solution:** This is normal, shows high engagement

### Missing Opens

**Remember:** Tracking isn't 100% accurate

**Can't track if:**
- Recipient disabled images
- Using plain text email client
- Corporate firewall blocks tracking
- Apple Mail Privacy Protection enabled

**Expected accuracy:** ~70-80% of actual opens

## Best Practices

### Data Privacy

- Don't share tracking data publicly
- Keep EmailHash private (it's reversible)
- Delete data after campaign (optional)
- Respect unsubscribes

### Data Retention

**Recommended:**
- Keep for campaign duration (3 months)
- Archive after Burning Man
- Delete EmailHash column (keep aggregate stats)

### Using Insights

**Do:**
- Follow up with non-openers
- Reach out to high-engagement people
- Improve future campaigns based on data
- A/B test subject lines

**Don't:**
- Spam people who unsubscribe
- Share individual tracking data
- Use data to pressure people
- Make assumptions (ask questions!)

## Quick Reference

**Key Columns:**
- AA: Email Sent
- AC: Email Opened  
- AF: Link Clicked
- A: SOI Submitted (Timestamp)

**Key Metrics:**
- Open Rate = Opened / Sent
- Click Rate = Clicked / Opened
- Conversion = Submitted / Sent

**Filter Formulas:**
```
Non-openers: AA="Yes" AND AC<>"Yes"
Clicked but didn't submit: AF="Yes" AND A=""
Complete funnel: AA="Yes" AND AC="Yes" AND AF="Yes" AND A<>""
```

## Support

For tracking issues:
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Check Cloudflare Worker logs: `wrangler tail`
- Verify Service Account permissions
- Test tracking pixel manually

