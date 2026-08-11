const App = (() => {
  let step = 0;
  let checks = [false,false,false,false,false];
  let content = null;
  let prospect = {};
  let tone = 'formal';
  let timerHandle = null;
  let etaTotal = 0;
  let deployStart = 0;

  /* ── Boot ── */
  function init() {
    showView('new', document.querySelector('.nav-item[data-view="new"]'));
    refreshBadge();
    updateDcLabel();
  }

  function updateDcLabel() {
    const { dc } = Storage.getCreds();
    const labels = { in:'India DC', com:'US DC', eu:'Europe DC', 'com.au':'AU DC', jp:'Japan DC' };
    const el = document.getElementById('dc-label');
    if (el) el.textContent = labels[dc] || 'India DC';
  }

  /* ── View routing ── */
  function showView(id, navEl) {
    const area = document.getElementById('content-area');
    const html = id === 'new'      ? Views.step0()
               : id === 'history'  ? Views.history(Storage.getHistory())
               : id === 'settings' ? Views.settings()
               : '';
    setContent(html);
    if (id === 'new') { step = 0; updateTopbarProgress(0); }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = navEl || document.querySelector(`.nav-item[data-view="${id}"]`);
    if (target) target.classList.add('active');

    // Pre-fill settings creds (non-sensitive)
    if (id === 'settings') {
      const c = Storage.getCreds();
      const dc = document.getElementById('s-dc');
      if (dc && c.dc) dc.value = c.dc;
    }
  }

  function setContent(html) {
    const area = document.getElementById('content-area');
    area.style.opacity = '0';
    area.style.transform = 'translateY(8px)';
    setTimeout(() => {
      area.innerHTML = html;
      area.style.transition = 'opacity .3s ease, transform .3s ease';
      area.style.opacity = '1';
      area.style.transform = 'translateY(0)';
    }, 80);
  }

  /* ── Steps ── */
  function goStep(n) {
    if (n === 1) {
      const company = val('f-company');
      if (!company) { shake('f-company'); return; }
      prospect = {
        company, industry: val('f-industry'), location: val('f-location'),
        size: val('f-size'), usecase: val('f-usecase'), depts: val('f-depts'), tone,
      };
    }
    if (n === 2) { prospect.scopeId = val('f-scopeid'); }
    if (n === 3) {
      if (!content) { goStep(2); return; }
      const eta = Deploy.estimateSeconds(content);
      etaTotal = eta;
      setContent(Views.step3Idle(prospect.scopeId, prospect.company, eta));
      step = 3; updateTopbarProgress(3); return;
    }
    step = n; updateTopbarProgress(n);
    const html = n === 0 ? Views.step0()
               : n === 1 ? Views.step1(prospect.company)
               : n === 2 ? (content ? Views.step2Done(content) : Views.step2Idle(prospect.company, prospect.tone))
               : '';
    setContent(html);
    if (n === 1) setTimeout(restoreChecks, 120);
  }

  /* ── Topbar progress ── */
  function updateTopbarProgress(n) {
    const bar = document.getElementById('topbar-progress');
    if (!bar) return;
    const labels = ['Prospect','Network','Generate','Deploy'];
    bar.style.display = 'flex';
    bar.innerHTML = labels.map((l,i) => {
      const cls = i < n ? 'done' : i === n ? 'active' : '';
      return `<div class="tp-step">
        <div class="tp-dot ${cls}" title="${l}"></div>
        ${i < labels.length-1 ? `<div class="tp-line ${i < n ? 'done':''}"></div>` : ''}
      </div>`;
    }).join('');
  }

  /* ── Tone ── */
  function setTone(t, el) {
    tone = t;
    document.querySelectorAll('.tone-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }

  /* ── Checklist ── */
  function toggleCheck(i) {
    checks[i] = !checks[i];
    const box = document.getElementById('chk-' + i);
    const item = document.getElementById('ci-' + i);
    if (!box) return;
    if (checks[i]) { box.classList.add('checked'); box.textContent = '✓'; item?.classList.add('completed'); }
    else           { box.classList.remove('checked'); box.textContent = ''; item?.classList.remove('completed'); }
  }
  function restoreChecks() {
    checks.forEach((c,i) => { if (c) toggleCheck(i); });
  }

  /* ── Generate ── */
  async function startGenerate() {
    setContent(Views.step2Loading());
    updateTopbarProgress(2);

    // Set company name in preview topbar
    const cpName = document.getElementById('cp-company-name');
    if (cpName) cpName.textContent = `${prospect.company} Connect`;

    const logEl = () => document.getElementById('gen-log');
    const log = (msg, cls) => appendLog(logEl(), msg, cls);
    startTimer('gen-elapsed');

    const onPreview = (type, data) => updatePreview(type, data);

    try {
      log('Building contextual prompt...', 'log-dim');
      const result = await Generate.run(prospect, log, onPreview);
      content = result;
      clearTimer();
      log(`✓ ${result.groups.length} groups · ${result.posts.length} posts · ${result.manual.articles.length} articles · ${result.taskBoard.tasks.length} tasks · ${result.events.length} events`, 'log-ok');
      log('Content ready — review below.', 'log-ok');
      await sleep(600);
      setContent(Views.step2Done(content));
    } catch(err) {
      clearTimer();
      log(`Error: ${err.message}`, 'log-err');
      log('Check your Anthropic API key in Settings.', 'log-dim');
    }
  }

  function updatePreview(type, data) {
    if (type === 'groups') {
      const list = document.getElementById('cp-group-list');
      if (!list) return;
      list.innerHTML = data.map(g =>
        `<div class="cp-group-item filled"><div class="cp-group-dot"></div>${g.name}</div>`
      ).join('');
    }
    if (type === 'posts') {
      const main = document.getElementById('cp-main');
      if (!main) return;
      main.innerHTML = data.slice(0,3).map((p, i) => {
        const initials = prospect.company?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'ZC';
        return `<div class="preview-card" style="animation-delay:${i*0.1}s">
          <div class="preview-card-header">
            <div class="preview-avatar">${initials}</div>
            <div class="preview-name">${p.group}</div>
            <div class="preview-time">now</div>
          </div>
          <div class="preview-text">${p.content.slice(0,90)}${p.content.length>90?'…':''}</div>
          ${p.pinned ? '<span class="preview-tag" style="background:var(--gold-100);color:var(--gold-500)">📌 Pinned</span>' : ''}
        </div>`;
      }).join('');
    }
    if (type === 'manual') {
      const main = document.getElementById('cp-main');
      if (!main) return;
      const existing = main.innerHTML;
      main.innerHTML = existing + `<div class="preview-card" style="animation-delay:0.3s">
        <div class="preview-card-header">
          <div class="preview-avatar" style="background:linear-gradient(135deg,var(--gold-500),var(--gold-300))">☰</div>
          <div class="preview-name">${data.name}</div>
        </div>
        <div class="preview-text">${data.articles.length} articles · ${data.description.slice(0,60)}…</div>
      </div>`;
    }
  }

  function regenContent() { content = null; goStep(2); }
  function showGenTab(id, el) {
    ['groups','posts','manual','tasks','events'].forEach(t => {
      const p = document.getElementById('gentab-' + t);
      if (p) p.style.display = t === id ? '' : 'none';
    });
    document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
  }

  /* ── Deploy ── */
  async function startDeploy() {
    if (!content) return;
    setContent(Views.step3Running());
    updateTopbarProgress(3);
    startTimer('deploy-elapsed');
    deployStart = Date.now();

    const logEl = () => document.getElementById('deploy-log');
    const log = (msg, cls) => appendLog(logEl(), msg, cls);

    // ETA countdown
    const etaEl = () => document.getElementById('deploy-eta-remaining');
    const etaTick = setInterval(() => {
      const elapsed = (Date.now() - deployStart) / 1000;
      const left = Math.max(0, Math.round(etaTotal - elapsed));
      const el = etaEl();
      if (el) el.textContent = left > 0 ? `~${left}s remaining` : 'Finishing up...';
    }, 1000);

    try {
      log(`Starting deploy for ${prospect.company}...`, 'log-info');
      const summary = await Deploy.run(content, prospect.scopeId, log);
      clearInterval(etaTick);
      clearTimer();
      log('─────────────────────────────────', 'log-dim');
      log(`PoC for ${prospect.company} is live ✓`, 'log-ok');

      const health = Validate.healthScore(content, summary);
      Storage.addRecord({ ...prospect, ...summary, manualName: content.manual?.name, articles: content.manual?.articles?.length });
      refreshBadge();

      await sleep(600);
      const { dc } = Storage.getCreds();
      setContent(Views.step3Done(prospect, summary, health, dc || 'in'));
      updateTopbarProgress(4);

      // Animate health score
      setTimeout(() => animateHealth(health.score), 300);

      // Sync cred display
      setupCredSync();

    } catch(err) {
      clearInterval(etaTick); clearTimer();
      log(`Error: ${err.message}`, 'log-err');
      if (err.message.includes('token') || err.message.includes('expired')) {
        log('→ Go to Settings to update your OAuth token.', 'log-dim');
      }
      log('You can retry — completed steps will be skipped automatically.', 'log-info');
    }
  }

  function animateHealth(target) {
    const numEl = document.getElementById('health-num');
    const barEl = document.getElementById('health-bar');
    if (!numEl || !barEl) return;
    let current = 0;
    const step  = target / 50;
    const tick  = setInterval(() => {
      current = Math.min(current + step, target);
      numEl.textContent = Math.round(current);
      barEl.style.width = current + '%';
      if (current >= target) clearInterval(tick);
    }, 20);
  }

  function setupCredSync() {
    const userEl = document.getElementById('ho-user');
    const passEl = document.getElementById('ho-pass');
    const userDisp = document.getElementById('cred-user-display');
    const passDisp = document.getElementById('cred-pass-display');
    if (userEl && userDisp) userEl.addEventListener('input', () => { userDisp.textContent = userEl.value || '—'; });
    if (passEl && passDisp) passEl.addEventListener('input', () => { passDisp.textContent = passEl.value || '—'; });
  }

  /* ── PDF export ── */
  function exportPDF() {
    const { dc } = Storage.getCreds();
    const slug   = prospect.company?.toLowerCase().replace(/\s+/g,'');
    PDF.exportHandover({
      company:    prospect.company,
      industry:   prospect.industry,
      usecase:    prospect.usecase,
      networkUrl: `https://connect.zoho.${dc||'in'}/portal/${slug}`,
      username:   document.getElementById('ho-user')?.value || '',
      password:   document.getElementById('ho-pass')?.value || '',
      groups:     (content?.groups || []).map(g => g.name),
      posts:      content?.posts?.length,
      manualName: content?.manual?.name,
      articles:   content?.manual?.articles?.length,
      tasks:      content?.taskBoard?.tasks?.length,
      events:     content?.events?.length,
    });
  }

  /* ── Clone / Duplicate ── */
  function clonePoc(id) {
    const rec = Storage.getHistory().find(r => r.id === id);
    if (!rec) return;
    prospect = { company: rec.company + ' (clone)', industry: rec.industry, location: rec.location || '', size: rec.size || '', usecase: rec.usecase || '', depts: rec.depts || '', tone: rec.tone || 'formal' };
    tone = prospect.tone;
    content = null;
    showView('new', document.querySelector('.nav-item[data-view="new"]'));
    setTimeout(() => {
      ['company','industry','location','size','usecase','depts'].forEach(k => {
        const el = document.getElementById('f-' + k);
        if (el) el.value = prospect[k] || '';
      });
    }, 200);
  }

  /* ── Settings ── */
  function saveSettings() {
    const token = document.getElementById('s-token')?.value?.trim();
    const existing = sessionStorage.getItem('poc_zohoToken');
    const expiry = token && token !== existing ? Date.now() + 55*60*1000 : sessionStorage.getItem('poc_tokenExpiry') || '';
    Storage.saveCreds({
      anthropic:    document.getElementById('s-anthropic')?.value?.trim()    || '',
      zohoToken:    token,
      zohoRefresh:  document.getElementById('s-refresh')?.value?.trim()      || '',
      clientId:     document.getElementById('s-clientid')?.value?.trim()     || '',
      clientSecret: document.getElementById('s-clientsecret')?.value?.trim() || '',
      dc:           document.getElementById('s-dc')?.value || 'in',
      tokenExpiry:  expiry,
    });
    Storage.saveSettings({ dc: document.getElementById('s-dc')?.value || 'in' });
    updateDcLabel();
    const saved = document.getElementById('settings-saved');
    if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2000); }
  }

  /* ── History ── */
  function deleteRecord(id) {
    if (!confirm('Remove this PoC from history?')) return;
    Storage.deleteRecord(id);
    showView('history', null);
    refreshBadge();
  }
  function refreshBadge() {
    const n = Storage.getHistory().length;
    const b = document.getElementById('history-badge');
    if (!b) return;
    b.textContent = n;
    b.className   = n > 0 ? 'nav-badge' : 'nav-badge zero';
    if (n > 0) { b.style.transform = 'scale(1.3)'; setTimeout(() => b.style.transform = '', 300); }
  }

  /* ── Reset ── */
  function startNew() {
    content = null; prospect = {}; checks = [false,false,false,false,false]; step = 0; tone = 'formal';
    showView('new', document.querySelector('.nav-item[data-view="new"]'));
  }

  /* ── Helpers ── */
  function val(id) { return document.getElementById(id)?.value?.trim() || ''; }

  function appendLog(el, msg, cls='') {
    if (!el) return;
    const t = new Date().toTimeString().slice(0,8);
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">${t}</span><span class="${cls}">${msg}</span>`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function startTimer(elId) {
    clearInterval(timerHandle);
    let s = 0;
    timerHandle = setInterval(() => {
      const el = document.getElementById(elId);
      if (el) el.textContent = (++s) + 's';
    }, 1000);
  }
  function clearTimer() { clearInterval(timerHandle); }

  function shake(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'none';
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow = '0 0 0 3px rgba(192,57,43,.15)';
    setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
    el.focus();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return {
    init, showView, goStep, setTone, toggleCheck,
    startGenerate, regenContent, showGenTab,
    startDeploy, exportPDF,
    clonePoc, deleteRecord, startNew, saveSettings,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
