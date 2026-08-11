# Zoho Connect · PoC Builder v2

Automates a full Zoho Connect PoC setup — content generation to deployment — in minutes.

## New in v2
- **PoC Health Score** — 0–100 score after deploy, graded on content richness
- **Handover brief** — fill in username/password, export a clean PDF to share with the prospect
- **Live Connect mockup** — animated skeleton preview that fills in as Claude generates
- **Content tone selector** — Formal / Operational / Casual, with tooltips
- **Duplicate & Adapt** — clone a past PoC from History for a similar prospect
- **Estimated time** — countdown before and during deploy
- **State tracking** — deploy manifest persists per network; failed runs resume from last checkpoint
- **Per-step retry** — each API call retries up to 2× with backoff before failing gracefully
- **Content validation** — auto-truncates oversized fields, flags empty content before deploy
- **OAuth auto-refresh** — token lifecycle fully handled; no manual re-pasting

## Deploy to GitHub Pages

```bash
# From inside the poc-builder folder:
git init
git add .
git commit -m "PoC Builder v2"
git remote add origin https://github.com/YOUR_USERNAME/poc-builder.git
git push -u origin main
```

Then: repo → Settings → Pages → deploy from `main` branch / root.

Live at: `https://YOUR_USERNAME.github.io/poc-builder/`

## Update your existing deployment

```bash
git add .
git commit -m "Upgrade to v2"
git push
```

GitHub Pages redeploys in ~1 minute.

## File structure

```
poc-builder/
├── index.html
├── css/app.css
└── js/
    ├── particles.js   # Animated background
    ├── storage.js     # localStorage history + sessionStorage creds + deploy manifest
    ├── auth.js        # OAuth token lifecycle, auto-refresh
    ├── validate.js    # Content validation + health score calculation
    ├── generate.js    # Claude API + live preview updates
    ├── deploy.js      # State-tracked Connect API deployment with retry
    ├── pdf.js         # jsPDF handover brief export
    ├── views.js       # All HTML templates
    └── app.js         # Main controller
```
