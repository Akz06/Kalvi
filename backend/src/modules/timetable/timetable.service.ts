import { prisma } from "../../shared/prisma.js";
import { NotFound, BadRequest } from "../../shared/errors.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_DESIGNATIONS = [
  "Principal", "Vice Principal", "Teacher", "Senior Teacher",
  "HOD", "Coordinator", "Counsellor", "Librarian",
  "PE Teacher", "Lab Assistant", "Accountant", "Admin Staff",
];

const DEFAULT_SUBJECTS = [
  { name: "English",         code: "ENG"  },
  { name: "Tamil",           code: "TAM"  },
  { name: "Hindi",           code: "HIN"  },
  { name: "Mathematics",     code: "MAT"  },
  { name: "Science",         code: "SCI"  },
  { name: "Social Science",  code: "SST"  },
  { name: "Computer Science",code: "CS"   },
  { name: "Physics",         code: "PHY"  },
  { name: "Chemistry",       code: "CHE"  },
  { name: "Biology",         code: "BIO"  },
  { name: "Commerce",        code: "COM"  },
  { name: "Accountancy",     code: "ACC"  },
  { name: "Economics",       code: "ECO"  },
  { name: "Business Studies",code: "BUS"  },
  { name: "Physical Education", code: "PE" },
  { name: "Environmental Science", code: "EVS" },
];

// ── Designations ──────────────────────────────────────────────────────────────

