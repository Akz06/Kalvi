import { prisma } from "../../shared/prisma.js";
import { toMajor } from "../../shared/money.js";

export async function getStats(schoolId: string) {
  const today = new Date();
  const dayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const nextDayUTC = new Date(dayUTC);
  nextDayUTC.setUTCDate(nextDayUTC.getUTCDate() + 1);

  // ── yesterday for attendance trend ──────────────────────────
  const yesterdayUTC = new Date(dayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const yesterdayEndUTC = new Date(dayUTC);

  // ── last 7 days for attendance sparkline ────────────────────
  const sevenDaysAgo = new Date(dayUTC);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  // ── current month boundaries ─────────────────────────────────
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [
    students,
    newStudentsThisMonth,
    staff,
    classes,
    sections,
    pendingFees,
    collectedThisMonth,
    exams,
    presentToday,
    presentYesterday,
    weekAttendance,
    recentPayments,
    upcomingExams,
    absentToday,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, active: true } }),

    prisma.student.count({
      where: {
        schoolId,
        active: true,
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
    }),

    prisma.staff.count({ where: { schoolId, active: true } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),

    prisma.feeRecord.aggregate({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true, amountPaid: true },
    }),

    prisma.feePayment.aggregate({
      where: {
        schoolId,
        paidAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amount: true },
    }),

    prisma.exam.count({ where: { schoolId } }),

    prisma.attendance.count({
      where: { schoolId, date: { gte: dayUTC, lt: nextDayUTC }, status: "PRESENT" },
    }),

    prisma.attendance.count({
      where: { schoolId, date: { gte: yesterdayUTC, lt: yesterdayEndUTC }, status: "PRESENT" },
    }),

    prisma.attendance.groupBy({
      by: ["date", "status"],
      where: {
        schoolId,
        date: { gte: sevenDaysAgo, lt: nextDayUTC },
      },
      _count: { status: true },
    }),

    prisma.feePayment.findMany({
      where: { schoolId },
      orderBy: { paidAt: "desc" },
      take: 5,
      include: {
        feeRecord: {
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true } },
          },
        },
      },
    }),

    prisma.exam.findMany({
      where: {
        schoolId,
        examDate: { gte: today },
      },
      orderBy: { examDate: "asc" },
      take: 5,
      include: {
        class: { select: { name: true } },
      },
    }),

    prisma.attendance.count({
      where: { schoolId, date: { gte: dayUTC, lt: nextDayUTC }, status: "ABSENT" },
    }),
  ]);

  const dueMinor = (pendingFees._sum.amount ?? 0) - (pendingFees._sum.amountPaid ?? 0);

  const sparkMap = new Map<string, { present: number; absent: number }>();
  weekAttendance.forEach((row) => {
    const key = row.date.toISOString().split("T")[0];
    if (!sparkMap.has(key)) sparkMap.set(key, { present: 0, absent: 0 });
    const entry = sparkMap.get(key)!;
    if (row.status === "PRESENT") entry.present += row._count.status;
    if (row.status === "ABSENT") entry.absent += row._count.status;
  });

  const attendanceSparkline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().split("T")[0];
    return { date: key, ...(sparkMap.get(key) ?? { present: 0, absent: 0 }) };
  });

  const attendanceTrend = presentYesterday > 0
    ? Math.round(((presentToday - presentYesterday) / presentYesterday) * 100)
    : 0;

  return {
    students,
    newStudentsThisMonth,
    staff,
    classes,
    sections,
    exams,
    outstandingFees: toMajor(Math.max(0, dueMinor)),
    collectedThisMonth: toMajor(collectedThisMonth._sum.amount ?? 0),
    presentToday,
    absentToday,
    attendanceTrend,
    attendanceSparkline,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: toMajor(p.amount),
      mode: p.mode,
      paidAt: p.paidAt,
      studentName: `${p.feeRecord.student.firstName} ${p.feeRecord.student.lastName}`,
      admissionNo: p.feeRecord.student.admissionNo,
    })),
    upcomingExams: upcomingExams.map((e) => ({
      id: e.id,
      title: e.name,
      className: e.class.name,
      startDate: e.examDate,
    })),
  };
}
