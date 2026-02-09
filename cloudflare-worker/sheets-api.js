/**
 * Google Sheets API Client for Cloudflare Worker
 * Handles authentication and sheet updates
 */

import { CAMPAIGN_COLUMNS } from './config.js';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Get OAuth access token from service account credentials
 */
async function getAccessToken(serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signJWT(signatureInput, serviceAccount.private_key);
  
  // Build JWT
  const jwt = `${signatureInput}.${signature}`;
  
  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Sign JWT using RS256
 */
async function signJWT(input, privateKey) {
  // Import private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length - 1
  ).trim();
  
  // Convert PEM to binary
  const binaryDer = base64ToArrayBuffer(pemContents);
  
  // Import key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );
  
  // Sign
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    data
  );
  
  // Encode signature as base64url
  return arrayBufferToBase64Url(signature);
}

/**
 * Update sheet tracking data for a given email with retry logic
 * metadata.campaign: 'invitation' | 'reminder' | 'confirmation'
 */
export async function updateSheetTracking(env, email, eventType, metadata = {}) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await updateSheetTrackingInternal(env, email, eventType, metadata);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed for ${eventType} tracking:`, error.message);

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Failed to track ${eventType} for ${email} after ${maxRetries} retries:`, lastError);
}

/**
 * Internal function to update sheet tracking (called by retry wrapper)
 */
async function updateSheetTrackingInternal(env, email, eventType, metadata = {}) {
  if (!isValidEmail(email)) {
    console.error(`Invalid email format: ${email}`);
    return;
  }

  const campaign = metadata.campaign || 'invitation';
  const cols = CAMPAIGN_COLUMNS[campaign];
  if (!cols) {
    console.error(`Unknown campaign: ${campaign}`);
    return;
  }

  const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const spreadsheetId = env.SHEET_ID;
  const sheetTab = cols.sheetTab;

  const rowIndex = await findRowByEmail(accessToken, spreadsheetId, email, sheetTab);

  if (rowIndex === -1) {
    // Only create new rows for invitation (legacy behavior)
    if (campaign === 'invitation') {
      console.log(`Creating new invitee row for: ${email}`);
      await createNewInviteeRow(env, email, eventType, metadata, sheetTab);
    }
    return;
  }

  const now = new Date().toISOString();
  const updates = [];

  if (eventType === 'open') {
    updates.push({ range: `${sheetTab}!${cols.opened}${rowIndex}`, values: [['Yes']] });

    const firstOpenCell = await getCell(accessToken, spreadsheetId, `${sheetTab}!${cols.firstOpenAt}${rowIndex}`);
    if (!firstOpenCell || firstOpenCell.trim() === '') {
      updates.push({ range: `${sheetTab}!${cols.firstOpenAt}${rowIndex}`, values: [[now]] });
    }

    const openCount = await getCell(accessToken, spreadsheetId, `${sheetTab}!${cols.openCount}${rowIndex}`);
    const currentCount = parseInt(openCount) || 0;
    const newCount = currentCount + 1;
    if (newCount > 1000) console.warn(`Suspicious open count for ${email}: ${newCount}`);
    updates.push({ range: `${sheetTab}!${cols.openCount}${rowIndex}`, values: [[newCount]] });
  } else if (eventType === 'click' && cols.clicked && cols.firstClickAt) {
    updates.push({ range: `${sheetTab}!${cols.clicked}${rowIndex}`, values: [['Yes']] });

    const firstClickCell = await getCell(accessToken, spreadsheetId, `${sheetTab}!${cols.firstClickAt}${rowIndex}`);
    if (!firstClickCell || firstClickCell.trim() === '') {
      updates.push({ range: `${sheetTab}!${cols.firstClickAt}${rowIndex}`, values: [[now]] });
    }
  }

  if (updates.length > 0) {
    await batchUpdateWithTimeout(accessToken, spreadsheetId, updates, 8000);
    console.log(`Updated ${eventType} tracking for ${email} (${campaign})`);
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Create a new row for an invitee who opened/clicked but isn't in the sheet yet
 */
export async function createNewInviteeRow(env, email, eventType, metadata = {}, sheetTab = 'SOI_Staging') {
  try {
    // Validate email before creating row
    if (!isValidEmail(email)) {
      console.error(`Cannot create row - invalid email: ${email}`);
      return;
    }
    
    const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const spreadsheetId = env.SHEET_ID;
    
    const now = new Date().toISOString();
    
    // Build new row with 33 columns
    const newRow = [
      '', // Timestamp - empty (they haven't submitted SOI yet)
      '', // First
      '', // Last
      '', // Sex
      '', // Birth Year
      '', // Country (Birth)
      '', // Country (Res)
      email, // Email
      '', // Phone Code
      '', // Phone
      '', // Ref. Campmate
      '', // Burns (RA)
      '', // Burns (RA) Count
      '', // Burns (Other)
      '', // Burns (Other) Count
      '', // First Burn?
      '', // Likelihood
      '', // Steward Ticket?
      '', // What Offer
      '', // Notes
      'Pending', // Status
      '', // Reviewed By
      '', // Reviewed At
      '', // Internal Notes
      'Email Tracking', // Form
      '', // Synced to Contacts
      'No', // Email Sent (tracking open/click, but wasn't in our send list)
      '', // Email Sent At
      eventType === 'open' ? 'Yes' : 'No', // Email Opened
      eventType === 'open' ? now : '', // First Open At
      eventType === 'open' ? '1' : '0', // Open Count
      eventType === 'click' ? 'Yes' : 'No', // Link Clicked
      eventType === 'click' ? now : '' // First Click At
    ];
    
    // Append row
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${sheetTab}:append?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [newRow]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to append row: ${response.status} ${await response.text()}`);
    }
    
    console.log(`Created new row for: ${email}`);
    
  } catch (error) {
    console.error('Error in createNewInviteeRow:', error);
    throw error;
  }
}

/**
 * Find row index by email address
 * Returns row number (1-based), or -1 if not found
 */
async function findRowByEmail(accessToken, spreadsheetId, email, sheetTab = 'SOI_Staging') {
  // Normalize email for comparison
  const emailLower = (email || '').trim().toLowerCase();
  
  if (!emailLower || !emailLower.includes('@')) {
    return -1; // Invalid email
  }
  
  // Get all emails from column H (Email column)
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${sheetTab}!H:H`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.status}`);
  }
  
  const data = await response.json();
  const emails = data.values || [];
  
  // Find matching email (case-insensitive, trimmed)
  for (let i = 0; i < emails.length; i++) {
    const sheetEmail = (emails[i][0] || '').trim().toLowerCase();
    if (sheetEmail === emailLower) {
      return i + 1; // Return 1-based row number
    }
  }
  
  return -1; // Not found
}

/**
 * Get a single cell value
 */
async function getCell(accessToken, spreadsheetId, range) {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  return data.values?.[0]?.[0] || null;
}

/**
 * Batch update multiple cells with timeout
 */
async function batchUpdateWithTimeout(accessToken, spreadsheetId, updates, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`;
    
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates
      })
    });
    
    if (!response.ok) {
      throw new Error(`Batch update failed: ${response.status} ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Batch update timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper: Base64 URL encode
 */
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Helper: Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper: ArrayBuffer to Base64 URL
 */
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

