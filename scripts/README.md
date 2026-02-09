# Helper Scripts

## test-tracking.js

Test email tracking system components.

### Usage

```bash
node test-tracking.js <command> [args]
```

### Commands

**Encode email to hash:**
```bash
node test-tracking.js encode test@example.com
```
Output: `dGVzdEBleGFtcGxlLmNvbQ`

**Decode hash to email:**
```bash
node test-tracking.js decode dGVzdEBleGFtcGxlLmNvbQ
```
Output: `test@example.com`

**Test tracking pixel:**
```bash
node test-tracking.js pixel test@example.com
```
Fetches the pixel and verifies it returns correctly.

**Test click redirect:**
```bash
node test-tracking.js click test@example.com soi_form
```
Tests link redirect and verifies 302 response.

**Batch encode emails:**
```bash
node test-tracking.js batch recipients.txt
```
Reads emails from file (one per line) and generates hashes for all.

**Generate test email:**
```bash
node test-tracking.js template John john@example.com
```
Generates HTML email with tracking for testing.

### Examples

**Test complete workflow:**
```bash
# 1. Encode your email
node test-tracking.js encode your@email.com

# 2. Test pixel loads
node test-tracking.js pixel your@email.com

# 3. Test link redirects
node test-tracking.js click your@email.com soi_form

# 4. Generate test email
node test-tracking.js template YourName your@email.com
# Copy output, paste in Gmail, send to yourself
```

## prepare-recipients.js

(To be implemented)

Prepares recipient list from Google Sheet or CSV file.

**Planned features:**
- Read emails from CSV or Google Sheet
- Generate EmailHash for each
- Validate email addresses
- Remove duplicates
- Output formatted for mail merge

**Future usage:**
```bash
node prepare-recipients.js --input recipients.csv --output ready.csv
```

## Common Tasks

### Generate tracking URLs for manual sending

```bash
# Encode single email
node test-tracking.js encode friend@example.com

# Copy the hash, use in email:
# Pixel: https://track.rubberarmstrong.com/p/{HASH}.gif
# Link: https://track.rubberarmstrong.com/c/{HASH}/soi_form
```

### Test tracking is working

```bash
# Test with your own email
node test-tracking.js pixel your@email.com
node test-tracking.js click your@email.com soi_form

# Check Cloudflare Worker logs
cd ../cloudflare-worker
wrangler tail
```

### Batch encode recipient list

Create `recipients.txt`:
```
john@example.com
jane@example.com
bob@example.com
```

Run:
```bash
node test-tracking.js batch recipients.txt
```

Output will show hash and URLs for each recipient.

## Troubleshooting

### "Cannot find module"

Install Node.js if not installed:
```bash
# Check Node version
node --version

# Should be v18+ for fetch() support
```

### Fetch errors

Make sure Cloudflare Worker is deployed:
```bash
cd ../cloudflare-worker
wrangler deploy
```

### Hash doesn't decode

Check for copy/paste errors. Hash should only contain:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Hyphens (-)
- Underscores (_)
- No padding (=)

## Support

See main documentation:
- [SETUP.md](../docs/SETUP.md)
- [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)

