import { prisma } from "../../shared/prisma.js";
import { NotFound } from "../../shared/errors.js";

// ── Students ────────────────────────────────────────────────
export async function listStudents(
  schoolId: string,
  filter: { sectionId?: string; q?: string; active?: string }
) {
  const { sectionId, q, active } = filter;

  // active=false → show inactive/left students; default shows only active
  const isActive = active === "false" ? false : true;

  return prisma.student.findMany({
    where: {
      schoolId,
      active: isActive,
      ...(sectionId ? { sectionId } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: String(q) } },
              { lastName: { contains: String(q) } },
              { admissionNo: { contains: String(q) } },
            ],
          }
        : {}),
    },
    orderBy: { admissionNo: "asc" },
    include: { section: { include: { class: true } } },
  });
}

/**
 * Returns students enrolled in a previous (non-active) academic year,
 * grouped with their enrollment details so the UI can show their last
 * known class and status.
 */
export async function listPreviousYearStudents(
  schoolId: string,
  filter: { academicYearId?: string; q?: string }
) {
  const { academicYearId, q } = filter;

  // Find non-active years for this school to scope the query
  const yearFilter = academicYearId
    ? { id: academicYearId, schoolId }
    : { schoolId, active: false };

  const years = await prisma.academicYear.findMany({ where: yearFilter });
  const yearIds = years.map((y) => y.id);

  if (yearIds.length === 0) return [];

  return prisma.enrollment.findMany({
    where: {
      schoolId,
      academicYearId: { in: yearIds },
      ...(q
        ? {
            student: {
              OR: [
                { firstName: { contains: String(q) } },
                { lastName: { contains: String(q) } },
                { admissionNo: { contains: String(q) } },
              ],
            },
          }
        : {}),
    },
    include: {
      student: true,
      section: { include: { class: true } },
      academicYear: { select: { id: true, name: true, active: true } },
    },
    orderBy: [
      { academicYear: { startDate: "desc" } },
      { student: { admissionNo: "asc" } },
    ],
    // Deduplicate: return only the latest enrollment per student
    distinct: ["studentId"],
  });
}

export async function getStudent(schoolId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      section: { include: { class: true } },
      fees: { orderBy: { dueDate: "desc" } },
    },
  });
  if (!student) throw NotFound("That student could not be found in your school.");
  return student;
}

export async function createStudent(schoolId: string, body: any) {
  const section = await prisma.section.findFirst({
    where: { id: body.sectionId, schoolId },
  });
  if (!section)
    throw NotFound("The selected class/section was not found in your school.");
  return prisma.student.create({ data: { ...body, schoolId } });
}

export async function updateStudent(schoolId: string, id: string, body: any) {
  const existing = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("That student could not be found in your school.");
  return prisma.student.update({ where: { id }, data: body });
}

export async function deleteStudent(schoolId: string, id: string) {
  const existing = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("That student could not be found in your school.");
  await prisma.student.delete({ where: { id } });
}

// ── Staff ───────────────────────────────────────────────────
export async function listStaff(schoolId: string, q?: string) {
  return prisma.staff.findMany({
    where: {
      schoolId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: String(q) } },
              { lastName: { contains: String(q) } },
              { employeeNo: { contains: String(q) } },
              { designation: { contains: String(q) } },
            ],
          }
        : {}),
    },
    orderBy: { employeeNo: "asc" },
  });
}

export async function getStaff(schoolId: string, id: string) {
  const staff = await prisma.staff.findFirst({ where: { id, schoolId } });
  if (!staff) throw NotFound("That staff member could not be found in your school.");
  return staff;
}

export async function createStaff(schoolId: string, body: any) {
  return prisma.staff.create({ data: { ...body, schoolId } });
}

export async function updateStaff(schoolId: string, id: string, body: any) {
  const existing = await prisma.staff.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("That staff member could not be found in your school.");
  return prisma.staff.update({ where: { id }, data: body });
}

export async function deleteStaff(schoolId: string, id: string) {
  const existing = await prisma.staff.findFirst({ where: { id, schoolId } });
  if (!existing) throw NotFound("That staff member could not be found in your school.");
  await prisma.staff.delete({ where: { id } });
}
