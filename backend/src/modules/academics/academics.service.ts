import { prisma } from "../../shared/prisma.js";

export async function listClasses(schoolId: string) {
  return prisma.class.findMany({
    where: { schoolId },
    orderBy: { level: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { students: true } },
        },
      },
    },
  });
}

export async function listSections(schoolId: string) {
  const sections = await prisma.section.findMany({
    where: { schoolId },
    orderBy: [{ class: { level: "asc" } }, { name: "asc" }],
    include: { class: true, _count: { select: { students: true } } },
  });
  return sections.map((s) => ({
    id: s.id,
    label: `${s.class.name} - ${s.name}`,
    classLevel: s.class.level,
    section: s.name,
    studentCount: s._count.students,
  }));
}
