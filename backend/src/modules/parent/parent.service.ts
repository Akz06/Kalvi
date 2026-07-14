import bcrypt from "bcryptjs";
import { prisma } from "../../shared/prisma.js";
import { signToken } from "../../shared/jwt.js";
import { BadRequest, Conflict, Forbidden, NotFound, Unauthorized } from "../../shared/errors.js";
import { moneyToMajor, MONEY_FIELDS } from "../../shared/money.js";
import { computeGrade } from "../../shared/config.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip the hashed password before returning guardian data to the client. */
function omitPassword<T extends { password?: string }>(g: T): Omit<T, "password"> {
  const { password: _p, ...rest } = g as any;
  return rest;
}

function omitPasswordList<T extends { password?: string }>(list: T[]) {
  return list.map(omitPassword);
}

// ─── Guardian management (admin side) ───────────────────────────────────────

const GUARDIAN_STUDENT_SELECT = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      firstName: true,
      lastName: true,
      section: { include: { class: true } },
    },
  },
} as const;

export async function listGuardians(schoolId: string, studentId?: string) {
  const rows = await prisma.guardian.findMany({
    where: {
      schoolId,
      ...(studentId ? { studentId } : {}),
    },
    include: GUARDIAN_STUDENT_SELECT,
    orderBy: [{ studentId: "asc" }, { isPrimary: "desc" }],
  });
  return omitPasswordList(rows);
}

export async function createGuardian(schoolId: string, body: any) {
  const { studentId, name, relationship, phone, email, password, isPrimary } = body;

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) throw NotFound("That student could not be found in your school.");

  // Only 2 guardians allowed per student
  const count = await prisma.guardian.count({ where: { studentId, schoolId } });
  if (count >= 2)
    throw BadRequest(
      "A student can have at most 2 guardians. Please remove one before adding another."
    );

  // Email unique per school (a parent can only have one account per school)
  const existing = await prisma.guardian.findUnique({
    where: { schoolId_email: { schoolId, email } },
  });
  if (existing)
    throw Conflict(
      "A guardian with this email address is already registered in your school."
    );

  // If isPrimary, demote any existing primary for this student
  if (isPrimary !== false) {
    await prisma.guardian.updateMany({
      where: { studentId, schoolId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const created = await prisma.guardian.create({
    data: {
      schoolId,
      studentId,
      name,
      relationship: relationship ?? "Parent",
      phone,
      email,
      password: hashed,
      isPrimary: isPrimary !== false,
    },
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
  return omitPassword(created);
}

export async function updateGuardian(schoolId: string, id: string, body: any) {
  const guardian = await prisma.guardian.findFirst({ where: { id, schoolId } });
  if (!guardian) throw NotFound("That guardian could not be found.");

  const data: any = { ...body };

  // Hash new password if provided
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  // If promoting to primary, demote others for the same student
  if (data.isPrimary === true) {
    await prisma.guardian.updateMany({
      where: { studentId: guardian.studentId, schoolId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.guardian.update({
    where: { id },
    data,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
    },
  });
  return omitPassword(updated);
}

export async function deleteGuardian(schoolId: string, id: string) {
  const guardian = await prisma.guardian.findFirst({ where: { id, schoolId } });
  if (!guardian) throw NotFound("That guardian could not be found.");
  await prisma.guardian.delete({ where: { id } });
}

export async function resetGuardianPassword(
  schoolId: string,
  id: string,
  newPassword: string
) {
  const guardian = await prisma.guardian.findFirst({ where: { id, schoolId } });
  if (!guardian) throw NotFound("That guardian could not be found.");
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.guardian.update({ where: { id }, data: { password: hashed } });
  return { message: "Password has been reset successfully." };
}

// ─── Parent portal login ──────────────────────────────────────────────────────

const BAD_CREDENTIALS =
  "We couldn't find a guardian account with those details. Check your school code, email, and password.";

export async function parentLogin(input: {
  schoolSlug: string;
  email: string;
  password: string;
}) {
  const { schoolSlug, email, password } = input;

  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  if (!school)
    throw Unauthorized(
      "We couldn't find a school with that code. Please check and try again."
    );
  if (!school.active)
    throw Forbidden("This school account is currently inactive.");

  const guardian = await prisma.guardian.findUnique({
    where: { schoolId_email: { schoolId: school.id, email } },
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          section: { include: { class: true } },
        },
      },
    },
  });

  if (!guardian) throw Unauthorized(BAD_CREDENTIALS);
  if (!guardian.active)
    throw Unauthorized(
      "Your guardian account has been deactivated. Please contact the school administrator."
    );

  const ok = await bcrypt.compare(password, guardian.password);
  if (!ok) throw Unauthorized(BAD_CREDENTIALS);

  const token = signToken({
    sub: guardian.id,
    role: "PARENT" as const,
    email: guardian.email,
    schoolId: school.id,
  });

  return {
    token,
    guardian: {
      id: guardian.id,
      name: guardian.name,
      relationship: guardian.relationship,
      email: guardian.email,
      schoolId: school.id,
      school: { slug: school.slug, name: school.name },
      student: guardian.student,
    },
  };
}

// ─── Parent portal — read-only child data ────────────────────────────────────

export async function getGuardianProfile(guardianId: string, schoolId: string) {
  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, schoolId },
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          dob: true,
          gender: true,
          address: true,
          section: { include: { class: true } },
        },
      },
    },
  });
  if (!guardian) throw NotFound("Guardian profile not found.");
  return omitPassword(guardian);
}