export async function listDesignations(schoolId: string) {
  return prisma.designation.findMany({
    where: { schoolId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function ensureDefaultDesignations(schoolId: string) {
  const existing = await prisma.designation.findMany({ where: { schoolId } });
  if (existing.length > 0) return;
  await prisma.designation.createMany({
    data: DEFAULT_DESIGNATIONS.map((name) => ({
      id: `${schoolId}-desig-${name.toLowerCase().replace(/\s+/g, "-")}`,
      schoolId,
      name,
    })),
    skipDuplicates: true,
  });
}

export async function createDesignation(schoolId: string, name: string) {
  return prisma.designation.create({
    data: { schoolId, name },
  });
}

export async function deleteDesignation(schoolId: string, id: string) {
  const d = await prisma.designation.findFirst({ where: { id, schoolId } });
  if (!d) throw NotFound("Designation not found.");
  return prisma.designation.update({ where: { id }, data: { active: false } });
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function listSubjects(schoolId: string) {
  return prisma.subject.findMany({
    where: { schoolId, active: true },
    orderBy: { name: "asc" },
    include: {
      staffSubjects: {
        include: { staff: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
}

export async function ensureDefaultSubjects(schoolId: string) {
  const existing = await prisma.subject.findMany({ where: { schoolId } });
  if (existing.length > 0) return;
  await prisma.subject.createMany({
    data: DEFAULT_SUBJECTS.map((s) => ({
      id: `${schoolId}-subj-${s.code.toLowerCase()}`,
      schoolId,
      name: s.name,
      code: s.code,
    })),
    skipDuplicates: true,
  });
}

export async function createSubject(schoolId: string, body: {
  name: string; code: string; classIds?: string[];
}) {
  return prisma.subject.create({
    data: {
      schoolId,
      name: body.name,
      code: body.code.toUpperCase(),
      classIds: JSON.stringify(body.classIds ?? []),
    },
  });
}

export async function updateSubject(schoolId: string, id: string, body: {
  name?: string; code?: string; classIds?: string[]; active?: boolean;
}) {
  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("Subject not found.");
  return prisma.subject.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.code ? { code: body.code.toUpperCase() } : {}),
      ...(body.classIds !== undefined ? { classIds: JSON.stringify(body.classIds) } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  });
}

export async function deleteSubject(schoolId: string, id: string) {
  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("Subject not found.");
  return prisma.subject.update({ where: { id }, data: { active: false } });
}

// Staff ↔ Subject assignments
export async function assignSubjectToStaff(schoolId: string, staffId: string, subjectId: string) {
  const [staff, subject] = await Promise.all([
    prisma.staff.findFirst({ where: { id: staffId, schoolId } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
  ]);
  if (!staff) throw NotFound("Staff member not found.");
  if (!subject) throw NotFound("Subject not found.");
  return prisma.staffSubject.upsert({
    where: { staffId_subjectId: { staffId, subjectId } },
    create: { schoolId, staffId, subjectId },
    update: {},
  });
}

export async function removeSubjectFromStaff(schoolId: string, staffId: string, subjectId: string) {
  const existing = await prisma.staffSubject.findFirst({
    where: { staffId, subjectId, schoolId },
  });
  if (!existing) throw NotFound("Assignment not found.");
  return prisma.staffSubject.delete({ where: { id: existing.id } });
}

export async function getStaffSubjects(schoolId: string, staffId: string) {
  return prisma.staffSubject.findMany({
    where: { staffId, schoolId },
    include: { subject: true },
  });
}

// ── Timetable ─────────────────────────────────────────────────────────────────

export async function getTimetableForSection(schoolId: string, sectionId: string, academicYearId?: string) {
  const tt = await prisma.timetable.findFirst({
    where: { schoolId, sectionId, ...(academicYearId ? { academicYearId } : {}) },
    include: {
      periods: {
        orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
        include: {
          subject: { select: { id: true, name: true, code: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      section: { include: { class: true } },
    },
  });
  return tt;
}

export async function getTimetableForStaff(schoolId: string, staffId: string) {
  // Find all periods assigned to this staff across all sections
  const periods = await prisma.timetablePeriod.findMany({
    where: { schoolId, staffId },
    orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    include: {
      subject: { select: { id: true, name: true, code: true } },
      timetable: {
        include: {
          section: { include: { class: true } },
        },
      },
    },
  });
  return periods;
}

export async function getNextClassForStaff(schoolId: string, staffId: string) {
  const now = new Date();
  // dayOfWeek: JS 0=Sun, we use 1=Mon…6=Sat
  const jsDay = now.getDay(); // 0=Sun
  const todayDow = jsDay === 0 ? null : jsDay; // null if Sunday
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (!todayDow) return null;

  const period = await prisma.timetablePeriod.findFirst({
    where: {
      schoolId,
      staffId,
      dayOfWeek: todayDow,
      isBreak: false,
      startTime: { gt: currentTime },
    },
    orderBy: { startTime: "asc" },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      timetable: {
        include: { section: { include: { class: true } } },
      },
    },
  });
  return period;
}

export async function generateTimetable(schoolId: string, body: {
  sectionId: string;
  academicYearId?: string;
  periodsPerDay: number;
  startTime: string; // "09:00"
  periodDuration: number; // minutes
  breakAfterPeriod: number; // add break after this period
  breakDuration: number; // minutes
  workingDays: number[]; // [1,2,3,4,5] = Mon-Fri
}) {
  const { sectionId, academicYearId, periodsPerDay, startTime, periodDuration,
    breakAfterPeriod, breakDuration, workingDays } = body;

  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId } });
  if (!section) throw NotFound("Section not found.");

  // Remove existing timetable for this section+year
  const existing = await prisma.timetable.findFirst({
    where: { schoolId, sectionId, ...(academicYearId ? { academicYearId } : {}) },
  });
  if (existing) {
    await prisma.timetablePeriod.deleteMany({ where: { timetableId: existing.id } });
    await prisma.timetable.delete({ where: { id: existing.id } });
  }

  // Create fresh timetable
  const timetable = await prisma.timetable.create({
    data: { schoolId, sectionId, academicYearId: academicYearId ?? null, active: true },
  });

  // Build periods
  const periods: any[] = [];
  for (const dow of workingDays) {
    let [h, m] = startTime.split(":").map(Number);
    let periodNo = 1;

    for (let p = 1; p <= periodsPerDay; p++) {
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const endMinutes = h * 60 + m + periodDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      periods.push({
        schoolId, timetableId: timetable.id,
        dayOfWeek: dow, periodNo,
        startTime: start, endTime: end,
        isBreak: false,
      });
      periodNo++;
      h = endH; m = endM;

      // Insert break after specified period
      if (p === breakAfterPeriod && p < periodsPerDay) {
        const bEndMinutes = h * 60 + m + breakDuration;
        const bEndH = Math.floor(bEndMinutes / 60);
        const bEndM = bEndMinutes % 60;
        periods.push({
          schoolId, timetableId: timetable.id,
          dayOfWeek: dow, periodNo,
          startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          endTime: `${String(bEndH).padStart(2, "0")}:${String(bEndM).padStart(2, "0")}`,
          isBreak: true, label: "Break",
        });
        periodNo++;
        h = bEndH; m = bEndM;
      }
    }
  }

  await prisma.timetablePeriod.createMany({ data: periods });
  return getTimetableForSection(schoolId, sectionId, academicYearId);
}

export async function updatePeriod(schoolId: string, periodId: string, body: {
  subjectId?: string | null;
  staffId?: string | null;
  startTime?: string;
  endTime?: string;
  label?: string;
  isBreak?: boolean;
}) {
  const period = await prisma.timetablePeriod.findFirst({ where: { id: periodId, schoolId } });
  if (!period) throw NotFound("Period not found.");
  return prisma.timetablePeriod.update({ where: { id: periodId }, data: body });
}

// ── Period Exchange ───────────────────────────────────────────────────────────

export async function requestPeriodExchange(schoolId: string, body: {
  periodId: string;
  exchangeDate: string;
  originalStaffId: string;
  substituteId: string;
  reason?: string;
}) {
  const { periodId, exchangeDate, originalStaffId, substituteId, reason } = body;

  if (originalStaffId === substituteId) throw BadRequest("Cannot exchange with yourself.");

  const [period, originalStaff, substitute] = await Promise.all([
    prisma.timetablePeriod.findFirst({ where: { id: periodId, schoolId } }),
    prisma.staff.findFirst({ where: { id: originalStaffId, schoolId } }),
    prisma.staff.findFirst({ where: { id: substituteId, schoolId } }),
  ]);

  if (!period) throw NotFound("Period not found.");
  if (!originalStaff) throw NotFound("Original staff not found.");
  if (!substitute) throw NotFound("Substitute staff not found.");

  return prisma.periodExchange.create({
    data: {
      schoolId,
      periodId,
      exchangeDate: new Date(exchangeDate),
      originalStaffId,
      substituteId,
      reason: reason ?? null,
      status: "PENDING",
    },
    include: {
      period: { include: { subject: true, timetable: { include: { section: { include: { class: true } } } } } },
      originalStaff: { select: { id: true, firstName: true, lastName: true } },
      substitute: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function listPeriodExchanges(schoolId: string, filters: {
  staffId?: string;
  status?: string;
  date?: string;
}) {
  return prisma.periodExchange.findMany({
    where: {
      schoolId,
      ...(filters.staffId ? {
        OR: [{ originalStaffId: filters.staffId }, { substituteId: filters.staffId }],
      } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.date ? { exchangeDate: new Date(filters.date) } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      period: {
        include: {
          subject: { select: { id: true, name: true } },
          timetable: { include: { section: { include: { class: true } } } },
        },
      },
      originalStaff: { select: { id: true, firstName: true, lastName: true } },
      substitute: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function approveExchange(schoolId: string, id: string, status: "APPROVED" | "REJECTED") {
  const ex = await prisma.periodExchange.findFirst({ where: { id, schoolId } });
  if (!ex) throw NotFound("Exchange request not found.");
  if (ex.status !== "PENDING") throw BadRequest("Only pending requests can be updated.");
  return prisma.periodExchange.update({ where: { id }, data: { status } });
}

// ── Teacher dashboard stats ────────────────────────────────────────────────────

export async function getTeacherDashboard(schoolId: string, staffId: string) {
  const today = new Date();
  const jsDay = today.getDay();
  const todayDow = jsDay === 0 ? 7 : jsDay; // 7 for Sunday (no classes)
  const todayStr = today.toISOString().split("T")[0];
  const currentTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;

  const [
    staff,
    myPeriods,
    mySubjects,
    mySections,
    pendingExchanges,
    todayExchanges,
    upcomingExams,
  ] = await Promise.all([
    // Staff details
    prisma.staff.findFirst({ where: { id: staffId, schoolId } }),

    // All periods assigned to this teacher
    prisma.timetablePeriod.findMany({
      where: { schoolId, staffId, isBreak: false },
      include: {
        subject: true,
        timetable: { include: { section: { include: { class: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),

    // Subjects taught
    prisma.staffSubject.findMany({
      where: { staffId, schoolId },
      include: { subject: true },
    }),

    // Sections this teacher is class teacher of
    prisma.section.findMany({
      where: { teacherId: staffId, schoolId },
      include: { class: true },
    }),

    // Pending exchange requests (as original or substitute)
    prisma.periodExchange.count({
      where: {
        schoolId,
        status: "PENDING",
        OR: [{ originalStaffId: staffId }, { substituteId: staffId }],
      },
    }),

    // Today's exchanges
    prisma.periodExchange.findMany({
      where: {
        schoolId,
        exchangeDate: new Date(todayStr),
        status: "APPROVED",
        OR: [{ originalStaffId: staffId }, { substituteId: staffId }],
      },
      include: {
        period: { include: { subject: true, timetable: { include: { section: { include: { class: true } } } } } },
        originalStaff: { select: { firstName: true, lastName: true } },
        substitute: { select: { firstName: true, lastName: true } },
      },
    }),

    // Upcoming exams for classes this teacher teaches
    prisma.exam.findMany({
      where: {
        schoolId,
        examDate: { gte: today },
      },
      orderBy: { examDate: "asc" },
      take: 5,
      include: { class: true },
    }),
  ]);

  if (!staff) throw NotFound("Staff member not found.");

  // Today's schedule
  const todayPeriods = myPeriods.filter((p) => p.dayOfWeek === todayDow);
  const nextClass = todayPeriods.find((p) => p.startTime > currentTime) ?? null;

  // Build weekly schedule grouped by day
  const weeklySchedule: Record<number, typeof myPeriods> = {};
  for (let d = 1; d <= 6; d++) {
    weeklySchedule[d] = myPeriods.filter((p) => p.dayOfWeek === d);
  }

  return {
    staff,
    stats: {
      periodsToday: todayPeriods.length,
      subjectsTaught: mySubjects.length,
      classesMentored: mySections.length,
      pendingExchanges,
    },
    todaySchedule: todayPeriods,
    nextClass,
    weeklySchedule,
    todayExchanges,
    upcomingExams: upcomingExams.map((e) => ({
      id: e.id,
      name: e.name,
      subject: e.subject,
      className: e.class.name,
      examDate: e.examDate,
    })),
    mySubjects: mySubjects.map((ss) => ss.subject),
    mySections,
  };
}
