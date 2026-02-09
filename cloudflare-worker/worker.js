/**
 * Rubber Armstrong Email Tracking Worker
 * Tracks email opens (pixel) and clicks (link redirect)
 * Updates Google Sheets directly via Sheets API
 */

import { updateSheetTracking, createNewInviteeRow } from './sheets-api.js';
import { TRACKING_PIXEL_GIF, REDIRECT_URLS, CAMPAIGN_COLUMNS } from './config.js';

/**
 * Detect if request is from a bot/crawler
 */
function isBot(request) {
  const ua = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  
  // Block known bots
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /facebookexternalhit/i,
    /linkedinbot/i,
    /twitterbot/i,
    /headless/i,
    /selenium/i,
    /phantom/i,
    /puppeteer/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /go-http-client/i,
    /^$/ // Empty user agent
  ];
  
  if (botPatterns.some(pattern => pattern.test(ua))) {
    return true;
  }
  
  // Block if referer is Google Sheets/Docs/Drive (link previews)
  if (referer.includes('sheets.google.com') || 
      referer.includes('docs.google.com') || 
      referer.includes('drive.google.com')) {
    return true;
  }
  
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Tracking Pixel Handler
      if (url.pathname.startsWith('/p/')) {
        return await handlePixel(url, env, corsHeaders, request);
      }
      
      // Link Click Handler
      if (url.pathname.startsWith('/c/')) {
        return await handleClick(url, env, corsHeaders, request);
      }
      
      // Health check / default
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
      
      // Always return something (don't break emails)
      if (url.pathname.startsWith('/p/')) {
        // Return pixel even on error
        return new Response(TRACKING_PIXEL_GIF, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
      
      return new Response('Error processing request', {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};

/**
 * Parse campaign from pixel path
 * /p/{hash}.gif → invitation
 * /p/{hash}/reminder.gif → reminder
 * /p/{hash}/confirmation.gif → confirmation
 */
function parsePixelCampaign(pathname) {
  if (pathname.includes('/reminder.gif')) return 'reminder';
  if (pathname.includes('/confirmation.gif')) return 'confirmation';
  return 'invitation';
}

/**
 * Handle tracking pixel requests
 * Format: /p/{email-hash}.gif | /p/{hash}/reminder.gif | /p/{hash}/confirmation.gif
 */
async function handlePixel(url, env, corsHeaders, request) {
  const pathParts = url.pathname.split('/');
  const campaign = parsePixelCampaign(url.pathname);

  // Extract hash: pathParts[2] for /p/hash.gif or /p/hash/reminder.gif
  let emailHash = pathParts[2];
  if (emailHash && emailHash.endsWith('.gif')) {
    emailHash = emailHash.replace('.gif', '');
  } else if (pathParts[3] && pathParts[3].endsWith('.gif')) {
    emailHash = pathParts[2]; // hash is pathParts[2], pathParts[3] is reminder.gif/confirmation.gif
  }

  if (!emailHash) {
    console.error('No email hash in pixel request');
    return returnPixel(corsHeaders);
  }

  // Validate email hash format
  if (!/^[A-Za-z0-9_-]+$/.test(emailHash)) {
    console.error('Invalid email hash format:', emailHash);
    return returnPixel(corsHeaders);
  }

  try {
    // Decode email from base64 hash
    const email = decodeEmail(emailHash);

    if (!email) {
      console.error('Could not decode email hash:', emailHash);
      return returnPixel(corsHeaders);
    }

    // Check if request is from a bot (but still return pixel)
    if (isBot(request)) {
      console.log(`Bot ignored for pixel: ${email}`);
      return returnPixel(corsHeaders); // Return pixel but don't track
    }

    // Log the open (don't await - return pixel immediately)
    const trackingPromise = updateSheetTracking(env, email, 'open', {
      campaign,
      userAgent: request.headers.get('user-agent') || '',
      referer: request.headers.get('referer') || '',
      timestamp: new Date().toISOString()
    });

    // Don't await - return pixel immediately for speed
    trackingPromise.catch(err => {
      console.error('Error tracking pixel:', err);
    });

  } catch (error) {
    console.error('Pixel handler error:', error);
  }

  // Always return the tracking pixel
  return returnPixel(corsHeaders);
}

/**
 * Derive campaign from link ID for click tracking
 * reminder_soi_form → reminder, soi_form → invitation
 */
function parseClickCampaign(linkId) {
  if (linkId === 'reminder_soi_form') return 'reminder';
  return 'invitation';
}

/**
 * Handle link click requests
 * Format: /c/{email-hash}/{link-id}
 * linkId: soi_form (invitation) | reminder_soi_form (reminder)
 */
async function handleClick(url, env, corsHeaders, request) {
  const pathParts = url.pathname.split('/');
  const emailHash = pathParts[2];
  const linkId = pathParts[3];

  if (!emailHash || !linkId) {
    return new Response('Invalid click tracking URL', {
      status: 400,
      headers: corsHeaders
    });
  }

  // Validate email hash format
  if (!/^[A-Za-z0-9_-]+$/.test(emailHash)) {
    console.error('Invalid email hash format:', emailHash);
    return redirect(linkId, corsHeaders);
  }

  try {
    const email = decodeEmail(emailHash);

    if (!email) {
      console.error('Could not decode email hash:', emailHash);
      return redirect(linkId, corsHeaders);
    }

    if (isBot(request)) {
      console.log(`Bot ignored for click: ${email}`);
      return redirect(linkId, corsHeaders);
    }

    if (linkId === 'unsubscribe') {
      console.log(`Unsubscribe request from: ${email}`);
    }

    const campaign = parseClickCampaign(linkId);
    const trackingPromise = updateSheetTracking(env, email, 'click', {
      campaign,
      linkId: linkId === 'reminder_soi_form' ? 'soi_form' : linkId,
      userAgent: request.headers.get('user-agent') || '',
      referer: request.headers.get('referer') || '',
      timestamp: new Date().toISOString()
    });

    trackingPromise.catch(err => {
      console.error('Error tracking click:', err);
    });

  } catch (error) {
    console.error('Click handler error:', error);
  }

  return redirect(linkId, corsHeaders);
}

/**
 * Return tracking pixel GIF
 */
function returnPixel(corsHeaders) {
  return new Response(TRACKING_PIXEL_GIF, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

/**
 * Redirect to the target URL based on link ID
 */
function redirect(linkId, corsHeaders) {
  const targetUrl = REDIRECT_URLS[linkId] || REDIRECT_URLS.default;
  
  return Response.redirect(targetUrl, 302);
}

/**
 * Decode email from base64 URL-safe encoding
 * Validates format before decoding
 */
function decodeEmail(encoded) {
  if (!encoded || typeof encoded !== 'string') {
    return null;
  }
  
  // Validate base64url format (only alphanumeric, -, _)
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    console.error('Invalid email hash format:', encoded);
    return null;
  }
  
  try {
    // Convert URL-safe base64 back to standard base64
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    // Decode from base64
    const decoded = atob(padded);
    
    // Basic validation that result looks like an email
    if (!decoded.includes('@') || !decoded.includes('.')) {
      console.error('Decoded value does not look like email:', decoded);
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error decoding email:', error);
    return null;
  }
}

/**
 * Encode email to base64 URL-safe format
 * (For reference / testing - actual encoding happens when sending emails)
 */
export function encodeEmail(email) {
  const encoded = btoa(email);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

