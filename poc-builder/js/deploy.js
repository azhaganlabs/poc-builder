/**
 * deploy.js
 * State-tracked deployment with per-step retry and resume capability.
 *
 * Deploy manifest shape:
 * { groupIds: {name→id}, postsDone: n, manualId, boardId, sectionIds: {name→id},
 *   tasksDone: n, eventsDone: n, navDone: bool, steps: {groups,posts,manual,board,tasks,events,nav} }
 */
const Deploy = (() => {

  // ETA: rough seconds per API item
  const ETA_WEIGHTS = { group: 0.6, post: 0.7, article: 0.5, task: 0.5, event: 0.6, nav: 0.5 };

  function estimateSeconds(content) {
    return Math.ceil(
      (content.groups?.length || 0)           * ETA_WEIGHTS.group   +
      (content.posts?.length || 0)            * ETA_WEIGHTS.post    +
      (content.manual?.articles?.length || 0) * ETA_WEIGHTS.article +
      (content.taskBoard?.tasks?.length || 0) * ETA_WEIGHTS.task    +
      (content.events?.length || 0)           * ETA_WEIGHTS.event   +
      ETA_WEIGHTS.nav + 2
    );
  }

  async function run(content, scopeId, onLog) {
    const log = (msg, cls) => onLog(msg, cls);

    // Get valid token (auto-refreshes if expired)
    log('Validating OAuth token...', 'log-dim');
    const token = await Auth.getValidToken(onLog);
    const base  = Auth.connectBase();
    const h     = { Authorization: `Zoho-oauthtoken ${token}` };

    // Load or create manifest for resume support
    let mf = Storage.getManifest(scopeId) || {
      groupIds: {}, postsDone: 0, manualId: null,
      boardId: null, sectionIds: {}, tasksDone: 0,
      eventsDone: 0, navDone: false,
      steps: { groups: false, posts: false, manual: false, board: false, tasks: false, events: false, nav: false }
    };

    const saveState = () => Storage.saveManifest(scopeId, mf);

    // ── Groups ────────────────────────────────────────────────
    if (!mf.steps.groups) {
      log(`Creating ${content.groups.length} groups...`, 'log-info');
      for (const g of content.groups) {
        if (mf.groupIds[g.name]) { log(`↷ Group "${g.name}" already created`, 'log-dim'); continue; }
        const id = await retry(() => apiPost(`${base}/addGroup`, h, {
          scopeID: scopeId, name: g.name, description: g.description,
          type: g.visibility === 'private' ? 'private' : 'open',
        }), 2, log, `Group "${g.name}"`);
        mf.groupIds[g.name] = id?.addGroup?.groupID || null;
        log(`✓ Group: "${g.name}"`, 'log-ok');
        saveState();
        await sleep(300);
      }
      mf.steps.groups = true; saveState();
    } else { log('↷ Groups already created — skipping', 'log-dim'); }

    // ── Posts ─────────────────────────────────────────────────
    if (!mf.steps.posts) {
      const typeMap = { announcement: 2, question: 3, conversation: 1 };
      log(`Seeding ${content.posts.length} posts...`, 'log-info');
      for (let i = mf.postsDone; i < content.posts.length; i++) {
        const p = content.posts[i];
        const gid = mf.groupIds[p.group] || Object.values(mf.groupIds)[0];
        if (!gid) { log(`⚠ No group for "${p.group}"`, 'log-dim'); continue; }
        const r = await retry(() => apiPost(`${base}/v2/addStream`, h, {
          scopeID: scopeId, groupID: gid, type: typeMap[p.type] ?? 1, content: p.content,
        }), 2, log, `Post in "${p.group}"`);
        const sid = r?.addStream?.streamID;
        if (p.pinned && sid) {
          await sleep(200);
          await retry(() => apiPost(`${base}/pinPost`, h, { scopeID: scopeId, streamID: sid }), 1, log, 'Pin');
          log(`  📌 Pinned`, 'log-dim');
        }
        log(`✓ Post [${p.type}] → "${p.group}"`, 'log-ok');
        mf.postsDone = i + 1; saveState();
        await sleep(350);
      }
      mf.steps.posts = true; saveState();
    } else { log('↷ Posts already seeded — skipping', 'log-dim'); }

    // ── Manual ────────────────────────────────────────────────
    if (!mf.steps.manual) {
      log(`Creating manual: "${content.manual.name}"...`, 'log-info');
      const mr = await retry(() => apiPost(`${base}/addPage`, h, {
        scopeID: scopeId, name: content.manual.name, description: content.manual.description,
      }), 2, log, 'Manual');
      mf.manualId = mr?.addPage?.pageID;
      log(`✓ Manual created`, 'log-ok');
      saveState(); await sleep(300);

      for (const a of content.manual.articles) {
        if (!mf.manualId) break;
        await retry(() => apiPost(`${base}/publishArticle`, h, {
          scopeID: scopeId, pageID: mf.manualId, title: a.title, content: `<p>${a.summary}</p>`,
        }), 2, log, `Article "${a.title}"`);
        log(`  ✓ Article: "${a.title}"`, 'log-ok');
        await sleep(300);
      }
      mf.steps.manual = true; saveState();
    } else { log('↷ Manual already created — skipping', 'log-dim'); }

    // ── Task board ────────────────────────────────────────────
    if (!mf.steps.board) {
      log(`Creating task board: "${content.taskBoard.name}"...`, 'log-info');
      const br = await retry(() => apiPost(`${base}/addBoard`, h, {
        scopeID: scopeId, name: content.taskBoard.name,
      }), 2, log, 'Board');
      mf.boardId = br?.addBoard?.boardID;
      log(`✓ Board created`, 'log-ok');
      saveState(); await sleep(300);

      for (const sec of content.taskBoard.sections) {
        const sr = await retry(() => apiPost(`${base}/addBoardSection`, h, {
          scopeID: scopeId, boardID: mf.boardId, name: sec,
        }), 2, log, `Section "${sec}"`);
        mf.sectionIds[sec] = sr?.addBoardSection?.sectionID;
        log(`  ✓ Section: "${sec}"`, 'log-ok');
        saveState(); await sleep(250);
      }
      mf.steps.board = true; saveState();
    } else { log('↷ Board already created — skipping', 'log-dim'); }

    if (!mf.steps.tasks) {
      const tasks = content.taskBoard.tasks;
      for (let i = mf.tasksDone; i < tasks.length; i++) {
        const t = tasks[i];
        const sid = mf.sectionIds[t.section] || Object.values(mf.sectionIds)[0];
        await retry(() => apiPost(`${base}/addTask`, h, {
          scopeID: scopeId, boardID: mf.boardId, sectionID: sid, name: t.title, description: t.description,
        }), 2, log, `Task "${t.title}"`);
        log(`  ✓ Task: "${t.title}"`, 'log-ok');
        mf.tasksDone = i + 1; saveState(); await sleep(280);
      }
      mf.steps.tasks = true; saveState();
    } else { log('↷ Tasks already created — skipping', 'log-dim'); }

    // ── Events ────────────────────────────────────────────────
    if (!mf.steps.events) {
      log(`Creating ${content.events.length} events...`, 'log-info');
      const now = Date.now();
      for (let i = mf.eventsDone; i < content.events.length; i++) {
        const ev = content.events[i];
        const start = now + (i + 1) * 7 * 24 * 3600 * 1000;
        await retry(() => apiPost(`${base}/addEvent`, h, {
          scopeID: scopeId, title: ev.title, description: ev.description,
          startTime: start, endTime: start + 7200000,
        }), 2, log, `Event "${ev.title}"`);
        log(`✓ Event: "${ev.title}"`, 'log-ok');
        mf.eventsDone = i + 1; saveState(); await sleep(320);
      }
      mf.steps.events = true; saveState();
    } else { log('↷ Events already created — skipping', 'log-dim'); }

    // ── Navigation ────────────────────────────────────────────
    if (!mf.steps.nav) {
      log('Configuring navigation order...', 'log-dim');
      await apiPost(`${base}/updateAppsOrder`, h, {
        scopeID: scopeId, 'appType[]': ['feeds','groups','task','manuals','events','blog'],
      }).catch(() => {});
      log('✓ Navigation set', 'log-ok');
      mf.steps.nav = true; mf.navDone = true; saveState();
    }

    Storage.clearManifest(scopeId);

    return {
      groups:   Object.keys(mf.groupIds),
      posts:    mf.postsDone,
      manualId: mf.manualId,
      boardId:  mf.boardId,
      tasks:    mf.tasksDone,
      events:   mf.eventsDone,
    };
  }

  /* ── Retry wrapper ── */
  async function retry(fn, times, log, label) {
    for (let i = 0; i <= times; i++) {
      try { return await fn(); }
      catch (e) {
        if (i < times) {
          log?.(`  ↺ Retry ${i+1}: ${label}`, 'log-dim');
          await sleep(600 * (i + 1));
        } else {
          log?.(`  ⚠ ${label} failed after ${times+1} attempts: ${e.message}`, 'log-err');
          return null;
        }
      }
    }
  }

  /* ── API helper ── */
  async function apiPost(url, headers, params) {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach(i => body.append(k, i));
      else body.append(k, v);
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { run, estimateSeconds };
})();
