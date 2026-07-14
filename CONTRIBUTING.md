# Contributing to School ERP

Thank you for your interest in contributing! This document covers how to set up
the project locally, the branching model, and coding conventions.

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 9.x |
| Git | 2.x |

> **Database:** SQLite is used for local development — no external DB needed.  
> **Production:** Switch `schema.prisma` provider to `postgresql` and update `DATABASE_URL`.

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/your-org/school-erp.git
cd school-erp

# 2. Backend
cd backend
cp .env.example .env          # fill in JWT_SECRET (any 32+ char string locally)
npm install
npx prisma generate
npx prisma db push
npm run db:seed               # seeds two demo schools
npm run dev                   # starts on http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

### Demo Credentials

| School Code | Email | Password | Role |
|---|---|---|---|
| `greenwood` | admin@school.local | Admin@123 | Admin |
| `greenwood` | parent@demo.com | Parent@123 | Parent |
| `sunrise` | admin@school.local | Admin@123 | Admin |

---

## Running Tests

```bash
cd backend
npm test              # all tests (vitest)
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run format:check  # Prettier
```

Tests use an in-memory SQLite instance (no external service needed).

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `develop` | Integration branch for features |
| `feature/<name>` | Feature branches — branch from `develop` |
| `fix/<name>` | Bug fix branches |
| `release/<version>` | Release preparation |

**Never push directly to `main`.** Open a Pull Request from your feature branch into `develop`.

---

## Pull Request Checklist

- [ ] `npm test` passes with no failures
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] New endpoints have tests in `backend/src/tests/api.test.ts`
- [ ] New Zod schemas have plain-language error messages
- [ ] Any new school-specific behaviour is gated behind a feature flag
- [ ] `.env` secrets are NOT committed (only `.env.example` updated)
- [ ] `ARCHITECTURE.md` updated if a new bounded context is added

---

## Coding Conventions

### Backend
- **Module structure:** every new domain goes in `src/modules/<name>/` with `schema.ts`, `service.ts`, `routes.ts`
- **Shared utilities:** import from `src/shared/` — never directly from `src/lib/`
- **Money:** always store as **integer minor units** (paise/cents) and use `toMajor()` / `toMinor()` from `shared/money.ts`
- **Tenant isolation:** every query must include `where: { schoolId: tenantId(req) }` — enforced by service layer
- **Validation messages:** Zod `.min(1, "Admission number is required.")` style — plain English, no technical codes

### Frontend
- **Public pages:** `src/pages/public/` — no auth required, no admin layout
- **Admin pages:** `src/pages/` — wrapped in `<Layout>`, require `AuthContext`
- **Parent portal:** `src/pages/parent/` — wrapped in `<ParentLayout>`, require `ParentAuthContext`
- **Errors:** use `parseApiError()` from `api/client.ts` and render with `<FormError />`
- **Feature flags:** check `features.flagName` from `ConfigContext` before rendering gated UI

---

## Environment Variables

See `backend/.env.example` for the full reference. The most important:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | Must be 32+ chars in production; app **hard-fails** on startup if not set |
| `DATABASE_URL` | SQLite for dev; PostgreSQL for production |
| `CLIENT_ORIGIN` | Must match the frontend's actual origin for CORS |

---

## Questions?

Open an issue or start a Discussion on GitHub.
