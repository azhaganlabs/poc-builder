const Views = (() => {
  const e = s => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmt = iso => { try { return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); } catch{return '—';} };

  /* ── STEP 0: Prospect ── */
  function step0() {
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 1 of 4</div>
  <div class="step-title">Prospect details</div>
  <div class="step-sub">Tell Claude who this PoC is for — the more context, the more specific the output.</div>
</div>
<div class="form-grid">
  <div class="field fade-in fade-in-d1">
    <div class="field-label">Company name <span class="req">*</span></div>
    <input class="input" id="f-company" type="text" placeholder="e.g. Mother Dairy" />
  </div>
  <div class="field fade-in fade-in-d1">
    <div class="field-label">Industry</div>
    <input class="input" id="f-industry" type="text" placeholder="e.g. FMCG / Dairy" />
  </div>
  <div class="field fade-in fade-in-d2">
    <div class="field-label">Location</div>
    <input class="input" id="f-location" type="text" placeholder="e.g. Delhi NCR" />
  </div>
  <div class="field fade-in fade-in-d2">
    <div class="field-label">Company size</div>
    <input class="input" id="f-size" type="text" placeholder="e.g. ~3000 employees" />
  </div>
  <div class="field form-full fade-in fade-in-d3">
    <div class="field-label">Use case — what problem are they solving? <span class="req">*</span></div>
    <textarea class="input" id="f-usecase" placeholder="e.g. Replacing scattered WhatsApp groups and email for 3000 field staff across 12 states. Need structured comms, SOPs in one place, and visibility for leadership."></textarea>
    <div class="field-hint">Be specific — Claude uses this to generate contextual content.</div>
  </div>
  <div class="field form-full fade-in fade-in-d3">
    <div class="field-label">Key departments / teams</div>
    <input class="input" id="f-depts" type="text" placeholder="e.g. Field Sales, Plant Operations, HR, Marketing" />
    <div class="field-hint">These become groups/channels in Connect.</div>
  </div>
  <div class="field form-full fade-in fade-in-d4">
    <div class="field-label">Content tone</div>
    <div class="tone-selector" id="tone-selector">
      ${[
        {val:'formal',    icon:'🏛',  label:'Formal',      tip:'Professional language, structured communication. Best for enterprise/govt prospects.'},
        {val:'operational',icon:'⚙', label:'Operational', tip:'Process-focused, metric-driven. Ideal for manufacturing, logistics, ops-heavy teams.'},
        {val:'casual',    icon:'💬',  label:'Casual',      tip:'Warm, inclusive, conversational. Works well for tech companies and modern culture fits.'},
      ].map(t => `
        <div class="tone-option ${t.val==='formal'?'selected':''}" data-tone="${t.val}" onclick="App.setTone('${t.val}',this)">
          <span class="tone-icon">${t.icon}</span>${t.label}
          <div class="tone-tooltip">${t.tip}</div>
        </div>`).join('')}
    </div>
  </div>
</div>
<div class="btn-row">
  <button class="btn btn-primary" onclick="App.goStep(1)"><span>Continue</span> <span class="btn-icon">→</span></button>
</div></div>`;
  }

  /* ── STEP 1: Checklist ── */
  function step1(company) {
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 2 of 4</div>
  <div class="step-title">Prepare the network</div>
  <div class="step-sub">~3 minutes of manual setup in Connect, then the agent handles everything else.</div>
</div>
<div class="alert alert-burg fade-in">
  The Connect API cannot create networks — this is a platform constraint. These steps take ~3 min and happen once per PoC.
</div>
<div class="checklist">
  ${[
    {id:0, title:'Create a new network', tag:'manual', desc:`Zoho Connect → click your org name (top-left) → Create network. Name it <strong>${e(company)} Connect</strong>.`, link:'https://connect.zoho.in', linkText:'Open Zoho Connect ↗'},
    {id:1, title:'Set the network logo', tag:'manual', desc:`Admin settings → Branding → upload logo. Use ${e(company)}'s logo if available.`},
    {id:2, title:'Paste the Network Scope ID', tag:'auto', desc:'Admin → Network settings. The Scope ID is in the URL or listed on the page.', scopeInput:true},
    {id:3, title:'Enable required modules', tag:'manual', desc:'Admin → Apps → enable: <code>Groups</code>, <code>Feeds</code>, <code>Manuals</code>, <code>Tasks</code>, <code>Events</code>, <code>Forums</code>.'},
    {id:4, title:'Confirm OAuth scopes', tag:'auto', desc:'Your token needs: <code>ZohoPulse.feedList.ALL</code> · <code>ZohoPulse.grouplist.ALL</code> · <code>ZohoPulse.networkAdmin.ALL</code> · <code>ZohoPulse.pagelist.ALL</code> · <code>ZohoPulse.tasks.ALL</code> · <code>ZohoPulse.events.ALL</code>'},
  ].map(item => `
    <div class="check-item" id="ci-${item.id}">
      <div class="check-box" id="chk-${item.id}" onclick="App.toggleCheck(${item.id})"></div>
      <div class="check-body">
        <div class="check-title">${item.title} <span class="tag-${item.tag}">${item.tag}</span></div>
        <div class="check-desc">${item.desc}</div>
        ${item.link ? `<a class="check-link" style="color:var(--burg-600);font-size:11px;margin-top:4px;display:inline-block" href="${item.link}" target="_blank" rel="noopener">${item.linkText}</a>` : ''}
        ${item.scopeInput ? `<div class="scope-row"><input class="input" id="f-scopeid" type="text" placeholder="e.g. 3000000000008" /></div>` : ''}
      </div>
    </div>`).join('')}
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(0)">← Back</button>
  <button class="btn btn-primary" onclick="App.goStep(2)">Generate content →</button>
