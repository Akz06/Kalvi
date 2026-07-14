/**
 * Academic Year & Student Enrollment / Promotion service.
 *
 * Core rules:
 *  - Exactly ONE academic year may be active at a time per school.
 *  - When a year is activated, any previously active year is deactivated.
 *  - An Enrollment record captures the student↔section↔year association.
 *  - Promotion creates a new Enrollment in the destination year/section and
 *    marks the old one as PROMOTED (immutable history).
 *  - Student.sectionId is updated on enroll/promote so quick lookups still work.
 */

import { prisma } from "../../shared/prisma.js";
import { BadRequest, NotFound, Conflict } from "../../shared/errors.js";

// ── Academic Years ───────────────────────────────────────────

export async function listAcademicYears(schoolId: string) {
  return prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { enrollments: true, exams: true, fees: true } } },
  });
}

export async function getAcademicYear(schoolId: string, id: string) {
  const year = await prisma.academicYear.findFirst({ where: { id, schoolId } });
  if (!year) throw NotFound("That academic year could not be found in your school.");
  return year;
}

export async function createAcademicYear(
  schoolId: string,
  body: { name: string; startDate: Date; endDate: Date; active?: boolean }
) {
  const { name, startDate, endDate, active } = body;

  const existing = await prisma.academicYear.findFirst({ where: { schoolId, name } });
  if (existing)
    throw Conflict(
      `An academic year named "${name}" already exists. Please use a different name.`
    );

  // If marking active, deactivate all others first.
  if (active) {
    await prisma.academicYear.updateMany({
      where: { schoolId, active: true },
      data: { active: false },
    });
  }

  return prisma.academicYear.create({
    data: { schoolId, name, startDate, endDate, active: active ?? false },
  });
}

export async function updateAcademicYear(
  schoolId: string,
  id: string,
  body: Partial<{ name: string; startDate: Date; endDate: Date; active: boolean }>
) {
  const year = await prisma.academicYear.findFirst({ where: { id, schoolId } });
  if (!year) throw NotFound("That academic year could not be found in your school.");

  // Guard: end > start
  const newStart = body.startDate ?? year.startDate;
  const newEnd = body.endDate ?? year.endDate;
  if (newEnd <= newStart)
    throw BadRequest("End date must be after the start date.");

  // Activating this year → deactivate all others
  if (body.active === true) {
    await prisma.academicYear.updateMany({
      where: { schoolId, active: true, id: { not: id } },
      data: { active: false },
    });
  }

  return prisma.academicYear.update({ where: { id }, data: body });
}

export async function deleteAcademicYear(schoolId: string, id: string) {
  const year = await prisma.academicYear.findFirst({ where: { id, schoolId } });
  if (!year) throw NotFound("That academic year could not be found in your school.");

  if (year.active)
    throw BadRequest(
      "You cannot delete the active academic year. Please activate another year first."
    );

  const usedByEnrollments = await prisma.enrollment.count({ where: { academicYearId: id } });
  if (usedByEnrollments > 0)
    throw BadRequest(
      `This academic year has ${usedByEnrollments} enrollment(s) and cannot be deleted. Deactivate it instead.`
    );

  await prisma.academicYear.delete({ where: { id } });
}

export async function activateAcademicYear(schoolId: string, id: string) {
  const year = await prisma.academicYear.findFirst({ where: { id, schoolId } });
  if (!year) throw NotFound("That academic year could not be found in your school.");

  // Deactivate any currently active year
  await prisma.academicYear.updateMany({
    where: { schoolId, active: true },
    data: { active: false },
  });

  return prisma.academicYear.update({ where: { id }, data: { active: true } });
}

// ── Enrollments ─────────────────────────────────────────────

export async function listEnrollments(
  schoolId: string,
  filter: { academicYearId?: string; sectionId?: string; status?: string }
) {
  return prisma.enrollment.findMany({
    where: {
      schoolId,
      ...(filter.academicYearId ? { academicYearId: filter.academicYearId } : {}),
      ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
      ...(filter.status ? { status: filter.status } : { status: "ACTIVE" }),
    },
    include: {
      student: {
        select: { id: true, admissionNo: true, firstName: true, lastName: true, gender: true },
      },
      section: { include: { class: { select: { name: true, level: true } } } },
      academicYear: { select: { id: true, name: true } },
    },
    orderBy: [{ section: { class: { level: "asc" } } }, { student: { admissionNo: "asc" } }],
  });
}

