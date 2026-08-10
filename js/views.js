/**
 * views.js
 * Returns HTML strings for each view/step.
 * Keeps all markup out of app.js.
 */

const Views = (() => {

  function newPoc() {
    return `
<div class="content-inner">
  <div class="progress-steps" id="progress-bar">
    ${[['Prospect','active'],['Network setup',''],['Generate',''],['Deploy','']].map((s,i) =>
      `<div class="prog-step">
        <div class="prog-dot ${s[1]}" id="pdot-${i}">${i+1}</div>
        <div class="prog-label ${s[1]}" id="plabel-${i}">${s[0]}</div>
      </div>`).join('')}
  </div>
  <div id="steps-container"></div>
</div>`;
  }

  function step0() {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 1 of 4</div>
  <div class="step-title">Prospect details</div>
  <div class="step-sub">Tell Claude who this PoC is for. The more context, the more specific the content.</div>
</div>
<div class="form-grid">
  <div class="field">
    <label>Company name</label>
    <input id="f-company" type="text" placeholder="e.g. Mother Dairy" />
  </div>
  <div class="field">
    <label>Industry</label>
    <input id="f-industry" type="text" placeholder="e.g. FMCG / Dairy" />
  </div>
  <div class="field">
    <label>Location</label>
    <input id="f-location" type="text" placeholder="e.g. Delhi NCR" />
  </div>
  <div class="field">
    <label>Company size</label>
    <input id="f-size" type="text" placeholder="e.g. ~3000 employees" />
  </div>
  <div class="field form-full">
    <label>Use case — what problem are they trying to solve?</label>
    <textarea id="f-usecase" placeholder="e.g. Internal comms hub for field sales teams across 12 states. Currently on WhatsApp groups and email, which are hard to manage and lack structure."></textarea>
    <div class="field-hint">Be specific — Claude uses this to generate contextual content.</div>
  </div>
  <div class="field form-full">
    <label>Key departments / teams</label>
    <input id="f-depts" type="text" placeholder="e.g. Field Sales, Plant Operations, HR, Marketing" />
    <div class="field-hint">These become groups/channels in Connect.</div>
  </div>
  <div class="field form-full">
    <label>Prospect admin email</label>
    <input id="f-email" type="email" placeholder="cto@company.com" />
    <div class="field-hint">Invited as network admin at the end of the run.</div>
  </div>
</div>
<div class="btn-row">
  <button class="btn btn-primary" onclick="App.goStep(1)">Continue →</button>
</div>`;
  }

  function step1(companyName) {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 2 of 4</div>
  <div class="step-title">Prepare the network</div>
  <div class="step-sub">Complete these in Zoho Connect before running the agent. Takes ~3 minutes.</div>
</div>
<div class="alert alert-info">
  The Connect API can't create networks — this is a platform limitation. These manual steps take ~3 min and happen once per PoC.
</div>
<div class="checklist">
  <div class="check-item">
    <div class="check-box" id="chk-0" onclick="App.toggleCheck(0)"></div>
    <div class="check-body">
      <div class="check-title">Create a new network <span class="tag-manual">Manual</span></div>
      <div class="check-desc">Go to Zoho Connect → click your org name (top left) → "Create network". Name it <strong>${companyName} Connect</strong> or similar.</div>
      <a class="check-link" href="https://connect.zoho.in" target="_blank" rel="noopener">→ Open Zoho Connect ↗</a>
    </div>
  </div>
  <div class="check-item">
    <div class="check-box" id="chk-1" onclick="App.toggleCheck(1)"></div>
    <div class="check-body">
      <div class="check-title">Set the network logo <span class="tag-manual">Manual</span></div>
      <div class="check-desc">Admin settings → Branding → upload logo. Use ${companyName}'s logo if available, otherwise the Zoho placeholder is fine for now.</div>
    </div>
  </div>
  <div class="check-item">
    <div class="check-box" id="chk-2" onclick="App.toggleCheck(2)"></div>
    <div class="check-body">
      <div class="check-title">Copy the Network (Scope) ID</div>
      <div class="check-desc">Admin → Network settings. The Scope ID appears in the URL or on the settings page. Paste it here:</div>
      <div class="scope-row">
        <input id="f-scopeid" type="text" placeholder="e.g. 3000000000008" style="font-family:var(--mono)" />
      </div>
    </div>
  </div>
  <div class="check-item">
    <div class="check-box" id="chk-3" onclick="App.toggleCheck(3)"></div>
    <div class="check-body">
      <div class="check-title">Enable required modules <span class="tag-manual">Manual</span></div>
      <div class="check-desc">Admin → Apps → enable: <code>Groups</code>, <code>Feeds</code>, <code>Manuals</code>, <code>Tasks</code>, <code>Events</code>, <code>Forums</code>. The agent will populate all of these.</div>
    </div>
  </div>
  <div class="check-item">
    <div class="check-box" id="chk-4" onclick="App.toggleCheck(4)"></div>
    <div class="check-body">
      <div class="check-title">Confirm OAuth token scopes</div>
      <div class="check-desc">Your token in Settings needs: <code>ZohoPulse.feedList.ALL</code>, <code>ZohoPulse.grouplist.ALL</code>, <code>ZohoPulse.networklist.ALL</code>, <code>ZohoPulse.networkAdmin.ALL</code>, <code>ZohoPulse.pagelist.ALL</code>, <code>ZohoPulse.tasks.ALL</code>, <code>ZohoPulse.events.ALL</code></div>
    </div>
  </div>
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(0)">← Back</button>
  <button class="btn btn-primary" onclick="App.goStep(2)">Generate content →</button>
</div>`;
  }

  function step2_idle(companyName) {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Generate PoC content</div>
  <div class="step-sub">Claude will create everything for <strong>${companyName}</strong>. Review before deploying.</div>
</div>
<div class="alert alert-info">
  Claude will generate: groups, feed posts (with pins), a knowledge manual with articles, a task board, and upcoming events — all specific to ${companyName}.
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(1)">← Back</button>
  <button class="btn btn-primary" onclick="App.startGenerate()">Generate with Claude →</button>
</div>`;
  }

  function step2_loading() {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Generating...</div>
</div>
<div class="log-shell">
  <div class="log-topbar">
    <div class="log-title">claude-sonnet-4-6 · content generation</div>
    <div id="gen-elapsed" style="font-size:11px;color:var(--ink-3)">0s</div>
  </div>
  <div class="log-body" id="gen-log"></div>
</div>`;
  }

  function step2_done(content) {
    const tabs = ['groups','posts','manual','tasks','events'];
    const tabLabels = ['Groups','Posts','Manual','Tasks','Events'];
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 3 of 4</div>
  <div class="step-title">Review content</div>
  <div class="step-sub">Looks good? Deploy to Connect, or regenerate.</div>
</div>
<div class="ctabs">
  ${tabLabels.map((l,i) => `<button class="ctab${i===0?' active':''}" onclick="App.showGenTab('${tabs[i]}',this)">${l}</button>`).join('')}
</div>
${tabs.map((t,i) => `<div id="gentab-${t}" ${i>0?'style="display:none"':''}>${renderGenTab(t, content)}</div>`).join('')}
<div class="btn-row" style="margin-top:20px">
  <button class="btn btn-ghost" onclick="App.regenContent()">↺ Regenerate</button>
  <button class="btn btn-primary" onclick="App.goStep(3)">Deploy to Connect →</button>
</div>`;
  }

  function renderGenTab(tab, c) {
    if (tab === 'groups') {
      return c.groups.map(g => `
        <div class="gen-block">
          <div class="gen-block-head"><span style="color:#534AB7">◉</span> ${esc(g.name)} <span style="margin-left:auto" class="badge-type">${g.visibility}</span></div>
          <div class="gen-block-body">${esc(g.description)}</div>
        </div>`).join('');
    }
    if (tab === 'posts') {
      return c.posts.map(p => `
        <div class="gen-block">
          <div class="gen-block-head">
            <span style="color:#085041">◉</span> ${esc(p.group)}
            <span class="badge-type" style="margin-left:6px">${p.type}</span>
            ${p.pinned ? '<span class="badge-pinned" style="margin-left:4px">📌 pinned</span>' : ''}
          </div>
          <div class="gen-block-body">${esc(p.content)}</div>
        </div>`).join('');
    }
    if (tab === 'manual') {
      return `<div class="gen-block">
        <div class="gen-block-head"><span style="color:#633806">◉</span> ${esc(c.manual.name)}</div>
        <div class="gen-block-body">
          <p style="margin-bottom:10px">${esc(c.manual.description)}</p>
          <ul>${c.manual.articles.map(a => `<li><strong>${esc(a.title)}</strong><br>${esc(a.summary)}</li>`).join('')}</ul>
        </div>
      </div>`;
    }
    if (tab === 'tasks') {
      return c.taskBoard.sections.map(sec => {
        const tasks = c.taskBoard.tasks.filter(t => t.section === sec);
        return `<div class="gen-block">
          <div class="gen-block-head"><span style="color:#4A1B0C">◉</span> ${sec} <span style="margin-left:auto;font-size:11px;color:var(--ink-3)">${tasks.length} tasks</span></div>
          <div class="gen-block-body"><ul>${tasks.map(t => `<li><strong>${esc(t.title)}</strong> — ${esc(t.description)}</li>`).join('')}</ul></div>
        </div>`;
      }).join('');
    }
    if (tab === 'events') {
      return c.events.map(e => `
        <div class="gen-block">
          <div class="gen-block-head"><span style="color:#185FA5">◉</span> ${esc(e.title)} <span style="margin-left:auto" class="badge-type">${e.type}</span></div>
          <div class="gen-block-body">${esc(e.description)}</div>
        </div>`).join('');
    }
    return '';
  }

  function step3_idle(scopeId, companyName) {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 4 of 4</div>
  <div class="step-title">Deploy to Connect</div>
  <div class="step-sub">Pushing to network <code>${esc(scopeId)}</code> — <strong>${esc(companyName)}</strong>.</div>
</div>
<div class="alert alert-warn">
  Once deployed, content is live in the network. The prospect will be invited as admin at the end of the run.
</div>
<div class="btn-row">
  <button class="btn btn-ghost" onclick="App.goStep(2)">← Back</button>
  <button class="btn btn-primary" onclick="App.startDeploy()">▶ Deploy now</button>
</div>`;
  }

  function step3_running() {
    return `
<div class="step-header">
  <div class="step-eyebrow">Step 4 of 4</div>
  <div class="step-title">Deploying...</div>
</div>
<div class="log-shell">
  <div class="log-topbar">
    <div class="log-title">agent · zoho connect api</div>
    <div id="deploy-elapsed" style="font-size:11px;color:var(--ink-3)">0s</div>
  </div>
  <div class="log-body" id="deploy-log"></div>
</div>`;
  }

  function step3_done(prospect, summary, dc) {
    const slug = prospect.company.toLowerCase().replace(/\s+/g, '');
    const url  = `https://connect.zoho.${dc}/portal/${slug}`;
    const chips = [
      ...summary.groups.map(g => `<span class="chip chip-group">${esc(g)}</span>`),
      `<span class="chip chip-post">${summary.posts} posts</span>`,
      summary.manualId ? `<span class="chip chip-manual">Manual</span>` : '',
      `<span class="chip chip-task">${summary.tasks} tasks</span>`,
      `<span class="chip chip-event">${summary.events} events</span>`,
    ].join('');

    return `
<div class="summary-card">
  <div class="summary-title">✓ PoC ready</div>
  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-key">Company</div>
      <div class="summary-val">${esc(prospect.company)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-key">Network URL</div>
      <div class="summary-val"><a href="${url}" target="_blank" rel="noopener">${url}</a></div>
    </div>
    <div class="summary-item">
      <div class="summary-key">Scope ID</div>
      <div class="summary-val">${esc(prospect.scopeId)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-key">Admin invited</div>
      <div class="summary-val">${esc(prospect.email || '—')}</div>
    </div>
  </div>
  <div class="chips" style="margin-top:14px">${chips}</div>
</div>
<div class="btn-row">
  <button class="btn btn-primary" onclick="App.startNew()">＋ New PoC</button>
  <button class="btn btn-ghost" onclick="App.showView('history', null)">View history</button>
</div>`;
  }

  /* ── History view ────────────────────────────────────────── */

  function history(records) {
    if (!records.length) {
      return `
<div class="content-inner">
  <div class="step-header">
    <div class="step-title">History</div>
    <div class="step-sub">PoCs you've built with this tool.</div>
  </div>
  <div class="empty-state">
    <div class="empty-icon">◷</div>
    <div class="empty-msg">No PoCs yet. Start one from New PoC.</div>
  </div>
</div>`;
    }

    const rows = records.map(r => `
      <tr>
        <td style="font-weight:500;color:var(--ink)">${esc(r.company)}</td>
        <td>${esc(r.industry || '—')}</td>
        <td style="font-family:var(--mono);font-size:12px">${esc(r.scopeId || '—')}</td>
        <td>${esc(r.email || '—')}</td>
        <td>${formatDate(r.createdAt)}</td>
        <td><span class="pill pill-active">● Active</span></td>
        <td><button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="App.deleteRecord(${r.id})">Delete</button></td>
      </tr>`).join('');

    return `
<div class="content-inner">
  <div class="step-header">
    <div class="step-title">History</div>
    <div class="step-sub">${records.length} PoC${records.length !== 1 ? 's' : ''} built.</div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Company</th><th>Industry</th><th>Scope ID</th>
        <th>Admin</th><th>Created</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
  }

  /* ── Settings view ───────────────────────────────────────── */

  function settings() {
    const status = Auth.tokenStatus();
    const statusClass = status.state === 'ok' ? 'token-ok' : 'token-warn';
    return `
<div class="content-inner">
  <div class="step-header">
    <div class="step-title">Settings</div>
    <div class="step-sub">Credentials are kept in your browser session only — never sent anywhere except Zoho and Anthropic.</div>
  </div>

  <div class="section-label">Anthropic</div>
  <div class="form-grid" style="max-width:500px">
    <div class="field form-full">
      <label>API key</label>
      <input id="s-anthropic" type="password" placeholder="sk-ant-..." />
      <div class="field-hint">Used to call Claude for content generation.</div>
    </div>
  </div>

  <div class="section-label" style="margin-top:20px">Zoho Connect OAuth</div>
  <div class="alert alert-info" style="max-width:500px;margin-bottom:12px">
    Access tokens expire every hour. Add your Refresh Token + Client credentials to enable auto-refresh — no manual token pasting needed after that.
  </div>
  <div class="form-grid" style="max-width:500px">
    <div class="field form-full">
      <label>Access token</label>
      <input id="s-token" type="password" placeholder="1000.xxxxx..." />
      <div class="token-status ${statusClass}">
        <div class="token-dot"></div> ${esc(status.label)}
      </div>
    </div>
    <div class="field form-full">
      <label>Refresh token <span style="font-weight:400;color:var(--ink-3)">(enables auto-refresh)</span></label>
      <input id="s-refresh" type="password" placeholder="1000.xxxxx..." />
    </div>
    <div class="field">
      <label>Client ID</label>
      <input id="s-clientid" type="text" placeholder="1000.XXXX..." />
    </div>
    <div class="field">
      <label>Client secret</label>
      <input id="s-clientsecret" type="password" placeholder="..." />
    </div>
    <div class="field form-full">
      <label>Data centre</label>
      <select id="s-dc">
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
  <div class="section-label">How to get your tokens</div>
  <p style="font-size:12px;color:var(--ink-2);line-height:1.8;max-width:500px">
    1. Go to <a href="https://api-console.zoho.in" target="_blank" style="color:var(--accent)">api-console.zoho.in</a> → Add Client → Self Client.<br>
    2. Generate a grant token with the scopes listed in step 2 of the PoC builder.<br>
    3. Exchange for access + refresh tokens via the token endpoint.<br>
    4. Paste both here. The refresh token doesn't expire — you only do this once.
  </p>
</div>`;
  }

  /* ── Utilities ───────────────────────────────────────────── */

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
    catch { return '—'; }
  }

  return { newPoc, step0, step1, step2_idle, step2_loading, step2_done, step3_idle, step3_running, step3_done, history, settings };
})();
