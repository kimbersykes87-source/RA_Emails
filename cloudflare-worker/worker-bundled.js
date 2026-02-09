/**
 * Rubber Armstrong Email Tracking Worker (Bundled)
 * Tracks email opens (pixel) and clicks (link redirect)
 * Updates Google Sheets directly via Sheets API
 */

// ============================================================================
// CONFIG
// ============================================================================

// Generate pixel GIF lazily (atob not available at module init)
function getTrackingPixelGif() {
  return Uint8Array.from(
    atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
    c => c.charCodeAt(0)
  );
}

const REDIRECT_URLS = {
  soi_form: 'https://soi.rubberarmstrong.com',
  reminder_soi_form: 'https://soi.rubberarmstrong.com',
  unsubscribe: 'mailto:rubberarmstrongcamp@gmail.com?subject=Unsubscribe',
  main_site: 'https://rubberarmstrong.com',
  default: 'https://rubberarmstrong.com'
};

const CAMPAIGN_COLUMNS = {
  invitation: {
    sheetTab: 'Email_Campaign_2026',
    opened: 'AC', firstOpenAt: 'AD', openCount: 'AE',
    clicked: 'AF', firstClickAt: 'AG',
  },
  reminder: {
    sheetTab: 'Email_Campaign_2026',
    opened: 'AL', firstOpenAt: 'AM', openCount: 'AN',
    clicked: 'AO', firstClickAt: 'AP',
  },
  confirmation: {
    sheetTab: 'SOI_Approved',
    opened: 'AC', firstOpenAt: 'AD', openCount: 'AE',
    clicked: null, firstClickAt: null,
  },
};

// ============================================================================
// SHEETS API HELPERS
// ============================================================================

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function signJWT(input, privateKey) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length - 1
  ).trim();
  
  const binaryDer = base64ToArrayBuffer(pemContents);
  
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
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

async function getAccessToken(serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
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
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signJWT(signatureInput, serviceAccount.private_key);
  
  const jwt = `${signatureInput}.${signature}`;
  
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

async function findEmailRow(env, email, sheetTab = 'Email_Campaign_2026') {
  const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const sheetId = env.SHEET_ID;
  const range = `${sheetTab}!H:H`;
  const url = `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to search for email: ${response.status}`);
  }

  const data = await response.json();
  const values = data.values || [];

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] && values[i][0].toLowerCase() === email.toLowerCase()) {
      return i + 1;
    }
  }

  return null;
}

async function updateSheetTracking(env, email, eventType, metadata = {}) {
  const campaign = metadata.campaign || 'invitation';
  const cols = CAMPAIGN_COLUMNS[campaign];
  if (!cols) {
    console.error(`Unknown campaign: ${campaign}`);
    return { success: false };
  }

  const sheetTab = cols.sheetTab;
  const rowNumber = await findEmailRow(env, email, sheetTab);

  if (!rowNumber) {
    if (campaign === 'invitation') {
      console.log(`Email not found, creating new row: ${email}`);
      return await createNewInviteeRow(env, email, eventType, metadata);
    }
    return { success: false };
  }

  const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const sheetId = env.SHEET_ID;
  const timestamp = new Date().toISOString();
  let updates = {};

  if (eventType === 'open') {
    const openCountCell = `${sheetTab}!${cols.openCount}${rowNumber}`;
    const countResponse = await fetch(
      `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(openCountCell)}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const countData = await countResponse.json();
    const currentCount = countData.values?.[0]?.[0] || 0;
    const newCount = parseInt(currentCount) + 1;

    updates[`${sheetTab}!${cols.opened}${rowNumber}`] = [['Yes']];
    updates[`${sheetTab}!${cols.openCount}${rowNumber}`] = [[newCount]];
    if (currentCount == 0) {
      updates[`${sheetTab}!${cols.firstOpenAt}${rowNumber}`] = [[timestamp]];
    }
  } else if (eventType === 'click' && cols.clicked && cols.firstClickAt) {
    updates[`${sheetTab}!${cols.clicked}${rowNumber}`] = [['Yes']];
    updates[`${sheetTab}!${cols.firstClickAt}${rowNumber}`] = [[timestamp]];
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const batchUpdateUrl = `${SHEETS_API_BASE}/${sheetId}/values:batchUpdate`;
  const batchData = {
    valueInputOption: 'RAW',
    data: Object.entries(updates).map(([range, values]) => ({ range, values }))
  };

  const updateResponse = await fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(batchData)
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update sheet: ${updateResponse.status}`);
  }

  console.log(`Updated ${eventType} for ${email} (${campaign})`);
  return { success: true, rowNumber, eventType };
}