export async function enrollStudent(
  schoolId: string,
  body: { studentId: string; sectionId: string; academicYearId: string }
) {
  const { studentId, sectionId, academicYearId } = body;

  // Validate all three belong to this school
  const [student, section, year] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, schoolId } }),
    prisma.section.findFirst({ where: { id: sectionId, schoolId } }),
    prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
  ]);

  if (!student) throw NotFound("That student could not be found in your school.");
  if (!section) throw NotFound("That class/section could not be found in your school.");
  if (!year) throw NotFound("That academic year could not be found in your school.");

  // Check for duplicate enrollment in the same year
  const existing = await prisma.enrollment.findFirst({
    where: { studentId, academicYearId },
  });
  if (existing)
    throw Conflict(
      "This student is already enrolled for this academic year. Use promotion to move them to another section."
    );

  const [enrollment] = await prisma.$transaction([
    prisma.enrollment.create({
      data: { schoolId, studentId, sectionId, academicYearId, status: "ACTIVE" },
      include: {
        student: true,
        section: { include: { class: true } },
        academicYear: true,
      },
    }),
    // Keep Student.sectionId current for fast lookups
    prisma.student.update({ where: { id: studentId }, data: { sectionId } }),
  ]);

  return enrollment;
}

export async function bulkEnroll(
  schoolId: string,
  body: { academicYearId: string; enrollments: { studentId: string; sectionId: string }[] }
) {
  const year = await prisma.academicYear.findFirst({
    where: { id: body.academicYearId, schoolId },
  });
  if (!year) throw NotFound("That academic year could not be found in your school.");

  const results = { enrolled: 0, skipped: 0, errors: [] as string[] };

  for (const e of body.enrollments) {
    const existing = await prisma.enrollment.findFirst({
      where: { studentId: e.studentId, academicYearId: body.academicYearId },
    });
    if (existing) {
      results.skipped++;
      continue;
    }
    try {
      await prisma.$transaction([
        prisma.enrollment.create({
          data: {
            schoolId,
            studentId: e.studentId,
            sectionId: e.sectionId,
            academicYearId: body.academicYearId,
            status: "ACTIVE",
          },
        }),
        prisma.student.update({ where: { id: e.studentId }, data: { sectionId: e.sectionId } }),
      ]);
      results.enrolled++;
    } catch (err: any) {
      results.errors.push(`Student ${e.studentId}: ${err.message}`);
    }
  }

  return results;
}

// ── Promotion ────────────────────────────────────────────────

/**
 * Promotes (or transfers/exits) a batch of students from one academic year
 * to another.
 *
 * For each student:
 *  1. Mark the old Enrollment as PROMOTED/TRANSFERRED/LEFT.
 *  2. Create a new ACTIVE Enrollment in the destination year/section.
 *  3. Update Student.sectionId to the new section.
 */
export async function promoteStudents(
  schoolId: string,
  body: {
    fromYearId: string;
    toYearId: string;
    promotions: { studentId: string; toSectionId: string; action: string }[];
  }
) {
  const { fromYearId, toYearId, promotions } = body;

  const [fromYear, toYear] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: fromYearId, schoolId } }),
    prisma.academicYear.findFirst({ where: { id: toYearId, schoolId } }),
  ]);
  if (!fromYear) throw NotFound("The source academic year could not be found.");
  if (!toYear) throw NotFound("The destination academic year could not be found.");
  if (fromYearId === toYearId)
    throw BadRequest("Source and destination academic years must be different.");

  const results = { promoted: 0, skipped: 0, errors: [] as string[] };

  for (const p of promotions) {
    try {
      // Find the student's active enrollment in the source year
      const oldEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: p.studentId, academicYearId: fromYearId, schoolId },
      });

      if (!oldEnrollment) {
        results.errors.push(
          `Student ${p.studentId} has no active enrollment in the source year.`
        );
        continue;
      }

      // Prevent double-promotion
      const alreadyInDest = await prisma.enrollment.findFirst({
        where: { studentId: p.studentId, academicYearId: toYearId },
      });
      if (alreadyInDest) {
        results.skipped++;
        continue;
      }

      await prisma.$transaction([
        // Seal the old enrollment
        prisma.enrollment.update({
          where: { id: oldEnrollment.id },
          data: { status: p.action, promotedAt: new Date() },
        }),
        // Create new enrollment (skip for LEFT students)
        ...(p.action !== ("LEFT" as string)
          ? [
              prisma.enrollment.create({
                data: {
                  schoolId,
                  studentId: p.studentId,
                  sectionId: p.toSectionId,
                  academicYearId: toYearId,
                  status: "ACTIVE",
                },
              }),
              prisma.student.update({
                where: { id: p.studentId },
                data: { sectionId: p.toSectionId },
              }),
            ]
          : [
              prisma.student.update({
                where: { id: p.studentId },
                data: { active: false },
              }),
            ]),
      ]);

      results.promoted++;
    } catch (err: any) {
      results.errors.push(`Student ${p.studentId}: ${err.message}`);
    }
  }

  return results;
}

// ── Enrollment history for a student ────────────────────────
export async function studentEnrollmentHistory(schoolId: string, studentId: string) {
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) throw NotFound("That student could not be found in your school.");

  return prisma.enrollment.findMany({
    where: { studentId, schoolId },
    include: {
      section: { include: { class: { select: { name: true, level: true } } } },
      academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
