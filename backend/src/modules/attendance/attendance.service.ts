import { prisma } from "../../shared/prisma.js";
import { BadRequest, Forbidden } from "../../shared/errors.js";

const ATTENDANCE_STATUS_VALUES = ["PRESENT","ABSENT","LATE","LEAVE"] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

/** Normalise a date to midnight UTC so one record exists per day. */
function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function getAttendance(schoolId: string, sectionId?: string, date?: string) {
  if (!sectionId || !date)
    throw BadRequest("Please select a section and a date to view attendance.");

  const day = dayStart(new Date(date));
  const students = await prisma.student.findMany({
    where: { sectionId, schoolId, active: true },
    orderBy: { admissionNo: "asc" },
    select: { id: true, admissionNo: true, firstName: true, lastName: true },
  });
  const attendances = await prisma.attendance.findMany({
    where: { date: day, schoolId, student: { sectionId } },
  });
  const map = new Map(attendances.map((a) => [a.studentId, a]));
  return students.map((s) => ({
    student: s,
    status: map.get(s.id)?.status ?? null,
    remark: map.get(s.id)?.remark ?? null,
  }));
}

export async function markAttendance(
  schoolId: string,
  date: Date,
  records: { studentId: string; status: AttendanceStatus; remark?: string }[]
) {
  const day = dayStart(new Date(date));
  const ids = records.map((r) => r.studentId);
  const owned = await prisma.student.count({
    where: { id: { in: ids }, schoolId },
  });
  if (owned !== ids.length)
    throw Forbidden("One or more of the selected students do not belong to your school.");

  const results = await prisma.$transaction(
    records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        update: { status: r.status, remark: r.remark },
        create: {
          schoolId,
          studentId: r.studentId,
          date: day,
          status: r.status,
          remark: r.remark,
        },
      })
    )
  );
  return { count: results.length };
}

export async function studentSummary(schoolId: string, studentId: string) {
  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId, schoolId },
    _count: { status: true },
  });
  const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<string, number>;
  grouped.forEach((g) => (summary[g.status] = g._count.status));
  return summary;
}
