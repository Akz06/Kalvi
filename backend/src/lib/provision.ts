import { prisma } from "./prisma.js";

/**
 * Creates the default class/section structure for a school based on its
 * configurable settings (min/max class level, sections per class).
 * Idempotent: uses upsert so re-running never duplicates.
 */
export async function provisionClasses(schoolId: string) {
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId },
  });
  const min = settings?.minClassLevel ?? 1;
  const max = settings?.maxClassLevel ?? 12;
  const sectionCount = settings?.sectionsPerClass ?? 2;

  const sectionNames = Array.from({ length: sectionCount }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  for (let level = min; level <= max; level++) {
    const cls = await prisma.class.upsert({
      where: { schoolId_level: { schoolId, level } },
      update: {},
      create: { schoolId, level, name: `Class ${level}` },
    });
    for (const name of sectionNames) {
      await prisma.section.upsert({
        where: { classId_name: { classId: cls.id, name } },
        update: {},
        create: { schoolId, classId: cls.id, name },
      });
    }
  }
}
