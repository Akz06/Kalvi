# 🏛️ Architecture — School ERP

> Senior Solutions Architect review & living record of the multi-tenant
> School ERP, assessed against DDD, correctness, security, and
> maintainability. Updated after each architectural phase.

---

## 1. Domain Bounded Contexts

| Context | Aggregates / Entities | Status |
|---------|----------------------|--------|
| **Tenancy & Identity** | `School`, `SchoolSettings`, `User` | ✅ |
| **Academic Structure** | `Class`, `Section` | ✅ |
| **People** | `Student`, `Staff` | ✅ |
| **Attendance** | `Attendance` | ✅ |
| **Finance / Fees** | `FeeHead` (per class), `FeeRecord` → `FeeItem`, `FeePayment` (ledger) | ✅ |
| **Assessment** | `Exam`, `ExamResult` (report cards) | ✅ Phase 2 |
| **Communication** | Notices, SMS/email | 🔲 Phase 3 |
| **Parent / Student portal** | Self-service views | 🔲 Phase 3 |

### Ubiquitous language
School (tenant) · Class · Section · Enrollment · Admission · Fee Head ·
Fee Invoice · Fee Item · Payment (ledger) · Receipt · Exam · Result ·
Grade · Report Card · Academic Year · Term.

---

## 2. Multi-Tenancy Model

**Shared-database / shared-schema with row-level isolation.** Every
tenant-owned row carries `schoolId`. Isolation chain:

```
authenticate  →  resolveTenant  →  tenantId(req)  →  every Prisma query
  (JWT)         (sets req.schoolId)   (helper)          (where: { schoolId })
```

SUPERADMIN targets a tenant via `x-school-id` header or `?schoolId=` param.

---

## 3. Folder Structure — Bounded-Context Modules (P1 ✅)

```
backend/src/
  modules/
    identity/     identity.schema.ts  identity.service.ts  identity.routes.ts
    academics/    academics.service.ts  academics.routes.ts
    people/       people.schema.ts  people.service.ts  student.routes.ts  staff.routes.ts
    attendance/   attendance.schema.ts  attendance.service.ts  attendance.routes.ts
    fees/         fees.schema.ts  fees.service.ts  fees.routes.ts
    exams/        exams.schema.ts  exams.service.ts  exams.routes.ts
    dashboard/    dashboard.service.ts  dashboard.routes.ts
  shared/         → re-exports: prisma · errors · http · tenant · jwt · money · config · params
  middleware/     auth.ts · validate.ts · error.ts
  config/         env.ts
  lib/            (source truth for shared utilities)
  tests/          api.test.ts (integration) · unit.test.ts (unit)
  app.ts          routes wired here — thin, no business logic
  server.ts
```

**Layering rules (enforced):**
- Routes → call Service methods only
- Services → use Prisma via `shared/prisma`
- No Prisma in route files
- Shared utilities never import from modules

---

## 4. Applied Changes (Chronological)

### P0 — Correctness (applied)
| Area | Change |
|------|--------|
| `FeeHead.classId` | Per-class fee config — `@@unique([classId, name])` |
| Money: `Float → Int` | All amounts stored as integer minor units (paise) |
| `FeePayment` ledger | Immutable per-payment record with mode/reference/receipt |

### P1 — Bounded-context modules (applied ✅)
| Area | Change |
|------|--------|
| `routes/` directory | **Deleted** — replaced by `modules/*/` |
| `schemas.ts` monolith | **Deleted** — split into `modules/*/schema.ts` |
| Service layer | Business logic extracted from route handlers to `*.service.ts` |
| `shared/` layer | Re-export facade for cross-cutting libs |
| `shared/params.ts` | Shared `idParam` Zod schema |

### P2 — Production hardening (applied ✅)
| Area | Change |
|------|--------|
| `config/env.ts` | Hard-fails in production for missing/insecure `JWT_SECRET` |
| `ESLint` | `.eslintrc.json` + `@typescript-eslint` — `npm run lint` |
| `Prettier` | `.prettierrc.json` — `npm run format` / `format:check` |
| `package.json` | Added `typecheck`, `lint`, `format`, `format:check`, `db:migrate`, `db:migrate:deploy` scripts |
| `Dockerfile` (backend) | Multi-stage: build (tsc) → runtime (node:20-alpine) |
| `Dockerfile` (frontend) | Multi-stage: build (vite) → runtime (nginx:1.27-alpine) |
| `docker-compose.yml` | Full stack: PostgreSQL + backend + frontend + health checks |
| `nginx.conf` | SPA fallback + `/api/` proxy to backend container |
| `.github/workflows/ci.yml` | CI: typecheck → lint → test → build (backend); build (frontend) |
| `.editorconfig` | Consistent whitespace across editors |
| Unit tests | `unit.test.ts` — money helpers, grade computation, feature flags |

---

## 5. Test Coverage

| Suite | Tests | Coverage |
|-------|-------|----------|
| `api.test.ts` | 33 integration | Full API surface: auth, multi-tenant isolation, CRUD, fees, exams, dashboard, validation messages |
| `unit.test.ts` | 8 unit | `money.ts`, `config.ts` (grade bands, feature flags) |
| **Total** | **41** | All passing ✅ |

**CI runs:** typecheck → lint → test → build (backend); build (frontend)

---

## 6. Verification Checklist

| Check | Result |
|-------|--------|
| `npm test` | **41/41** ✅ |
| `npm run typecheck` | ✅ zero errors |
| `npm run lint` | ✅ zero warnings |
| `npm run format` | ✅ applied |
| Frontend `npm run build` | ✅ 266 kB bundle |
| Backend live health | ✅ `{"status":"ok"}` |
| Login → dashboard | ✅ `12 classes, 24 sections` |
| Class-specific fee heads | ✅ Class 1 Tuition ₹8,400 |
| Validation error | ✅ `7 fields: Admission number is required...` |

---

## 7. Remaining Roadmap

### 🟠 Domain (Phase 3)
| Item | Note |
|------|------|
| **Academic Year / Term** | Scope fees, exams, attendance to a year; enable rollover |
| **Enrollment history** | `Student.sectionId` is a direct FK — need a per-year record |
| **Subject master** | Free-text `subject` on Exam; needs a Subject entity for timetable |
| **Guardian entity** | Link parent users to students for the parent portal |
| **PDF receipts + report cards** | Generate printable PDFs |
| **Parent / Student portal** | Roles exist in schema; needs Guardian + portal pages |
| **Online payments** | Razorpay / UPI integration |

### 🟡 Production (Phase 3)
| Item | Note |
|------|------|
| **Prisma migrate** | Replace `db push` with versioned migration history |
| **PostgreSQL + native enums** | SQLite string-enums → Postgres native for prod |
| **Structured logging** | Replace `console.error` with a logger (pino/winston) |
| **Refresh tokens** | Current JWTs are long-lived; add refresh + rotation |
| **Auto-tenant Prisma extension** | Eliminate per-query manual `schoolId` filter |
| **Audit fields** | `createdBy` on financial and academic changes |
