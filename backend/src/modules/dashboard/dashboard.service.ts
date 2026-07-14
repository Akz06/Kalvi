import { prisma } from "../../shared/prisma.js";
import { toMajor } from "../../shared/money.js";

export async function getStats(schoolId: string) {
  const [students, staff, classes, sections, pendingFees, exams] = await Promise.all([
    prisma.student.count({ where: { schoolId, active: true } }),
    prisma.staff.count({ where: { schoolId, active: true } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),
    prisma.feeRecord.aggregate({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true, amountPaid: true },
    }),
    prisma.exam.count({ where: { schoolId } }),
  ]);

  const dueMinor = (pendingFees._sum.amount ?? 0) - (pendingFees._sum.amountPaid ?? 0);

  const today = new Date();
  const day = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const presentToday = await prisma.attendance.count({
    where: { schoolId, date: day, status: "PRESENT" },
  });

  return {
    students,
    staff,
    classes,
    sections,
    exams,
    outstandingFees: toMajor(Math.max(0, dueMinor)),
    presentToday,
  };
}
