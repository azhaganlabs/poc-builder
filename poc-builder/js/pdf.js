/**
 * pdf.js
 * Exports the handover brief as a clean PDF using jsPDF.
 */
const PDF = (() => {

  function exportHandover(data) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) { alert('PDF library not loaded. Please check your internet connection.'); return; }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210; const pad = 20;
    let y = pad;

    // Header band
    doc.setFillColor(107, 31, 58);
    doc.rect(0, 0, W, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Zoho Connect · PoC Handover Brief', pad, 16);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Prepared by Zoho Connect Presales · ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pad, 26);
    doc.text(`Confidential — For ${data.company} internal use`, pad, 33);

    y = 50;
    doc.setTextColor(18, 16, 14);

    // Section: Prospect
    section(doc, 'PROSPECT DETAILS', y); y += 8;
    row(doc, 'Company',  data.company,  pad, y); y += 7;
    row(doc, 'Industry', data.industry, pad, y); y += 7;
    row(doc, 'Use case', data.usecase,  pad, y, true); y += 16;

    // Section: Network
    section(doc, 'NETWORK ACCESS', y); y += 8;
    row(doc, 'Network URL', data.networkUrl, pad, y); y += 7;

    // Credentials box
    doc.setFillColor(247, 240, 233);
    doc.roundedRect(pad, y, W - pad*2, 26, 3, 3, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 31, 58);
    doc.text('LOGIN CREDENTIALS', pad + 5, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(18,16,14);
    doc.text(`Username / Email:  ${data.username || '—'}`, pad + 5, y + 14);
    doc.text(`Password:  ${data.password || '—'}`, pad + 5, y + 21);
    y += 32;

    // Section: What's inside
    section(doc, "WHAT'S INSIDE YOUR DEMO NETWORK", y); y += 8;
    const inside = [
      `${data.groups?.length || 0} Groups/Channels — matching your team structure`,
      `${data.posts || 0} Sample posts across groups, including pinned announcements`,
      `Knowledge Manual: "${data.manualName || 'Operations Handbook'}" with ${data.articles || 0} articles`,
      `Task board with ${data.tasks || 0} tasks across To Do / In Progress / Done`,
      `${data.events || 0} Upcoming events added to the network calendar`,
    ];
    doc.setFontSize(10);
    inside.forEach(item => {
      doc.setFillColor(107,31,58); doc.circle(pad + 2, y - 1.5, 1, 'F');
      doc.setTextColor(18,16,14); doc.text(item, pad + 6, y);
      y += 7;
    });
    y += 4;

    // Section: Talking points
    section(doc, 'SUGGESTED TALKING POINTS', y); y += 8;
    const points = [
      `Show the ${data.groups?.[0] || 'Field Sales'} group — highlight pinned announcements and how structured comms replaces WhatsApp.`,
      'Open Manuals — demonstrate how SOPs, policies and guides live in one searchable place.',
      'Walk through the Task board — show real workflows instead of email chains.',
      'Calendar events — show upcoming all-hands and training sessions already in the network.',
      'On mobile — show the app notification experience for field staff.',
    ];
    doc.setFontSize(10);
    points.forEach(pt => {
      const lines = doc.splitTextToSize(pt, W - pad*2 - 10);
      doc.setFillColor(201,150,42); doc.circle(pad + 2, y - 1.5, 1.2, 'F');
      doc.setTextColor(18,16,14); doc.text(lines, pad + 6, y);
      y += lines.length * 6 + 2;
    });

    // Footer
    y = 280;
    doc.setFillColor(245,240,235); doc.rect(0, y, W, 17, 'F');
    doc.setFontSize(8); doc.setTextColor(130,120,110);
    doc.text('Zoho Connect · Presales Engineering · This document is confidential.', pad, y + 7);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pad, y + 12);

    doc.save(`${data.company.replace(/\s+/g,'-')}-Connect-PoC-Brief.pdf`);
  }

  function section(doc, title, y) {
    doc.setFillColor(247,240,233);
    doc.rect(20, y - 4, 170, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(107,31,58);
    doc.text(title, 22, y);
    doc.setFont('helvetica', 'normal');
  }

  function row(doc, key, val, x, y, wrap) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80,70,60);
    doc.text(key + ':', x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(18,16,14);
    if (wrap) {
      const lines = doc.splitTextToSize(val || '—', 140);
      doc.text(lines, x + 35, y);
    } else {
      doc.text(val || '—', x + 35, y);
    }
  }

  return { exportHandover };
})();
