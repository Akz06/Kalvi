# 🎓 School ERP — Multi-Tenant

A configurable, multi-school ERP built with **Node + Express + TypeScript**, **Prisma** (SQLite dev / PostgreSQL prod), and **React + Vite + Tailwind**.

One deployment can serve **many schools** (tenants). Everything school-specific — city, board, currency, class range, sections, and which modules are enabled — is **configurable per school** through a Preferences form. No school data is hardcoded.

---

## ✨ Features

### Core (Phase 1)
- 🔐 **Multi-tenant Auth** — JWT, role-based (`SUPERADMIN` / `ADMIN` / `TEACHER` / `PARENT`), school-scoped login
- 👨‍🎓 **Students**, 👩‍🏫 **Staff**, 🏫 **Classes/Sections**, 📅 **Attendance**, 💰 **Fees** — all tenant-isolated
- 📊 **Dashboard** with live aggregates

### Configurability
- 🏫 **School onboarding** — self-service registration creates a tenant + admin and auto-provisions its class/section structure
- ⚙️ **Preferences form** — city, state, contact, **currency + locale** (drives money/date formatting), **board**, academic year, pass %, **class range**, **sections per class**
- 🚩 **Feature flags** — toggle each module (students, staff, attendance, fees, exams, parent portal) on/off per school; the sidebar adapts automatically

### Phase 2
- 📝 **Exams & Report Cards** — create exams per class/subject, bulk marks entry, **auto grade computation** (A+ … F), per-student report card with overall percentage & grade

### User-friendly validation & errors
- ✅ **Plain-language validation** — every rule has a clear message (e.g. *"Guardian phone must be at least 6 digits."*, *"Currency must be a 3-letter ISO code (e.g. INR, USD, EUR)."*) instead of technical codes
- 🧾 **Field-level feedback** — the API returns a `details` array so the UI lists exactly which fields to fix; forms render these inline via a shared `FormError` component
- 🗣️ **Helpful hints** — inputs show up-front guidance (`FieldHint`) so users get it right the first time
- 🔁 **Friendly conflict/not-found messages** — duplicate admission numbers, overpayments, unknown school codes, etc. all return specific, human-readable text
- 🌐 **Network resilience** — the client distinguishes offline / timeout / server errors with clear messaging

---

## 🏗️ Multi-Tenancy Model

Shared-database / shared-schema with **row-level isolation**. Every tenant-owned row carries a `schoolId`. Isolation is enforced centrally:

1. `authenticate` — verifies JWT (which embeds `schoolId`)
2. `resolveTenant` — sets `req.schoolId` (a `SUPERADMIN` may target any school via `x-school-id`)
3. Every query is filtered by `schoolId`; cross-tenant reads/writes return `404`/`403`

---

## 📁 Structure

```
School ERP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # multi-tenant schema (School → Settings, Users, …)
│   │   └── seed.ts            # 2 demo schools
│   └── src/
│       ├── lib/
│       │   ├── tenant.ts      # resolveTenant middleware + tenantId helper
│       │   ├── provision.ts   # auto-create classes/sections from config
│       │   └── config.ts      # feature flags + grade computation
        ├── middleware/
│       │   ├── validate.ts    # humanizes Zod errors into user-facing messages
│       │   └── error.ts       # friendly Prisma/AppError mapping
│       ├── routes/            # auth, schools, students, staff, classes,
│       │                      # attendance, fees, exams, dashboard
│       └── tests/api.test.ts  # 26 tests incl. tenant-isolation & validation msgs
└── frontend/
    └── src/
        ├── context/           # AuthContext + ConfigContext (school config/flags)
        └── pages/             # Login, Register, Dashboard, …, Exams, Settings
```

---

## 🚀 Getting Started

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed        # creates two demo schools
npm run dev            # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Demo logins
| School Code | Email | Password | Config |
|-------------|-------|----------|--------|
| `greenwood` | admin@school.local | Admin@123 | Chennai, CBSE, Classes 1–12 (A/B) |
| `sunrise` | admin@sunrise.local | Admin@123 | Coimbatore, State, Classes 1–10 (A/B/C) |

Register a brand-new school at **/register**.

---

## 📡 API Reference

Base URL: `/api` · All non-auth routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | `{ schoolSlug?, email, password }` | `schoolSlug` needed when the email exists in multiple schools |
| GET | `/auth/me` | — | Current user + school |

### Schools / Configuration
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/schools/register` | `{ school:{name,slug}, admin:{name,email,password}, settings? }` | **Public** onboarding; auto-provisions classes |
| GET | `/schools/current` | — | Tenant profile + settings + feature flags |
| PUT | `/schools/settings` | partial settings + `features` | **Preferences form** target (ADMIN) |
| POST | `/schools/provision-classes` | — | Create missing classes/sections for the configured range |

### Students / Staff / Classes / Attendance / Fees
Standard CRUD, all tenant-scoped. Examples:
```bash
# Create a student
curl -X POST /api/students -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d '{"admissionNo":"ADM001","firstName":"Arjun","lastName":"Kumar","gender":"MALE","dob":"2015-06-01","guardianName":"Suresh","guardianPhone":"9840099999","sectionId":"<id>"}'

# Mark attendance (bulk)
curl -X POST /api/attendance -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d '{"date":"2024-07-01","sectionId":"<id>","records":[{"studentId":"<id>","status":"PRESENT"}]}'

# Configure fee heads (Fee Configuration) — do this once per school
curl -X POST /api/fees/heads ... -d '{"name":"Tuition Fee","defaultAmount":10000}'
curl -X POST /api/fees/heads ... -d '{"name":"Transport Fee","defaultAmount":2000}'

