import { prisma } from "../../shared/prisma.js";
import { NotFound } from "../../shared/errors.js";
import { computeGrade } from "../../shared/config.js";

export async function listExams(schoolId: string, classId?: string) {
  return prisma.exam.findMany({
    where: { schoolId, ...(classId ? { classId } : {}) },
    orderBy: { examDate: "desc" },
    include: {
      class: { select: { name: true, level: true } },
      _count: { select: { results: true } },
    },
  });
}

export async function createExam(schoolId: string, body: any) {
  const cls = await prisma.schoolClass.findFirst({ where: { id: body.classId, schoolId } });
  if (!cls) throw NotFound("The selected class was not found in your school.");
  return prisma.exam.create({
    data: { ...body, maxMarks: body.maxMarks ?? 100, schoolId },
  });
}

export async function getExamDetail(schoolId: string, id: string) {
  const exam = await prisma.exam.findFirst({
    where: { id, schoolId },
    include: { class: true, results: true },
  });
  if (!exam) throw NotFound("That exam could not be found in your school.");

  const students = await prisma.student.findMany({
    where: { schoolId, active: true, section: { classId: exam.classId } },
    orderBy: { admissionNo: "asc" },
    select: { id: true, admissionNo: true, firstName: true, lastName: true },
  });
  const byStudent = new Map(exam.results.map((r) => [r.studentId, r]));
  return {
    exam: {
      id: exam.id,
      name: exam.name,
      subject: exam.subject,
      maxMarks: exam.maxMarks,
      examDate: exam.examDate,
      class: exam.class,
    },
    roster: students.map((s) => ({
      student: s,
      marksObtained: byStudent.get(s.id)?.marksObtained ?? null,
      grade: byStudent.get(s.id)?.grade ?? null,
      remark: byStudent.get(s.id)?.remark ?? null,
    })),
  };
}

export async function recordResults(
  schoolId: string,
  examId: string,
  results: { studentId: string; marksObtained: number; remark?: string }[]
) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) throw NotFound("That exam could not be found in your school.");

  const ops = results.map((r) => {
    const { grade } = computeGrade(r.marksObtained, exam.maxMarks);
    return prisma.examResult.upsert({
      where: { examId_studentId: { examId: exam.id, studentId: r.studentId } },
      update: { marksObtained: r.marksObtained, grade, remark: r.remark },
      create: {
        schoolId,
        examId: exam.id,
        studentId: r.studentId,
        marksObtained: r.marksObtained,
        grade,
        remark: r.remark,
      },
    });
  });
  const saved = await prisma.$transaction(ops);
  return { count: saved.length };
}

export async function studentReport(schoolId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: { section: { include: { class: true } } },
  });
  if (!student) throw NotFound("That student could not be found in your school.");

  const results = await prisma.examResult.findMany({
    where: { studentId: student.id, schoolId },
    include: { exam: true },
    orderBy: { exam: { examDate: "asc" } },
  });

  const totalObtained = results.reduce((s, r) => s + r.marksObtained, 0);
  const totalMax = results.reduce((s, r) => s + r.exam.maxMarks, 0);
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const overall = computeGrade(totalObtained, totalMax);

  return {
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: `${student.firstName} ${student.lastName}`,
      class: student.section.class.name,
      section: student.section.name,
    },
    results: results.map((r) => ({
      exam: r.exam.name,
      subject: r.exam.subject,
      examDate: r.exam.examDate,
      marksObtained: r.marksObtained,
      maxMarks: r.exam.maxMarks,
      grade: r.grade,
      remark: r.remark,
    })),
    summary: {
      totalObtained,
      totalMax,
      percentage: Math.round(percentage * 100) / 100,
      overallGrade: overall.grade,
    },
  };
}
