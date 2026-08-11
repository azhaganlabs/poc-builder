const Storage = (() => {
  const HISTORY_KEY  = 'poc_history_v2';
  const SETTINGS_KEY = 'poc_settings_v2';

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }
  function saveHistory(r) { localStorage.setItem(HISTORY_KEY, JSON.stringify(r)); }
  function addRecord(rec) {
    const h = getHistory();
    h.unshift({ ...rec, id: Date.now(), createdAt: new Date().toISOString(), status: 'active' });
    saveHistory(h);
    return h;
  }
  function updateRecord(id, patch) {
    const h = getHistory().map(r => r.id === id ? { ...r, ...patch } : r);
    saveHistory(h); return h;
  }
  function deleteRecord(id) {
    const h = getHistory().filter(r => r.id !== id);
    saveHistory(h); return h;
  }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ dc: s.dc }));
  }

  // Credentials — sessionStorage only
  function saveCreds(c) {
    ['anthropic','zohoToken','zohoRefresh','clientId','clientSecret','tokenExpiry','dc']
      .forEach(k => sessionStorage.setItem('poc_' + k, c[k] || ''));
  }
  function getCreds() {
    return {
      anthropic:    sessionStorage.getItem('poc_anthropic')    || '',
      zohoToken:    sessionStorage.getItem('poc_zohoToken')    || '',
      zohoRefresh:  sessionStorage.getItem('poc_zohoRefresh')  || '',
      clientId:     sessionStorage.getItem('poc_clientId')     || '',
      clientSecret: sessionStorage.getItem('poc_clientSecret') || '',
      tokenExpiry:  sessionStorage.getItem('poc_tokenExpiry')  || '',
      dc:           sessionStorage.getItem('poc_dc') || getSettings().dc || 'in',
    };
  }
  function updateToken(token, expiresIn = 3600) {
    sessionStorage.setItem('poc_zohoToken',   token);
    sessionStorage.setItem('poc_tokenExpiry', Date.now() + (expiresIn - 60) * 1000);
  }
  function isTokenExpired() {
    const e = sessionStorage.getItem('poc_tokenExpiry');
    return e ? Date.now() > parseInt(e, 10) : false;
  }

  // Deploy manifest — resume partial runs
  function saveManifest(scopeId, manifest) {
    sessionStorage.setItem('poc_manifest_' + scopeId, JSON.stringify(manifest));
  }
  function getManifest(scopeId) {
    try { return JSON.parse(sessionStorage.getItem('poc_manifest_' + scopeId) || 'null'); }
    catch { return null; }
  }
  function clearManifest(scopeId) {
    sessionStorage.removeItem('poc_manifest_' + scopeId);
  }

  return { getHistory, addRecord, updateRecord, deleteRecord, getSettings, saveSettings,
           saveCreds, getCreds, updateToken, isTokenExpired, saveManifest, getManifest, clearManifest };
})();
