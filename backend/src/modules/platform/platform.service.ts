import { prisma } from "../../shared/prisma.js";

// ── Platform-wide stats ──────────────────────────────────────────────────────

export async function getPlatformStats() {
  const [
    totalSchools,
    activeSchools,
    totalStudents,
    totalStaff,
    recentSchools,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { active: true } }),
    prisma.student.count({ where: { active: true } }),
    prisma.staff.count({ where: { active: true } }),
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: {
          select: { students: true, staff: true },
        },
        settings: { select: { city: true, board: true } },
      },
    }),
  ]);

  return {
    totalSchools,
    activeSchools,
    totalStudents,
    totalStaff,
    recentSchools: recentSchools.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      active: s.active,
      createdAt: s.createdAt,
      city: s.settings?.city ?? "",
      board: s.settings?.board ?? "",
      students: s._count.students,
      staff: s._count.staff,
    })),
  };
}

// ── All schools ──────────────────────────────────────────────────────────────

export async function getAllSchools(search?: string) {
  const where = search
    ? { OR: [
        { name: { contains: search } },
        { slug: { contains: search } },
      ] as any }
    : undefined;

  const schools = await prisma.school.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, staff: true } },
      settings: { select: { city: true, board: true } },
    },
  });

  return schools.map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    active: s.active,
    createdAt: s.createdAt,
    city: s.settings?.city ?? "",
    board: s.settings?.board ?? "",
    plan: "free",
    students: s._count.students,
    staff: s._count.staff,
  }));
}

// ── Suspend / unsuspend ──────────────────────────────────────────────────────

export async function toggleSuspend(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found.");
  return prisma.school.update({
    where: { id: schoolId },
    data: { active: !school.active },
  });
}

// ── Delete school ────────────────────────────────────────────────────────────

export async function deleteSchool(schoolId: string) {
  await prisma.school.delete({ where: { id: schoolId } });
}
