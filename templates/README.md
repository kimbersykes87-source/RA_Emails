# Email Templates

## Files

- `invitation-2026.html` - Main invitation email (HTML version)
- `invitation-2026.txt` - Main invitation email (Plain text version)
- `follow-up.html` - Follow-up email for non-openers (HTML version)
- `follow-up.txt` - Follow-up email for non-openers (Plain text version)

## Template Variables

Both templates use placeholders that need to be replaced before sending:

- `{{FirstName}}` - Recipient's first name
- `{{EmailHash}}` - Base64-encoded email address (for tracking)

## How to Use Templates

### Method 1: Manual Sending with Mail Merge

1. Use a Gmail mail merge extension (YAMM, Mailmeet, etc.)
2. Upload the HTML template
3. Map fields: First Name → {{FirstName}}
4. The extension will handle {{EmailHash}} generation
5. Send in batches (50-100 at a time)

### Method 2: Apps Script Sender

See [`../apps-script/EmailSender.gs`](../apps-script/EmailSender.gs) for automated sending script.

The script will:
- Read recipients from Google Sheet
- Replace template variables
- Generate {{EmailHash}} for each recipient
- Send with Gmail API

### Method 3: Manual Gmail Compose

Not recommended for 299 emails, but possible for testing:

1. Open `invitation-2026.html` in browser
2. Replace {{FirstName}} with actual name
3. Replace {{EmailHash}} with base64-encoded email (use test script)
4. Copy HTML and paste into Gmail compose
5. Send

## Generating Email Hash

Email hash is base64 URL-safe encoding:

```javascript
function encodeEmail(email) {
  const encoded = btoa(email); // Base64 encode
  return encoded
    .replace(/\+/g, '-')  // Make URL-safe
    .replace(/\//g, '_')  // Make URL-safe
    .replace(/=/g, '');   // Remove padding
}

// Example:
encodeEmail('test@example.com')
// Returns: 'dGVzdEBleGFtcGxlLmNvbQ'
```

Test it:
```bash
cd ../scripts
node test-tracking.js encode test@example.com
```

## Tracking Features

### 1. Tracking Pixel

Located at the bottom of HTML templates:

```html
<img src="https://track.rubberarmstrong.com/p/{{EmailHash}}.gif" ... />
```

This invisible 1x1 pixel tracks when the email is opened.

### 2. Tracked Links

All links use the tracking redirect:

```html
<a href="https://track.rubberarmstrong.com/c/{{EmailHash}}/soi_form">
  Complete Statement of Intent
</a>
```

Format: `/c/{email-hash}/{link-id}`

Link IDs (defined in worker config):
- `soi_form` - Statement of Intent form
- `unsubscribe` - Unsubscribe
- `main_site` - Main website

## Customization

### Change Link Destinations

Edit [`../cloudflare-worker/config.js`](../cloudflare-worker/config.js):

```javascript
export const REDIRECT_URLS = {
  soi_form: 'https://soi.rubberarmstrong.com',
  unsubscribe: 'mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe',
  main_site: 'https://rubberarmstrong.com',
  // Add more...
};
```

### Change Email Content

Edit HTML/TXT templates directly. Keep the tracking elements:
- Tracking pixel `<img>` tag at bottom
- Tracked links format: `/c/{{EmailHash}}/link_id`

### Test Before Sending

1. Replace variables with test data
2. Send to yourself
3. Check tracking updates in Google Sheet
4. Verify links work correctly

## Best Practices

### Email Deliverability

1. **Always include plain text version** - Send multipart (HTML + text)
2. **Keep HTML simple** - Avoid complex CSS, JavaScript, or external stylesheets
3. **Test on multiple clients** - Gmail, Outlook, Apple Mail
4. **Include unsubscribe link** - Required by CAN-SPAM Act
5. **Add physical address** - Consider adding camp contact info

### Personalization

- Standard greeting used for all recipients: "Hello past, present and future Rubbers,"
- Reference past burns if available
- Mention mutual friends/referrals
- Keep it personal, not mass-mailing tone

### Timing

- **Best days**: Tuesday, Wednesday, Thursday
- **Best times**: 10am-2pm recipient's timezone
- **Avoid**: Monday mornings, Friday afternoons, weekends

## Testing

Before sending to 299 people:

1. **Send to yourself** - Check formatting, links, tracking
2. **Send to 2-3 trusted campers** - Get feedback
3. **Test on multiple devices** - Desktop, mobile, tablet
4. **Check multiple email clients** - Gmail, Outlook, Apple Mail
5. **Verify tracking works** - Check Google Sheet updates

## Troubleshooting

### Tracking pixel not loading

- Check custom domain is set up: `track.rubberarmstrong.com`
- Verify Cloudflare Worker is deployed
- Test pixel URL directly in browser

### Links not redirecting

- Check link ID matches config (case-sensitive)
- Verify Cloudflare Worker is running
- Test redirect URL directly

### Template variables not replacing

- Check variable names match exactly: `{{FirstName}}` not `{{firstName}}`
- Ensure mail merge tool supports custom variables
- Test with manual replacement first

## Support

See main documentation:
- [SENDING_GUIDE.md](../docs/SENDING_GUIDE.md)
- [TRACKING_GUIDE.md](../docs/TRACKING_GUIDE.md)
- [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)

