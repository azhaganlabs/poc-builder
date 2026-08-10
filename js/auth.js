/**
 * auth.js
 * Handles Zoho OAuth token lifecycle.
 *
 * Zoho access tokens expire after 1 hour.
 * This module auto-refreshes using the refresh token before each deploy run.
 *
 * Flow:
 *   1. User pastes access token + refresh token + client ID + client secret
 *   2. On deploy, Auth.getValidToken() checks expiry
 *   3. If expired (or within 60s buffer), calls refreshAccessToken()
 *   4. New token stored in sessionStorage, returned to caller
 */

const Auth = (() => {

  const DC_ACCOUNTS = {
    'in':     'https://accounts.zoho.in',
    'com':    'https://accounts.zoho.com',
    'eu':     'https://accounts.zoho.eu',
    'com.au': 'https://accounts.zoho.com.au',
    'jp':     'https://accounts.zoho.jp',
    'ca':     'https://accounts.zohocloud.ca',
  };

  /**
   * Returns a valid access token, refreshing if needed.
   * @param {function} onRefresh - optional callback(msg) for logging
   * @returns {Promise<string>} valid access token
   */
  async function getValidToken(onRefresh) {
    const creds = Storage.getCreds();

    if (!creds.zohoToken) {
      throw new Error('No Zoho access token found. Please add it in Settings.');
    }

    // Check if token is expired (or will expire within 60s)
    if (Storage.isTokenExpired()) {
      if (!creds.zohoRefresh || !creds.clientId || !creds.clientSecret) {
        throw new Error(
          'Access token expired and no refresh credentials found. ' +
          'Please provide Refresh Token, Client ID, and Client Secret in Settings to enable auto-refresh.'
        );
      }
      onRefresh?.('Access token expired — refreshing automatically...');
      const newToken = await refreshAccessToken(creds);
      onRefresh?.('Token refreshed. Continuing...');
      return newToken;
    }

    return creds.zohoToken;
  }

  /**
   * Calls Zoho accounts to exchange refresh token for a new access token.
   */
  async function refreshAccessToken(creds) {
    const accountsUrl = DC_ACCOUNTS[creds.dc] || DC_ACCOUNTS['in'];
    const url = `${accountsUrl}/oauth/v2/token`;

    const params = new URLSearchParams({
      refresh_token: creds.zohoRefresh,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      grant_type:    'refresh_token',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Token refresh error: ${data.error} — ${data.error_description || ''}`);
    }

    if (!data.access_token) {
      throw new Error('Token refresh returned no access_token. Check your credentials.');
    }

    Storage.updateToken(data.access_token, data.expires_in || 3600);
    return data.access_token;
  }

  /**
   * Returns the accounts URL for the current DC.
   */
  function accountsUrl() {
    const { dc } = Storage.getCreds();
    return DC_ACCOUNTS[dc] || DC_ACCOUNTS['in'];
  }

  /**
   * Returns the Connect API base URL for the current DC.
   */
  function connectBase() {
    const { dc } = Storage.getCreds();
    return `https://connect.zoho.${dc}/pulse/api`;
  }

  /**
   * Token status for the Settings UI.
   */
  function tokenStatus() {
    const creds = Storage.getCreds();
    if (!creds.zohoToken) return { state: 'missing', label: 'No token set' };
    if (Storage.isTokenExpired()) {
      if (creds.zohoRefresh) return { state: 'warn', label: 'Expired — will auto-refresh on next run' };
      return { state: 'error', label: 'Expired — add Refresh Token to enable auto-refresh' };
    }
    const expiry = parseInt(sessionStorage.getItem('poc_token_expiry') || '0', 10);
    if (expiry) {
      const minsLeft = Math.round((expiry - Date.now()) / 60000);
      return { state: 'ok', label: `Valid · expires in ~${minsLeft} min` };
    }
    return { state: 'ok', label: 'Token set (expiry unknown)' };
  }

  return { getValidToken, connectBase, accountsUrl, tokenStatus };
})();
