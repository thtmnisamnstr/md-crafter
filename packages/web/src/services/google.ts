/**
 * Google Drive integration service
 * Handles OAuth, file import/export with Google Drive
 */

import { logger } from '@md-crafter/shared';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// Google API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let gapiLoaded = false;
let gisLoaded = false;

/**
 * Initialize Google API client
 */
export async function initGoogleApi(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    logger.warn('Google Client ID not configured');
    return;
  }

  // Load GAPI (Google API client)
  if (!gapiLoaded) {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise<void>((resolve) => {
      gapi.load('client:picker', resolve);
    });
    
    await gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiLoaded = true;
  }

  // Load GIS (Google Identity Services)
  if (!gisLoaded) {
    await loadScript('https://accounts.google.com/gsi/client');
    gisLoaded = true;
  }
}

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured');
  }

  await initGoogleApi();

  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Check if we're signed in to Google
 */
export function isGoogleSignedIn(): boolean {
  return accessToken !== null;
}

/**
 * Sign out from Google
 */
export function signOutFromGoogle(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      accessToken = null;
    });
  }
}

/**
 * Open Google Picker to select a file
 */
export async function openGooglePicker(): Promise<google.picker.DocumentObject | null> {
  if (!accessToken) {
    await signInWithGoogle();
  }

  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  return new Promise((resolve) => {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes('application/vnd.google-apps.document');

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken!)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(data.docs[0]);
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}

/**
 * Export a Google Doc to markdown
 */
export async function exportGoogleDocAsMarkdown(fileId: string): Promise<string> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // First, get the document as HTML
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export Google Doc');
  }

  const html = await response.text();
  
  // Convert HTML to markdown using our clipboard converter
  const { convertHtmlToMarkdown } = await import('./clipboard');
  return convertHtmlToMarkdown(html);
}

/**
 * Get file metadata from Google Drive
 */
export async function getGoogleFileMetadata(fileId: string): Promise<{ name: string; mimeType: string }> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get file metadata');
  }

  return response.json();
}

/**
 * Create a new Google Doc from markdown content
 */
export async function createGoogleDocFromMarkdown(
  title: string,
  markdown: string
): Promise<{ id: string; webViewLink: string }> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Convert markdown to HTML
  const { marked } = await import('marked');
  const html = await marked.parse(markdown);

  // Create the document
  const metadata = {
    name: title.replace(/\.(md|mdx|markdown)$/i, ''),
    mimeType: 'application/vnd.google-apps.document',
  };

  // Create document with metadata
  const createResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/related; boundary=boundary',
      },
      body: createMultipartBody(metadata, html),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
      logger.error('Google Drive error', error);
    throw new Error('Failed to create Google Doc');
  }

  return createResponse.json();
}

/**
 * Create multipart body for Google Drive upload
 */
function createMultipartBody(
  metadata: { name: string; mimeType: string },
  content: string
): string {
  const boundary = 'boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  return (
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html\r\n\r\n' +
    content +
    closeDelimiter
  );
}

/**
 * Check if Google API is configured
 */
export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}

