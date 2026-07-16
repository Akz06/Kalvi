import { prisma } from "../../shared/prisma.js";
import { toMajor } from "../../shared/money.js";

export async function getStats(schoolId: string) {
  const today = new Date();
  const dayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  // ── yesterday for attendance trend ──────────────────────────
  const yesterdayUTC = new Date(dayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  // ── last 7 days for attendance sparkline ────────────────────
  const sevenDaysAgo = new Date(dayUTC);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  // ── current month boundaries ─────────────────────────────────
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

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
    // total active students
    prisma.student.count({ where: { schoolId, active: true } }),

    // new admissions this month
    prisma.student.count({
      where: {
        schoolId,
        active: true,
        createdAt: { gte: monthStart },
      },
    }),

    // active staff
    prisma.staff.count({ where: { schoolId, active: true } }),

    // classes & sections
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),

    // outstanding fees
    prisma.feeRecord.aggregate({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true, amountPaid: true },
    }),

    // fee collected this month
    prisma.feePayment.aggregate({
      where: {
        schoolId,
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // exam count
    prisma.exam.count({ where: { schoolId } }),

    // today attendance
    prisma.attendance.count({
      where: { schoolId, date: dayUTC, status: "PRESENT" },
    }),

    // yesterday attendance
    prisma.attendance.count({
      where: { schoolId, date: yesterdayUTC, status: "PRESENT" },
    }),

    // last 7 days attendance (for sparkline)
    prisma.attendance.groupBy({
      by: ["date", "status"],
      where: {
        schoolId,
        date: { gte: sevenDaysAgo, lte: dayUTC },
      },
      _count: { status: true },
    }),

    // 5 most recent payments
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

    // next 5 upcoming exams
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

    // absent today
    prisma.attendance.count({
      where: { schoolId, date: dayUTC, status: "ABSENT" },
    }),
  ]);

  const dueMinor = (pendingFees._sum.amount ?? 0) - (pendingFees._sum.amountPaid ?? 0);

  // Build 7-day sparkline [{date, present, absent}]
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

  // Attendance trend vs yesterday
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
