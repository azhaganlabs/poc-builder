const Auth = (() => {
  const DC_ACCOUNTS = {
    in: 'https://accounts.zoho.in', com: 'https://accounts.zoho.com',
    eu: 'https://accounts.zoho.eu', 'com.au': 'https://accounts.zoho.com.au',
    jp: 'https://accounts.zoho.jp',
  };

  async function getValidToken(onLog) {
    const c = Storage.getCreds();
    if (!c.zohoToken) throw new Error('No Zoho access token. Add it in Settings.');
    if (Storage.isTokenExpired()) {
      if (!c.zohoRefresh || !c.clientId || !c.clientSecret)
        throw new Error('Token expired. Add Refresh Token + Client credentials in Settings for auto-refresh.');
      onLog?.('🔄 Token expired — auto-refreshing...', 'log-info');
      const t = await refresh(c);
      onLog?.('✓ Token refreshed.', 'log-ok');
      return t;
    }
    return c.zohoToken;
  }

  async function refresh(c) {
    const base = DC_ACCOUNTS[c.dc] || DC_ACCOUNTS.in;
    const body = new URLSearchParams({
      refresh_token: c.zohoRefresh, client_id: c.clientId,
      client_secret: c.clientSecret, grant_type: 'refresh_token',
    });
    const r = await fetch(`${base}/oauth/v2/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!r.ok) throw new Error(`Token refresh failed: HTTP ${r.status}`);
    const d = await r.json();
    if (d.error) throw new Error(`Refresh error: ${d.error}`);
    Storage.updateToken(d.access_token, d.expires_in || 3600);
    return d.access_token;
  }

  function connectBase() {
    const { dc } = Storage.getCreds();
    return `https://connect.zoho.${dc || 'in'}/pulse/api`;
  }

  function tokenStatus() {
    const c = Storage.getCreds();
    if (!c.zohoToken) return { state: 'warn', label: 'No token set' };
    if (Storage.isTokenExpired()) {
      return c.zohoRefresh
        ? { state: 'warn', label: 'Expired — will auto-refresh on next run' }
        : { state: 'warn', label: 'Expired — add Refresh Token for auto-refresh' };
    }
    const expiry = parseInt(sessionStorage.getItem('poc_tokenExpiry') || '0', 10);
    if (expiry) {
      const m = Math.round((expiry - Date.now()) / 60000);
      return { state: 'ok', label: `Valid · ~${m} min remaining` };
    }
    return { state: 'ok', label: 'Token set' };
  }

  return { getValidToken, connectBase, tokenStatus };
})();
