/**
 * storage.js
 * Thin wrapper around localStorage for PoC history and settings.
 * Credentials are kept in sessionStorage only (cleared on tab close).
 */

const Storage = (() => {

  const HISTORY_KEY = 'poc_builder_history';
  const SETTINGS_KEY = 'poc_builder_settings';

  /* ── History ─────────────────────────────────────────────── */

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  }

  function saveHistory(records) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  }

  function addRecord(record) {
    const history = getHistory();
    history.unshift({ ...record, id: Date.now(), createdAt: new Date().toISOString() });
    saveHistory(history);
    return history;
  }

  function deleteRecord(id) {
    const filtered = getHistory().filter(r => r.id !== id);
    saveHistory(filtered);
    return filtered;
  }

  /* ── Settings (non-sensitive) ────────────────────────────── */

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch { return {}; }
  }

  function saveSettings(settings) {
    // Never persist raw tokens to localStorage
    const safe = { dc: settings.dc };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
  }

  /* ── Credentials (session only — cleared on tab close) ───── */

  function saveCreds(creds) {
    // Store tokens in sessionStorage only
    sessionStorage.setItem('poc_anthropic', creds.anthropic || '');
    sessionStorage.setItem('poc_zoho_token', creds.zohoToken || '');
    sessionStorage.setItem('poc_zoho_refresh', creds.zohoRefresh || '');
    sessionStorage.setItem('poc_client_id', creds.clientId || '');
    sessionStorage.setItem('poc_client_secret', creds.clientSecret || '');
    sessionStorage.setItem('poc_token_expiry', creds.tokenExpiry || '');
  }

  function getCreds() {
    return {
      anthropic:    sessionStorage.getItem('poc_anthropic') || '',
      zohoToken:    sessionStorage.getItem('poc_zoho_token') || '',
      zohoRefresh:  sessionStorage.getItem('poc_zoho_refresh') || '',
      clientId:     sessionStorage.getItem('poc_client_id') || '',
      clientSecret: sessionStorage.getItem('poc_client_secret') || '',
      tokenExpiry:  sessionStorage.getItem('poc_token_expiry') || '',
      dc:           getSettings().dc || 'in',
    };
  }

  function updateToken(newToken, expiresIn = 3600) {
    sessionStorage.setItem('poc_zoho_token', newToken);
    sessionStorage.setItem('poc_token_expiry', Date.now() + (expiresIn - 60) * 1000);
  }

  function isTokenExpired() {
    const expiry = sessionStorage.getItem('poc_token_expiry');
    if (!expiry) return false; // Unknown — assume valid
    return Date.now() > parseInt(expiry, 10);
  }

  return { getHistory, addRecord, deleteRecord, getSettings, saveSettings, saveCreds, getCreds, updateToken, isTokenExpired };
})();
