/**
 * app.js
 * Main application controller.
 * Coordinates views, state, and module calls.
 */

const App = (() => {

  /* ── State ───────────────────────────────────────────────── */
  let currentStep  = 0;
  let checkStates  = [false, false, false, false, false];
  let generatedContent = null;
  let prospect     = {};
  let timerHandle  = null;

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    showView('new', document.querySelector('.nav-item[data-view="new"]'));
    refreshHistoryBadge();
    // Restore DC selector from saved settings
    const saved = Storage.getSettings();
    if (saved.dc) {
      const el = document.getElementById('s-dc');
      if (el) el.value = saved.dc;
    }
    // Update topbar DC label
    updateDcLabel();
  }

  function updateDcLabel() {
    const { dc } = Storage.getCreds();
    const label = { in:'India DC', com:'US DC', eu:'Europe DC', 'com.au':'AU DC', jp:'Japan DC', ca:'Canada DC' };
    const el = document.getElementById('topbar-dc');
    if (el) el.textContent = '● ' + (label[dc] || 'Connect');
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function showView(id, navEl) {
    const area = document.getElementById('content-area');
    if (id === 'new') {
      area.innerHTML = Views.newPoc();
      renderStep(0);
    } else if (id === 'history') {
      area.innerHTML = Views.history(Storage.getHistory());
    } else if (id === 'settings') {
      area.innerHTML = Views.settings();
      // Pre-fill saved non-sensitive values
      const creds = Storage.getCreds();
      if (creds.dc) { const el = document.getElementById('s-dc'); if (el) el.value = creds.dc; }
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    else {
      const target = document.querySelector(`.nav-item[data-view="${id}"]`);
      if (target) target.classList.add('active');
    }
  }

  /* ── Step management ─────────────────────────────────────── */
  function goStep(n) {
    if (n === 1) {
      const company = val('f-company');
      if (!company) { alert('Please enter a company name.'); return; }
      prospect.company  = company;
      prospect.industry = val('f-industry');
      prospect.location = val('f-location');
      prospect.size     = val('f-size');
      prospect.usecase  = val('f-usecase');
      prospect.depts    = val('f-depts');
      prospect.email    = val('f-email');
    }
    if (n === 2) {
      prospect.scopeId = val('f-scopeid');
    }
    renderStep(n);
    currentStep = n;
  }

  function renderStep(n) {
    const container = document.getElementById('steps-container');
    if (!container) return;
    updateProgress(n);

    if (n === 0) { container.innerHTML = Views.step0(); return; }
    if (n === 1) { container.innerHTML = Views.step1(prospect.company || ''); restoreChecks(); return; }
    if (n === 2) {
      if (generatedContent) {
        container.innerHTML = Views.step2_done(generatedContent);
      } else {
        container.innerHTML = Views.step2_idle(prospect.company || '');
      }
      return;
    }
    if (n === 3) {
      container.innerHTML = Views.step3_idle(prospect.scopeId || '', prospect.company || '');
    }
  }

  function updateProgress(n) {
    for (let i = 0; i < 4; i++) {
      const dot   = document.getElementById('pdot-' + i);
      const label = document.getElementById('plabel-' + i);
      if (!dot) continue;
      dot.className   = 'prog-dot';
      label.className = 'prog-label';
      if (i < n)      { dot.classList.add('done');   dot.textContent = '✓'; label.classList.add('done'); }
      else if (i === n){ dot.classList.add('active'); dot.textContent = i + 1; label.classList.add('active'); }
      else             { dot.textContent = i + 1; }
    }
  }

  /* ── Checklist ───────────────────────────────────────────── */
  function toggleCheck(i) {
    checkStates[i] = !checkStates[i];
    const box = document.getElementById('chk-' + i);
    if (!box) return;
    if (checkStates[i]) { box.classList.add('checked'); box.textContent = '✓'; }
    else                { box.classList.remove('checked'); box.textContent = ''; }
  }

  function restoreChecks() {
    checkStates.forEach((checked, i) => {
      const box = document.getElementById('chk-' + i);
      if (!box) return;
      if (checked) { box.classList.add('checked'); box.textContent = '✓'; }
    });
  }

  /* ── Generate ────────────────────────────────────────────── */
  async function startGenerate() {
    const container = document.getElementById('steps-container');
    container.innerHTML = Views.step2_loading();
    updateProgress(2);
    startTimer('gen-elapsed');

    const logEl = document.getElementById('gen-log');
    const log = (msg, cls) => appendLog(logEl, msg, cls);

    try {
      const content = await Generate.run(prospect, log);
      generatedContent = content;
      clearInterval(timerHandle);
      log(`✓ ${content.groups.length} groups`, 'log-ok');
      log(`✓ ${content.posts.length} posts`, 'log-ok');
      log(`✓ Manual: "${content.manual.name}" (${content.manual.articles.length} articles)`, 'log-ok');
      log(`✓ ${content.taskBoard.tasks.length} tasks`, 'log-ok');
      log(`✓ ${content.events.length} events`, 'log-ok');
      log('Generation complete.', 'log-ok');
      await sleep(500);
      container.innerHTML = Views.step2_done(content);
    } catch (e) {
      clearInterval(timerHandle);
      log(`Error: ${e.message}`, 'log-err');
      log('Check your Anthropic API key in Settings.', 'log-dim');
    }
  }

  function regenContent() {
    generatedContent = null;
    renderStep(2);
  }

  function showGenTab(id, el) {
    ['groups','posts','manual','tasks','events'].forEach(t => {
      const pane = document.getElementById('gentab-' + t);
      if (pane) pane.style.display = t === id ? '' : 'none';
    });
    document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
  }

  /* ── Deploy ──────────────────────────────────────────────── */
  async function startDeploy() {
    if (!generatedContent) { alert('Generate content first.'); return; }
    const scopeId = prospect.scopeId;
    if (!scopeId) { alert('Scope ID is missing. Go back to step 2.'); return; }

    const container = document.getElementById('steps-container');
    container.innerHTML = Views.step3_running();
    updateProgress(3);
    startTimer('deploy-elapsed');

    const logEl = document.getElementById('deploy-log');
    const log = (msg, cls) => appendLog(logEl, msg, cls);

    try {
      const summary = await Deploy.run(generatedContent, scopeId, prospect.email, log);
      clearInterval(timerHandle);
      log('─────────────────────────────────', 'log-dim');
      log(`PoC for ${prospect.company} is live.`, 'log-ok');
      await sleep(600);

      // Save to history
      Storage.addRecord({
        company:  prospect.company,
        industry: prospect.industry,
        scopeId:  scopeId,
        email:    prospect.email,
      });
      refreshHistoryBadge();

      const { dc } = Storage.getCreds();
      container.innerHTML = Views.step3_done(prospect, summary, dc || 'in');
      updateProgress(4);

    } catch (e) {
      clearInterval(timerHandle);
      log(`Error: ${e.message}`, 'log-err');
      if (e.message.includes('expired') || e.message.includes('token')) {
        log('→ Go to Settings to refresh your OAuth token.', 'log-dim');
      }
    }
  }

  /* ── Settings ────────────────────────────────────────────── */
  function saveSettings() {
    const creds = {
      anthropic:    document.getElementById('s-anthropic')?.value?.trim() || '',
      zohoToken:    document.getElementById('s-token')?.value?.trim()     || '',
      zohoRefresh:  document.getElementById('s-refresh')?.value?.trim()   || '',
      clientId:     document.getElementById('s-clientid')?.value?.trim()  || '',
      clientSecret: document.getElementById('s-clientsecret')?.value?.trim() || '',
      dc:           document.getElementById('s-dc')?.value || 'in',
      tokenExpiry:  creds_expiry(),
    };
    Storage.saveCreds(creds);
    Storage.saveSettings({ dc: creds.dc });
    updateDcLabel();

    const saved = document.getElementById('settings-saved');
    if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2000); }
  }

  function creds_expiry() {
    // If user just pasted a fresh token, set expiry to now + 55 min
    const existing = sessionStorage.getItem('poc_token_expiry');
    const token = document.getElementById('s-token')?.value?.trim();
    const storedToken = sessionStorage.getItem('poc_zoho_token');
    if (token && token !== storedToken) {
      return Date.now() + 55 * 60 * 1000; // 55 min from now
    }
    return existing || '';
  }

  /* ── History ─────────────────────────────────────────────── */
  function deleteRecord(id) {
    if (!confirm('Remove this PoC from history?')) return;
    Storage.deleteRecord(id);
    showView('history', null);
    refreshHistoryBadge();
  }

  function refreshHistoryBadge() {
    const count = Storage.getHistory().length;
    const badge = document.getElementById('history-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.className = count > 0 ? 'nav-badge' : 'nav-badge zero';
  }

  /* ── New PoC reset ───────────────────────────────────────── */
  function startNew() {
    generatedContent = null;
    prospect = {};
    checkStates = [false, false, false, false, false];
    currentStep = 0;
    showView('new', document.querySelector('.nav-item[data-view="new"]'));
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function val(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  function appendLog(container, msg, cls = '') {
    if (!container) return;
    const now = new Date().toTimeString().slice(0, 8);
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">${now}</span><span class="${cls}">${msg}</span>`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  function startTimer(elId) {
    clearInterval(timerHandle);
    let s = 0;
    timerHandle = setInterval(() => {
      const el = document.getElementById(elId);
      if (el) el.textContent = (++s) + 's';
    }, 1000);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── Expose public API ───────────────────────────────────── */
  return {
    init, showView, goStep,
    toggleCheck,
    startGenerate, regenContent, showGenTab,
    startDeploy,
    saveSettings,
    deleteRecord,
    startNew,
  };

})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