async function createNewInviteeRow(env, email, eventType, metadata = {}) {
  const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const sheetId = env.SHEET_ID;
  const timestamp = new Date().toISOString();
  
  const newRow = Array(33).fill('');
  newRow[7] = email; // Column H (0-indexed = 7)
  newRow[26] = 'No';  // Email Sent
  newRow[27] = '';    // Email Sent At
  newRow[28] = eventType === 'open' ? 'Yes' : 'No';  // Email Opened
  newRow[29] = eventType === 'open' ? timestamp : ''; // First Open At
  newRow[30] = eventType === 'open' ? '1' : '0';     // Open Count
  newRow[31] = eventType === 'click' ? 'Yes' : 'No'; // Link Clicked
  newRow[32] = eventType === 'click' ? timestamp : ''; // First Click At
  
  const appendUrl = `${SHEETS_API_BASE}/${sheetId}/values/Email_Campaign_2026!A:AG:append?valueInputOption=RAW`;
  
  const response = await fetch(appendUrl, {
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
    throw new Error(`Failed to create new row: ${response.status}`);
  }
  
  console.log(`Created new row for ${email} - ${eventType}`);
  return { success: true, created: true, eventType };
}

// ============================================================================
// BOT DETECTION
// ============================================================================

function isBot(request) {
  const userAgent = (request.headers?.get('User-Agent') || '').toLowerCase();
  const referer = (request.headers?.get('Referer') || '').toLowerCase();
  
  // Bot patterns to ignore (prevents false tracking)
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'googlebot', 'bingbot', 'slackbot', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot',
    'headless', 'phantom', 'selenium', 'puppeteer',
    'curl', 'wget', 'python-requests', 'go-http-client',
    'google-sheets', 'google-docs', 'preview'
  ];
  
  // Check if User-Agent matches bot patterns
  for (const pattern of botPatterns) {
    if (userAgent.includes(pattern)) {
      console.log(`Bot detected (User-Agent): ${userAgent}`);
      return true;
    }
  }
  
  // Check if request is from Google Sheets/Docs (link preview)
  if (referer.includes('docs.google.com') || 
      referer.includes('sheets.google.com') ||
      referer.includes('drive.google.com')) {
    console.log(`Bot detected (Referer): ${referer}`);
    return true;
  }
  
  // Empty or missing User-Agent (suspicious)
  if (!userAgent || userAgent.length < 10) {
    console.log(`Bot detected (Empty/Short User-Agent): ${userAgent}`);
    return true;
  }
  
  return false;
}

// ============================================================================
// HANDLERS
// ============================================================================

function decodeEmailHash(hash) {
  try {
    const cleanHash = hash.replace('.gif', '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - cleanHash.length % 4) % 4);
    return atob(cleanHash + padding);
  } catch (error) {
    console.error('Failed to decode email hash:', error);
    return null;
  }
}

function parsePixelCampaign(pathname) {
  if (pathname.includes('/reminder.gif')) return 'reminder';
  if (pathname.includes('/confirmation.gif')) return 'confirmation';
  return 'invitation';
}

async function handlePixel(url, request, env, corsHeaders) {
  const pathParts = url.pathname.split('/');
  const campaign = parsePixelCampaign(url.pathname);
  let emailHash = pathParts[2];
  if (emailHash && emailHash.endsWith('.gif')) emailHash = emailHash.replace('.gif', '');

  if (!emailHash) {
    return new Response('Invalid tracking pixel URL', { status: 400, headers: corsHeaders });
  }

  const email = decodeEmailHash(emailHash);

  if (!email) {
    console.error('Failed to decode email from hash:', emailHash);
    return new Response(getTrackingPixelGif(), {
      headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
    });
  }

  if (isBot(request)) {
    console.log(`Bot ignored for pixel: ${email}`);
    return new Response(getTrackingPixelGif(), {
      headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
    });
  }

  try {
    await updateSheetTracking(env, email, 'open', { campaign, userAgent: request.headers?.get('User-Agent') });
  } catch (error) {
    console.error('Error updating sheet for pixel:', error);
  }

  return new Response(getTrackingPixelGif(), {
    headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
  });
}

function parseClickCampaign(linkId) {
  if (linkId === 'reminder_soi_form') return 'reminder';
  return 'invitation';
}

async function handleClick(url, request, env, corsHeaders) {
  const pathParts = url.pathname.split('/');
  const emailHash = pathParts[2];
  const linkId = pathParts[3] || 'default';

  if (!emailHash) {
    return new Response('Invalid click tracking URL', { status: 400, headers: corsHeaders });
  }

  const email = decodeEmailHash(emailHash);
  const redirectUrl = REDIRECT_URLS[linkId] || REDIRECT_URLS.default;

  if (email && !isBot(request)) {
    try {
      const campaign = parseClickCampaign(linkId);
      await updateSheetTracking(env, email, 'click', { campaign, linkId });
    } catch (error) {
      console.error('Error updating sheet for click:', error);
    }
  } else if (email) {
    console.log(`Bot ignored for click: ${email}`);
  }

  return Response.redirect(redirectUrl, 302);
}

// ============================================================================
// MAIN WORKER
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      if (url.pathname.startsWith('/p/')) {
        return await handlePixel(url, request, env, corsHeaders);
      }
      
      if (url.pathname.startsWith('/c/')) {
        return await handleClick(url, request, env, corsHeaders);
      }
      
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Rubber Armstrong Email Tracking',
        endpoints: {
          pixel: '/p/{hash}.gif | /p/{hash}/reminder.gif | /p/{hash}/confirmation.gif',
          click: '/c/{hash}/soi_form | /c/{hash}/reminder_soi_form'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

