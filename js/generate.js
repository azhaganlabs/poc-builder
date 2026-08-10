/**
 * generate.js
 * Calls the Anthropic Claude API to generate contextual PoC content.
 * Falls back to demo mode if no API key is present.
 */

const Generate = (() => {

  /**
   * Main entry point.
   * @param {object} prospect - form data
   * @param {function} onLog - logging callback(msg, cls)
   * @returns {Promise<object>} structured content JSON
   */
  async function run(prospect, onLog) {
    const { anthropic } = Storage.getCreds();

    onLog('Building prompt from prospect context...', 'log-dim');

    const prompt = buildPrompt(prospect);

    if (anthropic && anthropic.startsWith('sk-ant')) {
      return await callClaudeAPI(prompt, onLog, anthropic);
    } else {
      onLog('No Anthropic API key found — running in demo mode.', 'log-dim');
      onLog('Add your key in Settings for live generation.', 'log-dim');
      await sleep(1200);
      return demoContent(prospect);
    }
  }

  async function callClaudeAPI(prompt, onLog, apiKey) {
    onLog('Sending to claude-sonnet-4-6...', 'log-info');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Claude API error ${response.status}: ${err?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    onLog('Parsing response...', 'log-dim');
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(clean);
    } catch {
      throw new Error('Claude returned malformed JSON. Try regenerating.');
    }
  }

  function buildPrompt(p) {
    return `You are a Zoho Connect presales expert building a PoC demo environment.

Generate deeply contextual content for a Zoho Connect PoC for this prospect:

Company: ${p.company}
Industry: ${p.industry}
Location: ${p.location}
Size: ${p.size}
Use case: ${p.usecase}
Key teams: ${p.depts}

Return ONLY a valid JSON object with this exact structure. Every piece of content must feel completely native to ${p.company} — real industry terminology, plausible scenarios, language employees at this company would actually use. Zero generic filler.

{
  "groups": [
    { "name": "string", "description": "string", "visibility": "open" }
  ],
  "posts": [
    { "group": "exact group name", "type": "announcement|conversation|question", "content": "2-4 realistic sentences", "pinned": true }
  ],
  "manual": {
    "name": "string",
    "description": "string",
    "articles": [
      { "title": "string", "summary": "2-3 sentences on what this article covers" }
    ]
  },
  "taskBoard": {
    "name": "string",
    "sections": ["To Do", "In Progress", "Done"],
    "tasks": [
      { "title": "string", "section": "To Do|In Progress|Done", "description": "brief context" }
    ]
  },
  "events": [
    { "title": "string", "description": "string", "type": "meeting|training|all-hands|review" }
  ]
}

Rules:
- 4–6 groups (match the teams provided)
- 6–8 posts spread across groups, at least 2 pinned announcements
- 1 manual with 4–5 articles relevant to their operations
- 1 task board, 6–8 tasks spread across sections
- 3–4 upcoming events
- Every word must feel like it could ONLY be for ${p.company}

Respond with only the JSON, no preamble or explanation.`;
  }

  /* ── Demo content (no API key) ───────────────────────────── */

  function demoContent(p) {
    const deptList = p.depts
      ? p.depts.split(',').map(d => d.trim()).filter(Boolean)
      : ['Field Sales', 'Operations', 'HR', 'Management'];

    const groups = deptList.slice(0, 5).map((d, i) => ({
      name: d,
      description: `Collaboration hub for the ${d} team at ${p.company}.`,
      visibility: i === 0 ? 'private' : 'open',
    }));

    return {
      groups,
      posts: [
        { group: groups[0].name, type: 'announcement', content: `Welcome to ${p.company} Connect — our official internal collaboration platform. All team updates, announcements, and discussions now happen here. Please bookmark this and check daily.`, pinned: true },
        { group: groups[0].name, type: 'conversation', content: `Q3 targets are now live in the shared tracker. All regional leads — please update your numbers every Monday before 10am so we have visibility before the weekly sync.`, pinned: false },
        { group: groups[1]?.name || groups[0].name, type: 'announcement', content: `Updated SOP for ${groups[1]?.name || 'Operations'} coordination is now published in the Manuals section. Please review and acknowledge by end of week.`, pinned: true },
        { group: groups[1]?.name || groups[0].name, type: 'question', content: `Has anyone dealt with the new compliance requirements from the northern region? Looking for a template or a contact who's already filed this round.`, pinned: false },
        { group: groups[2]?.name || groups[0].name, type: 'announcement', content: `Annual performance review cycle opens Monday. All managers — please ensure team goal sheets are updated before the review window starts.`, pinned: false },
        { group: groups[0].name, type: 'conversation', content: `Sharing the deck from last week's regional review. Key focus areas: push presence in tier-2 markets, activate the new SKU in key accounts, and flag any distributor issues to your area lead directly.`, pinned: false },
      ],
      manual: {
        name: `${p.company} Operations Handbook`,
        description: `Central knowledge base for all ${p.company} staff — SOPs, policies, guides, and escalation contacts.`,
        articles: [
          { title: 'Field reporting process', summary: 'Step-by-step guide for daily and weekly reporting. Covers tools, submission timelines, and how to flag exceptions.' },
          { title: 'Onboarding checklist — new joiners', summary: "What to do in your first 30 days. System access, mandatory trainings, team introductions, and who to shadow." },
          { title: 'Leave and attendance policy', summary: 'Types of leave, application process, attendance rules for field staff, and WFH guidelines for office roles.' },
          { title: 'Escalation matrix', summary: 'Who to contact for what — sales escalations, logistics issues, IT access, and HR concerns.' },
          { title: 'Distributor/partner onboarding', summary: 'End-to-end checklist for onboarding a new partner. Documentation, system registration, and first-order coordination.' },
        ],
      },
      taskBoard: {
        name: `${p.company} — Platform Rollout`,
        sections: ['To Do', 'In Progress', 'Done'],
        tasks: [
          { title: 'Map existing groups to Connect channels', section: 'Done', description: 'Audit all active WhatsApp/email groups and map them to Connect groups' },
          { title: `Run pilot with ${deptList[0]} team`, section: 'Done', description: '2-week pilot completed — feedback collected and incorporated' },
          { title: 'Upload all SOPs to Manuals', section: 'In Progress', description: 'Transfer existing SOPs from shared drives to the Connect knowledge base' },
          { title: 'Train area managers', section: 'In Progress', description: 'Run 45-min sessions for all area managers before wider rollout' },
          { title: 'Configure mobile notifications', section: 'To Do', description: 'Set defaults so field staff get mobile alerts for important announcements only' },
          { title: 'Integrate CRM for lead updates', section: 'To Do', description: 'Bridge Zoho CRM deal updates into the Sales group feed automatically' },
          { title: 'Full org rollout', section: 'To Do', description: 'All-hands launch with leadership walkthrough and open Q&A' },
        ],
      },
      events: [
        { title: `${p.company} Connect — All-Hands Launch`, description: `Official platform launch for all staff. Leadership walkthrough and live Q&A.`, type: 'all-hands' },
        { title: `Manager Training — ${deptList[0]}`, description: `Hands-on session for team leads. Covers group admin, posting, and member management.`, type: 'training' },
        { title: 'Q3 Business Review', description: 'Quarterly review — regional heads present performance and targets.', type: 'review' },
        { title: 'New Joiner Onboarding — Connect walkthrough', description: 'Platform orientation for all new joiners this month.', type: 'training' },
      ],
    };
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { run };
})();