# Create a fee invoice with MULTIPLE fee heads (the subform). The total is the
# sum of the line items — do NOT send a top-level `amount`.
curl -X POST /api/fees ... -d '{
  "studentId":"<id>", "title":"Term 1 Fees", "dueDate":"2024-08-01",
  "items":[
    {"feeHeadId":"<tuition-head-id>","amount":10000},
    {"feeHeadId":"<transport-head-id>","amount":2000}
  ]
}'
curl -X POST /api/fees/<id>/pay ... -d '{"amount":4000}'
```

#### Fee Configuration (per class) & multi-head payments
- **Fee heads are configured per _class_** (e.g. *Tuition Fee* for Class 10 can differ from Class 1), managed under **Preferences → Fee Configuration** with a class selector. Each head has an optional **default amount**.
- When creating a fee invoice, pick a **student** — the subform then loads **that student's class** fee heads. Add one or more **Fee head + Amount** lines; the total is the sum.
- **Payments are an immutable ledger.** Each payment records an **amount + mode** (CASH/CARD/UPI/BANK/CHEQUE/OTHER) + optional **reference**, and issues a unique **receipt number**. The invoice `amountPaid`/`status` are rolled up transactionally.
- **Money** is stored as integer **minor units** (paise/cents) to avoid rounding errors; the API accepts/returns major units.
- Rules (all with clear messages): at least one line, no duplicate heads per invoice, positive amounts, heads must belong to the student's class, and a head used on invoices can't be deleted (deactivate instead).

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/fees/heads?classId=&activeOnly=true` | — | List fee heads (filter by class) |
| POST | `/fees/heads` | `{classId, name, defaultAmount?}` | Create a class-scoped fee head |
| PUT | `/fees/heads/:id` | `{name?, defaultAmount?, active?}` | Update / deactivate |
| DELETE | `/fees/heads/:id` | — | Delete (if unused) |
| POST | `/fees` | `{studentId, title, dueDate, items[]}` | Multi-head invoice (heads must match student's class) |
| POST | `/fees/:id/pay` | `{amount, mode?, reference?}` | Ledger payment; returns receipt |

### Exams & Report Cards (Phase 2)
| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/exams?classId=` | — | List exams |
| POST | `/exams` | `{name,classId,subject,maxMarks?,examDate}` | Create exam |
| GET | `/exams/:id` | — | Exam + class roster + existing marks |
| POST | `/exams/:id/results` | `{ results:[{studentId,marksObtained,remark?}] }` | Bulk marks; grades auto-computed |
| GET | `/exams/student/:id/report` | — | Report card w/ totals + overall grade |

### Dashboard
| Method | Path | Returns |
|--------|------|---------|
| GET | `/dashboard/stats` | students, staff, classes, sections, exams, presentToday, outstandingFees |

---

## ⚙️ Configuration Reference

`SchoolSettings` (editable via Preferences form):

| Field | Default | Purpose |
|-------|---------|---------|
| `city`, `state`, `country`, `addressLine`, `phone`, `email` | — | School profile |
| `currency` / `locale` | `INR` / `en-IN` | Drives money & date formatting app-wide |
| `timezone` | `Asia/Kolkata` | — |
| `board` | `CBSE` | `CBSE·STATE·ICSE·IB·OTHER` |
| `academicYear` | — | e.g. `2024-2025` |
| `minClassLevel` / `maxClassLevel` | `1` / `12` | Class range for provisioning |
| `sectionsPerClass` | `2` | Auto-created sections (A, B, …) |
| `passPercentage` | `35` | — |
| `features` | all on (parentPortal off) | JSON feature flags |

**Grade bands** (in `lib/config.ts`): A+ ≥91, A ≥81, B+ ≥71, B ≥61, C+ ≥51, C ≥41, D ≥33, else F.

---

## 🧪 Testing
```bash
cd backend && npm test    # 26 tests
```
Coverage includes:
- **Auth & multi-tenancy** — login scoping, cross-tenant isolation (`404`/`403`)
- **Onboarding & Preferences** — school registration, settings + feature-flag updates
- **CRUD** — students, staff, attendance, fees (partial/full payments, receipts)
- **Phase 2** — exams, auto-graded results, report-card generation
- **Validation & error messages** — asserts that failures return clear, user-facing text
  (required fields, phone length, invalid currency/class-range, duplicate admission number, overpayment)

### Error-response shape
All errors return a consistent JSON body the UI can render directly:
```jsonc
// 400 — validation
{
  "error": "Please fix 2 fields: Admission number is required. Guardian name is required.",
  "details": [
    { "field": "admissionNo",  "message": "Admission number is required." },
    { "field": "guardianName", "message": "Guardian name is required." }
  ]
}
// 409 — conflict
{ "error": "A record with this admission number already exists. Please use a different value." }
```

## 🚢 Production Notes
- Switch `datasource db.provider` to `postgresql` in `schema.prisma`, set `DATABASE_URL`, run `prisma migrate deploy`.
- Set a strong `JWT_SECRET` and correct `CLIENT_ORIGIN`.
- SQLite enum-style fields are validated at the API layer via Zod; you may convert them to native Prisma enums on PostgreSQL.

## 🔜 Roadmap (Phase 3)
- Parent/Student portals (roles already in schema)
- Online fee payments (Razorpay/UPI) + PDF receipts & report cards
- Timetable/scheduling, notices, SMS/email, Tamil localization