export async function getChildAttendance(guardianId: string, schoolId: string) {
  const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
  if (!guardian) throw Forbidden("Access denied.");

  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId: guardian.studentId, schoolId },
    _count: { status: true },
  });

  const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<string, number>;
  grouped.forEach((g) => (summary[g.status] = g._count.status));

  const recent = await prisma.attendance.findMany({
    where: { studentId: guardian.studentId, schoolId },
    orderBy: { date: "desc" },
    take: 30,
  });

  const total = Object.values(summary).reduce((s, v) => s + v, 0);
  const attendancePct = total > 0 ? Math.round((summary.PRESENT / total) * 100) : 0;

  return { summary, attendancePercentage: attendancePct, recent };
}

export async function getChildFees(guardianId: string, schoolId: string) {
  const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
  if (!guardian) throw Forbidden("Access denied.");

  const fees = await prisma.feeRecord.findMany({
    where: { studentId: guardian.studentId, schoolId },
    include: {
      items: { include: { feeHead: { select: { id: true, name: true } } } },
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { dueDate: "desc" },
  });

  return fees.map((f) => moneyToMajor(f, MONEY_FIELDS));
}

export async function getChildExams(guardianId: string, schoolId: string) {
  const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, schoolId } });
  if (!guardian) throw Forbidden("Access denied.");

  const results = await prisma.examResult.findMany({
    where: { studentId: guardian.studentId, schoolId },
    include: { exam: { include: { class: true } } },
    orderBy: { exam: { examDate: "desc" } },
  });

  const totalObtained = results.reduce((s, r) => s + r.marksObtained, 0);
  const totalMax = results.reduce((s, r) => s + r.exam.maxMarks, 0);
  const overall = computeGrade(totalObtained, totalMax);

  return {
    results: results.map((r) => ({
      examName: r.exam.name,
      subject: r.exam.subject,
      examDate: r.exam.examDate,
      maxMarks: r.exam.maxMarks,
      marksObtained: r.marksObtained,
      grade: r.grade,
      remark: r.remark,
    })),
    summary: {
      totalObtained,
      totalMax,
      percentage: Math.round((overall.percentage) * 100) / 100,
      overallGrade: overall.grade,
    },
  };
}

export async function getChildTimetableOverview(guardianId: string, schoolId: string) {
  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, schoolId },
    include: { student: { include: { section: { include: { class: true } } } } },
  });
  if (!guardian) throw Forbidden("Access denied.");

  // Return the class/section details — timetable scheduling is Phase 4
  return {
    class: guardian.student.section.class.name,
    section: guardian.student.section.name,
    classLevel: guardian.student.section.class.level,
    note: "Full timetable scheduling will be available in a future update.",
  };
}
