# Zoho Connect · PoC Builder

Automates the setup of a Zoho Connect demo environment for a prospect — from content generation to deployment — in minutes instead of days.

## What it does

1. Takes a prospect's company name, industry, use case, and key teams
2. Claude generates contextual groups, posts, a knowledge manual, task board, and events
3. You review the content, then the agent pushes it all to a pre-created Connect network via API
4. The prospect is invited as admin and handed the network URL

## Deploy to GitHub Pages (10 minutes)

### Step 1 — Create a GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `poc-builder` (or anything you like)
3. Set it to **Private** (recommended — your team only)
4. Click **Create repository**

### Step 2 — Push this code

```bash
cd poc-builder
git init
git add .
git commit -m "Initial PoC builder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/poc-builder.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**

Your app will be live at:
```
https://YOUR_USERNAME.github.io/poc-builder/
```

GitHub sends you an email when it's ready (usually under 2 minutes).

### Step 4 — Share with your team

Send them the URL. They open it in any browser — no install needed.

> **Private repo + GitHub Pages:** Pages on private repos requires GitHub Pro/Team. If you're on the free plan, either make the repo public or use [Netlify](https://netlify.com) (drag-and-drop deploy, also free).

---

## First-time setup (for each team member)

1. Open the app URL
2. Go to **Settings** in the sidebar
3. Paste your **Anthropic API key** (`sk-ant-...`)
4. Paste your **Zoho OAuth access token** and optionally the **refresh token + client credentials** for auto-refresh
5. Select your **data centre** (India by default)
6. Click **Save for this session**

Credentials are stored in `sessionStorage` only — they clear when the browser tab closes. Nothing is ever sent to GitHub or any third party except Anthropic and Zoho directly.

---

## OAuth token setup (Zoho)

To get your access + refresh tokens:

1. Go to [api-console.zoho.in](https://api-console.zoho.in) → **Add Client** → **Self Client**
2. Generate a grant token with these scopes:
   ```
   ZohoPulse.feedList.ALL,ZohoPulse.grouplist.ALL,ZohoPulse.networklist.ALL,
   ZohoPulse.networkAdmin.ALL,ZohoPulse.pagelist.ALL,ZohoPulse.tasks.ALL,
   ZohoPulse.events.ALL,ZohoPulse.userDetail.ALL
   ```
3. Exchange for tokens via:
   ```
   POST https://accounts.zoho.in/oauth/v2/token
   grant_type=authorization_code&code=YOUR_GRANT&client_id=...&client_secret=...&redirect_uri=...
   ```
4. You'll get an `access_token` (1 hour) and a `refresh_token` (permanent until revoked)
5. Paste both in Settings. Auto-refresh handles expiry from then on.

---

## Project structure

```
poc-builder/
├── index.html          # Entry point
├── css/
│   └── app.css         # All styles
├── js/
│   ├── storage.js      # localStorage/sessionStorage — history and credentials
│   ├── auth.js         # OAuth token lifecycle and auto-refresh
│   ├── generate.js     # Claude API call and demo-mode fallback
│   ├── deploy.js       # Zoho Connect REST API deployment
│   ├── views.js        # HTML templates for each screen
│   └── app.js          # Main controller and state
└── README.md
```

## Updating

```bash
git add .
git commit -m "your change"
git push
```

GitHub Pages redeploys automatically within ~1 minute.
