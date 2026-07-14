# 🚂 Deploying Kalvi on Railway — Step-by-Step Guide

Railway deploys the **backend** and **frontend** as two separate services from
the same GitHub repo. Both services read the same `Akz06/Kalvi` repo but each
points to its own sub-directory.

---

## Why Two Services?

```
Akz06/Kalvi (GitHub repo)
├── backend/     ← Service 1: Express API + Prisma + PostgreSQL
└── frontend/    ← Service 2: React + Vite (static site)
```

The root `package.json` is an npm workspace helper — Railway should never
deploy it directly. Always set **Root Directory** when creating each service.

---

## Step 1 — Create a Railway Project

1. Go to [railway.app](https://railway.app) → Sign in with GitHub (`Akz06`)
2. Click **"New Project"**
3. Choose **"Empty project"** (NOT "Deploy from GitHub" at the root level)

---

## Step 2 — Add a PostgreSQL Database

Inside your new project:

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway provisions it instantly
3. Click the PostgreSQL service → **"Connect"** tab → copy the
   **`DATABASE_URL`** (you'll need it in Step 3)

It looks like:
```
postgresql://postgres:AbCxYz@monorail.proxy.rlwy.net:12345/railway
```

---

## Step 3 — Add the Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select **`Akz06/Kalvi`**
3. **⚠️ IMPORTANT — set Root Directory:**
   - Click **"Configure"** → set **Root Directory** = **`backend`**
   - This tells Railway to only look inside `backend/` for the build
4. Click **"Deploy"**

### Set these environment variables (Backend → Variables tab):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | *(paste from Step 2)* | Auto-injected if you link the Postgres service |
| `JWT_SECRET` | *(generate below)* | Must be ≥ 32 random chars |
| `CLIENT_ORIGIN` | `https://YOUR-FRONTEND.up.railway.app` | Set after Step 4 |
| `NODE_ENV` | `production` | |
| `JWT_EXPIRES_IN` | `15m` | Short-lived access tokens |
| `PORT` | *(leave empty — Railway injects it)* | |

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Link PostgreSQL to Backend (easiest way to inject DATABASE_URL):
1. Go to the Backend service → **"Variables"** tab
2. Click **"+ New Variable"** → choose **"Reference Another Service"**
3. Select PostgreSQL → select `DATABASE_URL`
4. Railway now auto-injects `DATABASE_URL` into every deploy ✅

### What Railway runs (from `backend/railway.toml`):
```
Build:  npm ci && npx prisma generate && npm run build
Start:  npx prisma migrate deploy && node dist/server.js
```
Prisma migrations run automatically on every deploy — zero downtime. ✅

---

## Step 4 — Add the Frontend Service

1. Inside the same Railway project → **"+ New"** → **"GitHub Repo"**
2. Select **`Akz06/Kalvi`** again
3. **⚠️ IMPORTANT — set Root Directory:**
   - Click **"Configure"** → set **Root Directory** = **`frontend`**
4. Click **"Deploy"**

### Set these environment variables (Frontend → Variables tab):

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://YOUR-BACKEND.up.railway.app` | Your backend Railway URL from Step 3 |
| `PORT` | *(leave empty — Railway injects it)* | |

> **IMPORTANT:** `VITE_API_URL` must be set **before** the first build.
> Vite bakes it into the static bundle at build time.
> If you change it, redeploy the frontend.

### What Railway runs (from `frontend/railway.toml`):
```
Build:  npm ci && npm run build
Start:  npx serve -s dist -l ${PORT:-3000}
```

---

## Step 5 — Seed the Database (First deploy only)

After the backend deploys successfully, open the Railway **shell** for the
backend service and run:

```bash
cd backend && npm run db:seed
```

This creates two demo schools:
- `greenwood` school — admin@greenwood.kalvi.app / Admin@123
- `sunrise` school — admin@sunrise.kalvi.app / Admin@123

---

## Step 6 — Update CLIENT_ORIGIN

Once both services are deployed and you have their URLs:

1. Go to **Backend service → Variables**
2. Update `CLIENT_ORIGIN` = `https://YOUR-FRONTEND.up.railway.app`
3. Railway auto-redeploys the backend

---

## Architecture Diagram

```
Browser
  │
  ├─── HTTPS ──► Frontend (Railway service)
  │               Root Dir: frontend/
  │               Serves: React SPA (static files via `serve`)
  │               Port: Railway-injected ($PORT)
  │
  └─── HTTPS ──► Backend (Railway service)
                  Root Dir: backend/
                  Runs: Express API on $PORT
                  Connects to: PostgreSQL (Railway database)
                  Runs on deploy: prisma migrate deploy
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Railway shows 1 service | Deployed at repo root | Delete and re-add with Root Directory set |
| Build fails: "schema not found" | Wrong root directory | Confirm Root Directory = `backend` |
| `VITE_API_URL` not working | Baked at build time | Set the variable, then trigger a redeploy |
| `prisma migrate deploy` fails | DATABASE_URL missing | Link the PostgreSQL service in Variables |
| CORS error in browser | `CLIENT_ORIGIN` mismatch | Update `CLIENT_ORIGIN` in backend variables |
| 404 on page refresh (frontend) | SPA routing | `serve -s` handles this — already configured |

---

## Environment Variable Checklist

### Backend service
- [ ] `DATABASE_URL` — linked from PostgreSQL service
- [ ] `JWT_SECRET` — random 48-byte hex string
- [ ] `CLIENT_ORIGIN` — frontend Railway URL
- [ ] `NODE_ENV=production`
- [ ] `JWT_EXPIRES_IN=15m`

### Frontend service
- [ ] `VITE_API_URL` — backend Railway URL

---

## Custom Domain (optional)

1. Railway service → **"Settings"** → **"Custom Domain"**
2. Add your domain (e.g. `app.kalvi.school`)
3. Add the CNAME record Railway provides to your DNS
4. Update `CLIENT_ORIGIN` in the backend to match

---

*For questions, open an issue at https://github.com/Akz06/Kalvi/issues*
