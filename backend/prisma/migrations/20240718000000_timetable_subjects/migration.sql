-- Migration: Timetable, Subjects, Designations, Period Exchange
-- Adds subject master, timetable engine and period exchange workflow

-- ── Subject master ──────────────────────────────────────────────────────────
CREATE TABLE "Subject" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "schoolId"  TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "code"      TEXT NOT NULL,
  "classIds"  TEXT NOT NULL DEFAULT '[]',   -- JSON array of SchoolClass ids
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- ── Designation master ──────────────────────────────────────────────────────
CREATE TABLE "Designation" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "schoolId"  TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Designation_schoolId_name_key" ON "Designation"("schoolId", "name");
CREATE INDEX "Designation_schoolId_idx" ON "Designation"("schoolId");

-- ── Teacher ↔ Subject mapping ────────────────────────────────────────────────
CREATE TABLE "StaffSubject" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "schoolId"  TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "staffId"   TEXT NOT NULL REFERENCES "Staff"("id") ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StaffSubject_staffId_subjectId_key" ON "StaffSubject"("staffId", "subjectId");
CREATE INDEX "StaffSubject_schoolId_idx" ON "StaffSubject"("schoolId");
CREATE INDEX "StaffSubject_staffId_idx" ON "StaffSubject"("staffId");

-- ── Timetable ───────────────────────────────────────────────────────────────
CREATE TABLE "Timetable" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "schoolId"       TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "sectionId"      TEXT NOT NULL REFERENCES "Section"("id") ON DELETE CASCADE,
  "academicYearId" TEXT REFERENCES "AcademicYear"("id") ON DELETE SET NULL,
  "name"           TEXT NOT NULL DEFAULT 'Weekly Timetable',
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Timetable_sectionId_academicYearId_key" ON "Timetable"("sectionId", "academicYearId");
CREATE INDEX "Timetable_schoolId_idx" ON "Timetable"("schoolId");
CREATE INDEX "Timetable_sectionId_idx" ON "Timetable"("sectionId");

-- ── Timetable Period (one slot per day/period) ───────────────────────────────
CREATE TABLE "TimetablePeriod" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "schoolId"    TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "timetableId" TEXT NOT NULL REFERENCES "Timetable"("id") ON DELETE CASCADE,
  "dayOfWeek"   INTEGER NOT NULL,          -- 1=Mon … 6=Sat
  "periodNo"    INTEGER NOT NULL,          -- 1-based period number
  "startTime"   TEXT NOT NULL,             -- "09:00"
  "endTime"     TEXT NOT NULL,             -- "09:45"
  "subjectId"   TEXT REFERENCES "Subject"("id") ON DELETE SET NULL,
  "staffId"     TEXT REFERENCES "Staff"("id") ON DELETE SET NULL,
  "isBreak"     BOOLEAN NOT NULL DEFAULT false,
  "label"       TEXT,                      -- "Lunch Break", "Assembly" etc
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TimetablePeriod_timetableId_dayOfWeek_periodNo_key"
  ON "TimetablePeriod"("timetableId", "dayOfWeek", "periodNo");
CREATE INDEX "TimetablePeriod_schoolId_idx" ON "TimetablePeriod"("schoolId");
CREATE INDEX "TimetablePeriod_timetableId_idx" ON "TimetablePeriod"("timetableId");
CREATE INDEX "TimetablePeriod_staffId_idx" ON "TimetablePeriod"("staffId");

-- ── Period Exchange / Substitute ────────────────────────────────────────────
CREATE TABLE "PeriodExchange" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "schoolId"        TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "periodId"        TEXT NOT NULL REFERENCES "TimetablePeriod"("id") ON DELETE CASCADE,
  "exchangeDate"    DATE NOT NULL,          -- specific date of exchange
  "originalStaffId" TEXT NOT NULL REFERENCES "Staff"("id") ON DELETE CASCADE,
  "substituteId"    TEXT NOT NULL REFERENCES "Staff"("id") ON DELETE CASCADE,
  "reason"          TEXT,
  "status"          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PeriodExchange_schoolId_idx" ON "PeriodExchange"("schoolId");
CREATE INDEX "PeriodExchange_periodId_idx" ON "PeriodExchange"("periodId");
CREATE INDEX "PeriodExchange_originalStaffId_idx" ON "PeriodExchange"("originalStaffId");
CREATE INDEX "PeriodExchange_substituteId_idx" ON "PeriodExchange"("substituteId");

-- ── Seed default designations ───────────────────────────────────────────────
-- (Schools get these seeded when they onboard via the backend seed logic)
