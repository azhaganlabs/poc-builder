const Generate = (() => {

  async function run(prospect, onLog, onPreview) {
    const { anthropic } = Storage.getCreds();
    onLog('Building prompt...', 'log-dim');
    const prompt = buildPrompt(prospect);

    let content;
    if (anthropic?.startsWith('sk-ant')) {
      content = await callClaude(prompt, onLog, anthropic, onPreview);
    } else {
      onLog('No API key — demo mode.', 'log-dim');
      content = await demoWithPreview(prospect, onPreview);
    }

    onLog('Validating content...', 'log-dim');
    const errors = Validate.content(content);
    if (errors.length) {
      errors.forEach(e => onLog(`⚠ ${e}`, 'log-dim'));
    }
    return content;
  }

  async function callClaude(prompt, onLog, key, onPreview) {
    onLog('Connecting to claude-sonnet-4-6...', 'log-info');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2800, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`Claude API ${r.status}: ${e?.error?.message || r.statusText}`);
    }
    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    onLog('Parsing response...', 'log-dim');
    const clean = text.replace(/```json|```/g, '').trim();
    let content;
    try { content = JSON.parse(clean); }
    catch { throw new Error('Malformed JSON from Claude. Try regenerating.'); }

    // Animate preview as we "reveal" content
    if (onPreview) {
      onPreview('groups', content.groups);
      await sleep(300);
      onPreview('posts', content.posts);
      await sleep(300);
      onPreview('manual', content.manual);
      await sleep(300);
      onPreview('tasks', content.taskBoard);
    }
    return content;
  }

  async function demoWithPreview(p, onPreview) {
    const content = demoContent(p);
    await sleep(800);
    if (onPreview) {
      onPreview('groups', content.groups);
      await sleep(500);
      onPreview('posts', content.posts);
      await sleep(500);
      onPreview('manual', content.manual);
      await sleep(500);
      onPreview('tasks', content.taskBoard);
    }
    await sleep(400);
    return content;
  }

  function buildPrompt(p) {
    const toneMap = {
      formal:     'Formal, enterprise-grade. Professional language, structured communication, no slang.',
      operational:'Operations-heavy. Focus on processes, SOPs, metrics, team coordination. Practical, direct.',
      casual:     'Warm and conversational. Friendly tone, inclusive, feels like a real team community.',
    };
    const toneInstruction = toneMap[p.tone] || toneMap.formal;

    return `You are a Zoho Connect presales expert.

Generate deeply contextual content for a Zoho Connect PoC for:

Company: ${p.company}
Industry: ${p.industry}
Location: ${p.location}
Size: ${p.size}
Use case: ${p.usecase}
Key teams: ${p.depts}
Content tone: ${toneInstruction}

Return ONLY valid JSON with this structure. Every word must feel native to ${p.company} — real industry terminology, plausible scenarios their employees would actually write. Zero generic filler.

{
  "groups": [{ "name": "string", "description": "string", "visibility": "open|private" }],
  "posts": [{ "group": "exact group name", "type": "announcement|conversation|question", "content": "2-4 sentences", "pinned": true|false }],
  "manual": { "name": "string", "description": "string", "articles": [{ "title": "string", "summary": "2-3 sentences" }] },
  "taskBoard": { "name": "string", "sections": ["To Do","In Progress","Done"], "tasks": [{ "title": "string", "section": "To Do|In Progress|Done", "description": "brief" }] },
  "events": [{ "title": "string", "description": "string", "type": "meeting|training|all-hands|review" }]
}

Rules: 4–6 groups · 6–8 posts (≥2 pinned) · 1 manual with 4–5 articles · 6–8 tasks across all 3 sections · 3–4 events
Respond with only the JSON.`;
  }

  function demoContent(p) {
    const depts = p.depts ? p.depts.split(',').map(d => d.trim()).filter(Boolean) : ['Field Sales','Operations','HR','Leadership'];
    const groups = depts.slice(0, 5).map((d, i) => ({ name: d, description: `Collaboration space for the ${d} team at ${p.company}.`, visibility: i === 0 ? 'private' : 'open' }));
    return {
      groups,
      posts: [
        { group: groups[0].name, type: 'announcement', content: `Welcome to ${p.company} Connect — our official internal collaboration platform. All announcements, team updates, and discussions now happen here. Please save this link and check in daily.`, pinned: true },
        { group: groups[0].name, type: 'conversation', content: `Q3 targets are live in the tracker. Regional leads — please update your numbers every Monday before 10am for the weekly sync.`, pinned: false },
        { group: groups[1]?.name || groups[0].name, type: 'announcement', content: `Updated SOP for ${groups[1]?.name || 'Operations'} coordination is published in Manuals. All team leads please review and acknowledge by Friday.`, pinned: true },
        { group: groups[1]?.name || groups[0].name, type: 'question', content: `Has anyone dealt with the new compliance requirements from the northern region? Looking for a template or a contact who's filed this round.`, pinned: false },
        { group: groups[2]?.name || groups[0].name, type: 'announcement', content: `Performance review cycle opens Monday. All managers — ensure team goal sheets are updated before the review window starts.`, pinned: false },
        { group: groups[0].name, type: 'conversation', content: `Sharing the deck from last week's regional review. Key focus: tier-2 markets, new SKU activation, and escalate distributor issues to your area lead directly.`, pinned: false },
      ],
      manual: {
        name: `${p.company} Operations Handbook`,
        description: `Central knowledge base for all ${p.company} staff — SOPs, policies, guides, and contacts.`,
        articles: [
          { title: 'Field reporting process', summary: 'Step-by-step guide for daily and weekly reporting. Covers tools, timelines, and how to flag exceptions.' },
          { title: 'New joiner onboarding', summary: "What to do in your first 30 days — system access, mandatory trainings, team introductions." },
          { title: 'Leave and attendance policy', summary: 'Leave types, application process, attendance rules for field staff and WFH for office roles.' },
          { title: 'Escalation matrix', summary: 'Who to contact for sales escalations, logistics, IT access, and HR concerns.' },
          { title: 'Partner onboarding checklist', summary: 'End-to-end checklist for onboarding a new partner — documentation, system registration, first order.' },
        ],
      },
      taskBoard: {
        name: `${p.company} — Connect Rollout`,
        sections: ['To Do', 'In Progress', 'Done'],
        tasks: [
          { title: 'Map existing channels to Connect groups', section: 'Done', description: 'Audit all WhatsApp/email groups and map to Connect groups' },
          { title: `Pilot with ${depts[0]} team`, section: 'Done', description: '2-week pilot completed — feedback incorporated' },
          { title: 'Upload SOPs to Manuals', section: 'In Progress', description: 'Transfer SOPs from shared drives to Connect knowledge base' },
          { title: 'Train area managers', section: 'In Progress', description: '45-min sessions for all managers before wider rollout' },
          { title: 'Configure mobile notifications', section: 'To Do', description: 'Set defaults so field staff get alerts for announcements only' },
          { title: 'CRM → Connect feed integration', section: 'To Do', description: 'Bridge Zoho CRM deal updates into the Sales group feed' },
          { title: 'Full org rollout', section: 'To Do', description: 'All-hands launch with leadership walkthrough and live Q&A' },
        ],
      },
      events: [
        { title: `${p.company} Connect — All-Hands Launch`, description: 'Official platform launch. Leadership walkthrough and open Q&A.', type: 'all-hands' },
        { title: `Manager Training — ${depts[0]}`, description: 'Hands-on session for team leads. Covers group admin, posting, member management.', type: 'training' },
        { title: 'Q3 Business Review', description: 'Quarterly review — regional heads present performance and targets.', type: 'review' },
        { title: 'New Joiner Connect Orientation', description: 'Platform walkthrough for all new joiners this month.', type: 'training' },
      ],
    };
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { run };
})();
