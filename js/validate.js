const Validate = (() => {
  const MAX_GROUP_NAME = 50;
  const MAX_POST_LEN   = 2000;

  function content(c) {
    const errors = [];
    if (!c.groups?.length)  errors.push('No groups generated.');
    if (!c.posts?.length)   errors.push('No posts generated.');
    if (!c.manual?.name)    errors.push('Manual has no name.');
    if (!c.taskBoard?.name) errors.push('Task board has no name.');
    if (!c.events?.length)  errors.push('No events generated.');

    c.groups?.forEach((g, i) => {
      if (!g.name?.trim()) errors.push(`Group ${i+1}: missing name.`);
      if (g.name?.length > MAX_GROUP_NAME)
        g.name = g.name.slice(0, MAX_GROUP_NAME); // auto-truncate
    });
    c.posts?.forEach((p, i) => {
      if (!p.content?.trim()) errors.push(`Post ${i+1}: empty content.`);
      if (p.content?.length > MAX_POST_LEN) p.content = p.content.slice(0, MAX_POST_LEN);
      if (!p.group) p.group = c.groups?.[0]?.name || '';
    });
    c.taskBoard?.tasks?.forEach((t, i) => {
      if (!t.title?.trim()) errors.push(`Task ${i+1}: missing title.`);
    });
    return errors;
  }

  function healthScore(c, deployResult) {
    if (!c) return { score: 0, grade: 'F', breakdown: [] };
    let score = 0;
    const breakdown = [];

    const g = Math.min(c.groups?.length || 0, 6);
    const gScore = Math.round((g / 6) * 25);
    score += gScore;
    breakdown.push({ label: `${g} groups`, pts: gScore, max: 25 });

    const posts = c.posts?.length || 0;
    const pins  = c.posts?.filter(p => p.pinned).length || 0;
    const pScore = Math.min(Math.round((posts / 8) * 20) + Math.min(pins * 5, 10), 30);
    score += pScore;
    breakdown.push({ label: `${posts} posts, ${pins} pinned`, pts: pScore, max: 30 });

    const arts = c.manual?.articles?.length || 0;
    const mScore = Math.round((Math.min(arts, 5) / 5) * 20);
    score += mScore;
    breakdown.push({ label: `${arts} manual articles`, pts: mScore, max: 20 });

    const tasks = c.taskBoard?.tasks?.length || 0;
    const spread = new Set(c.taskBoard?.tasks?.map(t => t.section)).size || 0;
    const tScore = Math.round((Math.min(tasks, 8) / 8) * 15) + (spread >= 3 ? 5 : 0);
    score += Math.min(tScore, 15);
    breakdown.push({ label: `${tasks} tasks`, pts: Math.min(tScore, 15), max: 15 });

    const ev = c.events?.length || 0;
    const eScore = Math.round((Math.min(ev, 4) / 4) * 10);
    score += eScore;
    breakdown.push({ label: `${ev} events`, pts: eScore, max: 10 });

    const grade =
      score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' :
      score >= 60 ? 'C'  : score >= 50 ? 'D' : 'F';

    return { score: Math.min(score, 100), grade, breakdown };
  }

  return { content, healthScore };
})();