</div></div>`;
  }

  /* ── STEP 2: Generate (idle) ── */
  function step2Idle(company, tone) {
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Generate PoC content</div>
  <div class="step-sub">Claude will create everything for <strong>${e(company)}</strong>. Review before deploying.</div>
</div>
<div class="alert alert-burg fade-in">
  Will generate: groups, feed posts (pinned), knowledge manual with articles, task board, and upcoming events — all specific to ${e(company)}.
  Tone: <strong>${tone || 'Formal'}</strong>.
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(1)">← Back</button>
  <button class="btn btn-primary" onclick="App.startGenerate()"><span class="btn-icon">✦</span> Generate with Claude</button>
</div></div>`;
  }

  /* ── STEP 2: Generate (loading) with split preview ── */
  function step2Loading() {
    return `<div class="page-enter content-inner" style="max-width:1000px">
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Generating content...</div>
</div>
<div class="split-layout">
  <div>
    <div class="log-shell">
      <div class="log-topbar">
        <div class="log-title">claude-sonnet-4-6 · content generation</div>
        <div id="gen-elapsed" style="font-size:11px;color:var(--ink-3)">0s</div>
      </div>
      <div class="log-body" id="gen-log"></div>
    </div>
  </div>
  <div>
    <div class="connect-preview">
      <div class="cp-topbar">
        <div class="cp-logo"></div>
        <div class="cp-title" id="cp-company-name">Connect Network</div>
      </div>
      <div class="cp-body">
        <div class="cp-sidebar" id="cp-sidebar">
          ${['Feeds','Groups','Manuals','Tasks','Events'].map((n,i) =>
            `<div class="cp-nav-item ${i===0?'cp-active':''}"><span class="cp-icon">${['◉','◎','☰','☑','◈'][i]}</span>${n}</div>`
          ).join('')}
          <div class="cp-group-list" id="cp-group-list"></div>
        </div>
        <div class="cp-main" id="cp-main">
          ${skeletonCards(3)}
        </div>
      </div>
    </div>
  </div>
</div></div>`;
  }

  function skeletonCards(n) {
    return Array.from({length:n}, () => `
      <div class="skel-card">
        <div class="skel-row">
          <div class="skel skel-avatar"></div>
          <div style="flex:1"><div class="skel" style="width:60%;margin-bottom:4px"></div><div class="skel" style="width:35%"></div></div>
        </div>
        <div class="skel" style="margin-bottom:4px"></div>
        <div class="skel" style="width:80%"></div>
      </div>`).join('');
  }

  /* ── STEP 2: Done — review ── */
  function step2Done(content) {
    const tabs = ['groups','posts','manual','tasks','events'];
    const labels = ['Groups','Posts','Manual','Tasks','Events'];
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Review content</div>
  <div class="step-sub">Looks good? Deploy it — or regenerate if you want a different take.</div>
</div>
<div class="ctabs">${labels.map((l,i) => `<button class="ctab${i===0?' active':''}" onclick="App.showGenTab('${tabs[i]}',this)">${l}</button>`).join('')}</div>
${tabs.map((t,i) => `<div id="gentab-${t}" ${i>0?'style="display:none"':''}>${renderGenTab(t, content)}</div>`).join('')}
<div class="btn-row" style="margin-top:20px">
  <button class="btn btn-ghost" onclick="App.regenContent()">↺ Regenerate</button>
  <button class="btn btn-primary" onclick="App.goStep(3)">Deploy to Connect →</button>
</div></div>`;
  }

  function renderGenTab(tab, c) {
    if (tab === 'groups') return c.groups.map(g => `
      <div class="gen-block">
        <div class="gen-block-head" style="color:var(--burg-700)">◉ ${e(g.name)} <span class="gbadge" style="margin-left:auto">${g.visibility}</span></div>
        <div class="gen-block-body">${e(g.description)}</div>
      </div>`).join('');
    if (tab === 'posts') return c.posts.map(p => `
      <div class="gen-block">
        <div class="gen-block-head">
          <span style="color:var(--green)">◉</span> <span style="color:var(--ink)">${e(p.group)}</span>
          <span class="gbadge" style="margin-left:6px">${p.type}</span>
          ${p.pinned ? '<span class="gbadge gbadge-pin" style="margin-left:4px">📌 pinned</span>' : ''}
        </div>
        <div class="gen-block-body">${e(p.content)}</div>
      </div>`).join('');
    if (tab === 'manual') return `<div class="gen-block">
      <div class="gen-block-head" style="color:var(--gold-500)">☰ ${e(c.manual.name)}</div>
      <div class="gen-block-body"><p style="margin-bottom:10px;color:var(--ink-3)">${e(c.manual.description)}</p>
        <ul>${c.manual.articles.map(a => `<li><strong>${e(a.title)}</strong><br>${e(a.summary)}</li>`).join('')}</ul>
      </div></div>`;
    if (tab === 'tasks') return c.taskBoard.sections.map(sec => {
      const tasks = c.taskBoard.tasks.filter(t => t.section === sec);
      return `<div class="gen-block">
        <div class="gen-block-head"><span style="color:var(--burg-500)">☑</span> ${sec} <span class="gbadge" style="margin-left:auto">${tasks.length}</span></div>
        <div class="gen-block-body"><ul>${tasks.map(t => `<li><strong>${e(t.title)}</strong> — ${e(t.description)}</li>`).join('')}</ul></div>
      </div>`;}).join('');
    if (tab === 'events') return c.events.map(ev => `
      <div class="gen-block">
        <div class="gen-block-head" style="color:var(--blue)">◈ ${e(ev.title)} <span class="gbadge" style="margin-left:auto">${ev.type}</span></div>
        <div class="gen-block-body">${e(ev.description)}</div>
      </div>`).join('');
    return '';
  }

  /* ── STEP 3: Deploy (idle) ── */
  function step3Idle(scopeId, company, eta) {
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 4 of 4</div>
  <div class="step-title">Deploy to Connect</div>
  <div class="step-sub">Pushing to network <code>${e(scopeId)}</code> — <strong>${e(company)}</strong></div>
</div>
<div class="eta-badge fade-in">
  <span class="eta-icon">⏱</span> Estimated time: ~${eta} seconds
</div>
<div class="alert alert-warn fade-in">
  Once deployed, content is live in the network. If the run fails partway, you can resume from this step — completed steps will be skipped automatically.
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(2)">← Back</button>
  <button class="btn btn-primary" onclick="App.startDeploy()"><span class="btn-icon">▶</span> Deploy now</button>
</div></div>`;
  }

  /* ── STEP 3: Running ── */
  function step3Running() {
    return `<div class="page-enter content-inner">
<div class="step-header">
  <div class="step-eyebrow">Step 4 of 4</div>
  <div class="step-title">Deploying...</div>
</div>
<div class="log-shell">
  <div class="log-topbar">
    <div class="log-title">agent · zoho connect api</div>
    <div style="display:flex;align-items:center;gap:10px">
      <div id="deploy-eta-remaining" style="font-size:11px;color:var(--ink-3)"></div>
      <div id="deploy-elapsed" style="font-size:11px;color:var(--ink-3)">0s</div>
    </div>
  </div>
  <div class="log-body" id="deploy-log"></div>
</div></div>`;
  }

  /* ── STEP 3: Done + Handover card ── */
  function step3Done(prospect, summary, health, dc) {
    const slug = prospect.company.toLowerCase().replace(/\s+/g,'');
    const url  = `https://connect.zoho.${dc}/portal/${slug}`;
    const chips = [
      ...summary.groups.map(g => `<span class="chip chip-group">${e(g)}</span>`),
      `<span class="chip chip-post">${summary.posts} posts</span>`,
      summary.manualId ? `<span class="chip chip-manual">Manual</span>` : '',
      `<span class="chip chip-task">${summary.tasks} tasks</span>`,
      `<span class="chip chip-event">${summary.events} events</span>`,
    ].join('');

    const gradeColor = health.score >= 80 ? 'var(--green)' : health.score >= 60 ? 'var(--amber)' : 'var(--red)';

    return `<div class="page-enter content-inner">
<!-- Health score -->
<div class="health-wrap">
  <div class="health-card">
    <div class="health-grade">${e(health.grade)}</div>
    <div class="health-top">
      <div class="health-label">PoC Health Score</div>
    </div>
    <div class="health-score-wrap">
      <div class="health-score" id="health-num">0</div>
      <div class="health-score-max">/100</div>
    </div>
    <div class="health-bar-wrap" style="margin-top:10px">
      <div class="health-bar" id="health-bar" style="width:0%"></div>
    </div>
    <div class="health-breakdown">
      ${health.breakdown.map(b => `<div class="health-item"><div class="health-dot"></div>${e(b.label)} <span style="opacity:.6">(${b.pts}/${b.max})</span></div>`).join('')}
    </div>
  </div>
</div>

<!-- Summary -->
<div class="summary-card">
  <div class="summary-title">✓ PoC live and ready</div>
  <div class="summary-grid">
    <div><div class="summary-key">Company</div><div class="summary-val">${e(prospect.company)}</div></div>
    <div><div class="summary-key">Network URL</div><div class="summary-val"><a href="${url}" target="_blank" rel="noopener">${url}</a></div></div>
    <div><div class="summary-key">Scope ID</div><div class="summary-val" style="font-family:var(--mono)">${e(prospect.scopeId)}</div></div>
    <div><div class="summary-key">Content</div><div class="summary-val"><div class="chips" style="margin-top:4px">${chips}</div></div></div>
  </div>
</div>

<!-- Handover card -->
<div class="handover-card">
  <div class="handover-title">🤝 Client Handover Brief</div>
  <div class="alert alert-burg" style="font-size:12px;margin-bottom:14px">Fill in the login credentials before exporting — these will appear in the PDF.</div>
  <div class="form-grid" style="max-width:420px;margin-bottom:14px">
    <div class="field">
      <div class="field-label">Username / Email</div>
      <input class="input" id="ho-user" type="text" placeholder="admin@${slug}.com" />
    </div>
    <div class="field">
      <div class="field-label">Password</div>
      <input class="input" id="ho-pass" type="text" placeholder="TempPass@123" />
    </div>
  </div>

  <div class="handover-section">
    <div class="handover-label">Network access</div>
    <div class="creds-box">
      <div class="cred-row"><span class="cred-key">URL</span><span class="cred-val">${url}</span></div>
      <div class="cred-row"><span class="cred-key">Username</span><span class="cred-val" id="cred-user-display">—</span></div>
      <div class="cred-row"><span class="cred-key">Password</span><span class="cred-val" id="cred-pass-display">—</span></div>
    </div>
  </div>

  <div class="handover-section">
    <div class="handover-label">Suggested talking points for first call</div>
    <ul class="talking-points">
      <li>Show the <strong>${e(summary.groups?.[0] || 'main')}</strong> group — pinned announcements replace scattered WhatsApp/email.</li>
      <li>Open <strong>Manuals</strong> — demonstrate SOPs, policies, and guides in one searchable place.</li>
      <li>Walk through the <strong>Task board</strong> — real workflows, not email chains.</li>
      <li>Show <strong>Events</strong> — all-hands and trainings already added to the network calendar.</li>
      <li>Switch to <strong>mobile</strong> — show the notification experience for field staff.</li>
    </ul>
  </div>

  <div class="handover-actions">
    <button class="btn btn-gold" onclick="App.exportPDF()"><span class="btn-icon">↓</span> Export as PDF</button>
    <button class="btn btn-ghost" onclick="App.startNew()">＋ New PoC</button>
    <button class="btn btn-ghost" onclick="App.showView('history',null)">View history</button>
  </div>
</div>
</div>`;
  }

  /* ── History ── */
  function history(records) {
    if (!records.length) return `<div class="page-enter content-inner">
<div class="step-header"><div class="step-title">History</div><div class="step-sub">PoCs built with this tool.</div></div>
<div class="empty-state"><div class="empty-icon">◷</div><div class="empty-msg">No PoCs yet. Start from New PoC.</div></div></div>`;

    return `<div class="page-enter content-inner">
<div class="step-header"><div class="step-title">History</div><div class="step-sub">${records.length} PoC${records.length!==1?'s':''} built.</div></div>
<div class="table-wrap">
<table>
  <thead><tr><th>Company</th><th>Industry</th><th>Scope ID</th><th>Created</th><th>Status</th><th></th></tr></thead>
  <tbody>
    ${records.map(r => `<tr>
      <td style="font-weight:600;color:var(--ink)">${e(r.company)}</td>
      <td>${e(r.industry||'—')}</td>
      <td style="font-family:var(--mono);font-size:12px">${e(r.scopeId||'—')}</td>
      <td>${fmt(r.createdAt)}</td>
      <td><span class="pill pill-active">● Active</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px" onclick="App.clonePoc(${r.id})">Duplicate & adapt</button>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:var(--red)" onclick="App.deleteRecord(${r.id})">Delete</button>
      </td>
    </tr>`).join('')}
  </tbody>
</table></div></div>`;
  }

  /* ── Settings ── */
  function settings() {
    const st = Auth.tokenStatus();
    return `<div class="page-enter content-inner">
<div class="step-header"><div class="step-title">Settings</div><div class="step-sub">Credentials live in your browser session only — cleared when the tab closes.</div></div>
<div class="settings-section-title">Anthropic</div>
<div class="form-grid" style="max-width:480px">
  <div class="field form-full">
    <div class="field-label">API key</div>
    <input class="input" id="s-anthropic" type="password" placeholder="sk-ant-..." />
    <div class="field-hint">Used to call Claude for content generation. Get yours at console.anthropic.com.</div>
  </div>
</div>
<div class="settings-section-title">Zoho OAuth</div>
<div class="alert alert-info" style="max-width:480px">Add Refresh Token + Client credentials to enable auto-refresh — no manual re-pasting after the first time.</div>
<div class="form-grid" style="max-width:480px">
  <div class="field form-full">
    <div class="field-label">Access token</div>
    <input class="input" id="s-token" type="password" placeholder="1000.xxxxx..." />
    <div class="token-status token-${st.state}"><div class="token-dot"></div>${e(st.label)}</div>
  </div>
  <div class="field form-full">
    <div class="field-label">Refresh token <span style="font-weight:400;color:var(--ink-4)">(enables auto-refresh)</span></div>
    <input class="input" id="s-refresh" type="password" placeholder="1000.xxxxx..." />
  </div>
  <div class="field">
    <div class="field-label">Client ID</div>
    <input class="input" id="s-clientid" type="text" placeholder="1000.XXXX..." />
  </div>
  <div class="field">
    <div class="field-label">Client secret</div>
    <input class="input" id="s-clientsecret" type="password" />
  </div>
  <div class="field form-full">
    <div class="field-label">Data centre</div>
    <select class="input" id="s-dc">
      <option value="in">India (.zoho.in)</option>
      <option value="com">US (.zoho.com)</option>
      <option value="eu">Europe (.zoho.eu)</option>
      <option value="com.au">Australia (.zoho.com.au)</option>
      <option value="jp">Japan (.zoho.jp)</option>
    </select>
  </div>
</div>
<div class="btn-row">
  <button class="btn btn-primary" onclick="App.saveSettings()">Save for this session</button>
</div>
<div id="settings-saved" style="display:none;margin-top:10px;font-size:12px;color:var(--green)">✓ Saved</div>
<div class="divider"></div>
<div class="settings-section-title">How to get tokens</div>
<p style="font-size:12px;color:var(--ink-2);line-height:1.9;max-width:480px">
  1. Go to <a href="https://api-console.zoho.in" target="_blank" style="color:var(--burg-600)">api-console.zoho.in</a> → Add Client → Self Client.<br>
  2. Generate a grant token with the scopes listed in Step 2 of the builder.<br>
  3. Exchange for access + refresh tokens via the token endpoint.<br>
  4. Paste both here. Refresh token doesn't expire — you only do this once per SE.
</p>
</div>`;
  }

  return { step0, step1, step2Idle, step2Loading, step2Done, step3Idle, step3Running, step3Done, history, settings, skeletonCards };
})();
