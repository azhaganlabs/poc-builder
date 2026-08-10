/**
 * deploy.js
 * Pushes generated content to Zoho Connect via REST API.
 * Auto-refreshes OAuth token if expired before starting.
 */

const Deploy = (() => {

  /**
   * Main deploy runner.
   * @param {object} content  - generated content from Generate.run()
   * @param {string} scopeId  - Connect network scope ID
   * @param {string} email    - prospect admin email
   * @param {function} onLog  - logging callback(msg, cssClass)
   * @returns {Promise<object>} summary of what was created
   */
  async function run(content, scopeId, email, onLog) {
    const log = (msg, cls = '') => onLog(msg, cls);

    // Step 0 — get a valid token (auto-refreshes if needed)
    log('Validating OAuth token...', 'log-dim');
    const token = await Auth.getValidToken((msg) => log(msg, 'log-info'));
    const base = Auth.connectBase();
    const headers = { Authorization: `Zoho-oauthtoken ${token}` };

    log(`Connected · ${base}`, 'log-dim');
    log(`Target network: scopeID ${scopeId}`, 'log-dim');

    const summary = { groups: [], posts: 0, manualId: null, boardId: null, tasks: 0, events: 0 };
    const groupIds = {}; // name → id

    // ── Groups ────────────────────────────────────────────────
    log(`Creating ${content.groups.length} groups...`, 'log-info');
    for (const g of content.groups) {
      await sleep(350);
      try {
        const r = await api('POST', `${base}/addGroup`, headers, {
          scopeID: scopeId,
          name: g.name,
          description: g.description,
          type: g.visibility === 'private' ? 'private' : 'open',
        });
        const id = r?.addGroup?.groupID;
        groupIds[g.name] = id;
        summary.groups.push(g.name);
        log(`✓ Group: "${g.name}"`, 'log-ok');
      } catch (e) {
        log(`⚠ Group "${g.name}" failed: ${e.message}`, 'log-err');
      }
    }

    // ── Posts ─────────────────────────────────────────────────
    log(`Seeding ${content.posts.length} posts...`, 'log-info');
    const typeMap = { announcement: 2, question: 3, conversation: 1 };
    for (const p of content.posts) {
      await sleep(450);
      const groupId = groupIds[p.group] || Object.values(groupIds)[0];
      if (!groupId) { log(`⚠ No group ID for "${p.group}" — skipping post`, 'log-err'); continue; }
      try {
        const r = await api('POST', `${base}/v2/addStream`, headers, {
          scopeID: scopeId,
          groupID: groupId,
          type: typeMap[p.type] ?? 1,
          content: p.content,
        });
        const streamId = r?.addStream?.streamID;
        summary.posts++;
        log(`✓ Post → "${p.group}" [${p.type}]`, 'log-ok');

        // Pin if requested
        if (p.pinned && streamId) {
          await sleep(200);
          await api('POST', `${base}/pinPost`, headers, { scopeID: scopeId, streamID: streamId });
          log(`  📌 Pinned`, 'log-dim');
        }
      } catch (e) {
        log(`⚠ Post failed: ${e.message}`, 'log-err');
      }
    }

    // ── Manual ────────────────────────────────────────────────
    log(`Creating manual: "${content.manual.name}"...`, 'log-info');
    await sleep(400);
    try {
      const r = await api('POST', `${base}/addPage`, headers, {
        scopeID: scopeId,
        name: content.manual.name,
        description: content.manual.description,
      });
      summary.manualId = r?.addPage?.pageID;
      log(`✓ Manual created`, 'log-ok');

      // Articles — publish each as a chapter stub
      for (const article of content.manual.articles) {
        await sleep(350);
        try {
          await api('POST', `${base}/publishArticle`, headers, {
            scopeID: scopeId,
            pageID: summary.manualId,
            title: article.title,
            content: `<p>${article.summary}</p>`,
          });
          log(`  ✓ Article: "${article.title}"`, 'log-ok');
        } catch (e) {
          log(`  ⚠ Article "${article.title}": ${e.message}`, 'log-err');
        }
      }
    } catch (e) {
      log(`⚠ Manual failed: ${e.message}`, 'log-err');
    }

    // ── Task board ────────────────────────────────────────────
    log(`Creating task board: "${content.taskBoard.name}"...`, 'log-info');
    await sleep(400);
    try {
      const r = await api('POST', `${base}/addBoard`, headers, {
        scopeID: scopeId,
        name: content.taskBoard.name,
      });
      summary.boardId = r?.addBoard?.boardID;
      log(`✓ Board created`, 'log-ok');

      // Sections
      const sectionIds = {};
      for (const sec of content.taskBoard.sections) {
        await sleep(300);
        try {
          const sr = await api('POST', `${base}/addBoardSection`, headers, {
            scopeID: scopeId,
            boardID: summary.boardId,
            name: sec,
          });
          sectionIds[sec] = sr?.addBoardSection?.sectionID;
          log(`  ✓ Section: "${sec}"`, 'log-ok');
        } catch (e) {
          log(`  ⚠ Section "${sec}": ${e.message}`, 'log-err');
        }
      }

      // Tasks
      for (const task of content.taskBoard.tasks) {
        await sleep(320);
        const sectionId = sectionIds[task.section] || Object.values(sectionIds)[0];
        try {
          await api('POST', `${base}/addTask`, headers, {
            scopeID: scopeId,
            boardID: summary.boardId,
            sectionID: sectionId,
            name: task.title,
            description: task.description,
          });
          summary.tasks++;
          log(`  ✓ Task: "${task.title}"`, 'log-ok');
        } catch (e) {
          log(`  ⚠ Task "${task.title}": ${e.message}`, 'log-err');
        }
      }
    } catch (e) {
      log(`⚠ Task board failed: ${e.message}`, 'log-err');
    }

    // ── Events ────────────────────────────────────────────────
    log(`Creating ${content.events.length} events...`, 'log-info');
    const now = Date.now();
    for (let i = 0; i < content.events.length; i++) {
      const ev = content.events[i];
      await sleep(380);
      const startMs = now + (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const endMs   = startMs + 2 * 60 * 60 * 1000;
      try {
        await api('POST', `${base}/addEvent`, headers, {
          scopeID: scopeId,
          title: ev.title,
          description: ev.description,
          startTime: startMs,
          endTime: endMs,
        });
        summary.events++;
        log(`✓ Event: "${ev.title}"`, 'log-ok');
      } catch (e) {
        log(`⚠ Event "${ev.title}": ${e.message}`, 'log-err');
      }
    }

    // ── Module order ──────────────────────────────────────────
    log('Setting navigation order...', 'log-dim');
    await sleep(350);
    try {
      await api('POST', `${base}/updateAppsOrder`, headers, {
        scopeID: scopeId,
        'appType[]': ['feeds', 'groups', 'task', 'manuals', 'events', 'blog'],
      });
      log('✓ Navigation configured', 'log-ok');
    } catch (e) {
      log(`⚠ Nav order: ${e.message}`, 'log-err');
    }

    // ── Invite prospect admin ─────────────────────────────────
    if (email) {
      log(`Inviting ${email} as admin...`, 'log-info');
      await sleep(500);
      try {
        await api('POST', `${base}/v1/inviteUsersToNetwork`, headers, {
          scopeID: scopeId,
          emailIds: email,
          memberType: 'MEMBER',
        });
        log(`✓ Admin invite sent to ${email}`, 'log-ok');
      } catch (e) {
        log(`⚠ Invite failed: ${e.message}`, 'log-err');
      }
    }

    return summary;
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  async function api(method, url, headers, params = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach(item => qs.append(k, item));
      else qs.append(k, v);
    }

    const fullUrl = method === 'GET'
      ? `${url}?${qs}`
      : url;

    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...headers,
        ...(method !== 'GET' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      ...(method !== 'GET' ? { body: qs.toString() } : {}),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { run };
})();
