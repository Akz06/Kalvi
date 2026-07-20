import bcrypt from "bcryptjs";
import { prisma } from "../../shared/prisma.js";

const DESIGNATIONS = [
  "Principal", "Vice Principal", "Teacher", "Senior Teacher",
  "HOD", "Coordinator", "Librarian", "PE Teacher",
];

const SUBJECTS = [
  { name: "English", code: "ENG" },
  { name: "Tamil", code: "TAM" },
  { name: "Hindi", code: "HIN" },
  { name: "Mathematics", code: "MAT" },
  { name: "Science", code: "SCI" },
  { name: "Social Science", code: "SST" },
  { name: "Computer Science", code: "CS" },
  { name: "Physics", code: "PHY" },
  { name: "Chemistry", code: "CHE" },
  { name: "Biology", code: "BIO" },
  { name: "Physical Education", code: "PE" },
  { name: "Environmental Science", code: "EVS" },
];

const STAFF_SEED = [
  { firstName: "Ravi", lastName: "Kumar",   designation: "Principal",    subject: "ENG", email: "ravi.kumar@demo.com" },
  { firstName: "Priya", lastName: "Sharma", designation: "Teacher",      subject: "MAT", email: "priya.sharma@demo.com" },
  { firstName: "Anand", lastName: "Raj",    designation: "Teacher",      subject: "SCI", email: "anand.raj@demo.com" },
  { firstName: "Meena", lastName: "Devi",   designation: "Teacher",      subject: "ENG", email: "meena.devi@demo.com" },
  { firstName: "Suresh", lastName: "Babu",  designation: "Teacher",      subject: "SST", email: "suresh.babu@demo.com" },
  { firstName: "Kavitha", lastName: "S",    designation: "Senior Teacher",subject: "HIN", email: "kavitha.s@demo.com" },
  { firstName: "Muthu", lastName: "Vel",    designation: "Teacher",      subject: "TAM", email: "muthu.vel@demo.com" },
  { firstName: "Janani", lastName: "R",     designation: "Teacher",      subject: "PHY", email: "janani.r@demo.com" },
  { firstName: "Vikram", lastName: "N",     designation: "PE Teacher",   subject: "PE",  email: "vikram.n@demo.com" },
  { firstName: "Saranya", lastName: "K",    designation: "Coordinator",  subject: "CHE", email: "saranya.k@demo.com" },
];

const FIRST_NAMES = ["Aarav","Arjun","Vivaan","Aditya","Sai","Diya","Ananya","Pooja","Karan","Rohan",
  "Preethi","Lakshmi","Bharath","Nithya","Surya","Meera","Rahul","Divya","Ashwin","Kavya"];
const LAST_NAMES  = ["Kumar","Sharma","Raj","Devi","Babu","Vel","Nair","Pillai","Reddy","Iyer",
  "Murthy","Krishnan","Anand","Subramanian","Chandran","Patel","Singh","Verma","Gupta","Shah"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n: number, len = 3) { return String(n).padStart(len, "0"); }

export async function seedSchool(schoolId: string) {
  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { settings: true },
  });
  if (!school) throw new Error("School not found");

  const counts = {
    academicYear: 0, designations: 0, subjects: 0, classes: 0, sections: 0,
    staff: 0, students: 0, guardians: 0, attendance: 0, fees: 0, exams: 0,
  };

  const year = new Date().getFullYear();

  // ── 1. Academic Year ─────────────────────────────────────────────────────
  const existingYear = await prisma.academicYear.findFirst({ where: { schoolId } });
  let academicYear = existingYear;
  if (!existingYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name: `${year}-${year + 1}`,
        startDate: new Date(`${year}-06-01`),
        endDate: new Date(`${year + 1}-04-30`),
        active: true,
      },
    });
    counts.academicYear = 1;
  }

  // ── 2. Designations ──────────────────────────────────────────────────────
  for (const name of DESIGNATIONS) {
    const exists = await prisma.designation.findFirst({ where: { schoolId, name } });
    if (!exists) {
      await prisma.designation.create({ data: { schoolId, name } });
      counts.designations++;
    }
  }

  // ── 3. Subjects ──────────────────────────────────────────────────────────
  const subjectMap = new Map<string, string>(); // code → id
  for (const s of SUBJECTS) {
    let subject = await prisma.subject.findFirst({ where: { schoolId, code: s.code } });
    if (!subject) {
      subject = await prisma.subject.create({ data: { schoolId, name: s.name, code: s.code } });
      counts.subjects++;
    }
    subjectMap.set(s.code, subject.id);
  }

  // ── 4. Classes + Sections (10 classes, 2 sections each) ──────────────────
  const classMap = new Map<number, string>(); // level → classId
  const sectionList: { id: string; classId: string; level: number }[] = [];

  for (let level = 1; level <= 10; level++) {
    let cls = await prisma.schoolClass.findFirst({ where: { schoolId, level } });
    if (!cls) {
      cls = await prisma.schoolClass.create({
        data: { schoolId, level, name: `Class ${level}` },
      });
      counts.classes++;
    }
    classMap.set(level, cls.id);

    for (const sName of ["A", "B"]) {
      let sec = await prisma.section.findFirst({ where: { classId: cls.id, name: sName } });
      if (!sec) {
        sec = await prisma.section.create({ data: { schoolId, classId: cls.id, name: sName } });
        counts.sections++;
      }
      sectionList.push({ id: sec.id, classId: cls.id, level });
    }
  }

  // ── 5. Staff ─────────────────────────────────────────────────────────────
  const staffPasswordHash = await bcrypt.hash("Demo@1234", 10);
  const staffMap = new Map<string, string>(); // code → staffId

  for (let i = 0; i < STAFF_SEED.length; i++) {
    const s = STAFF_SEED[i];
    const empNo = `EMP${pad(i + 1)}`;
    const schoolEmail = `${s.email.split("@")[0]}@${school.slug}.school`;

    let staff = await prisma.staff.findFirst({ where: { schoolId, employeeNo: empNo } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          schoolId,
          employeeNo: empNo,
          firstName: s.firstName,
          lastName: s.lastName,
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          email: schoolEmail,
          phone: `9${String(8000000000 + i)}`,
          designation: s.designation,
          subject: s.subject,
          joiningDate: new Date(`${year - 2}-06-01`),
          active: true,
        },
      });
      counts.staff++;
    }
    staffMap.set(s.subject, staff.id);

    // Assign subject
    const subjectId = subjectMap.get(s.subject);
    if (subjectId) {
      const existing = await prisma.staffSubject.findFirst({
        where: { staffId: staff.id, subjectId },
      });
      if (!existing) {
        await prisma.staffSubject.create({
          data: { schoolId, staffId: staff.id, subjectId },
        });
      }
    }
  }

  // ── 6. Students + Guardians ───────────────────────────────────────────────
  const studentIds: string[] = [];
  let studentCounter = 1;

  const existingStudentCount = await prisma.student.count({ where: { schoolId } });

  if (existingStudentCount === 0) {
    for (const sec of sectionList) {
      for (let j = 0; j < 10; j++) {
        const firstName = FIRST_NAMES[(studentCounter - 1) % FIRST_NAMES.length];
        const lastName  = LAST_NAMES[(studentCounter - 1) % LAST_NAMES.length];
        const admissionNo = `${year}${pad(studentCounter, 4)}`;

        const student = await prisma.student.create({
          data: {
            schoolId,
            admissionNo,
            firstName,
            lastName,
            gender: studentCounter % 2 === 0 ? "MALE" : "FEMALE",
            dob: new Date(`${year - 10 - sec.level}-01-15`),
            guardianName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
            guardianPhone: `9${String(7000000000 + studentCounter)}`,
            sectionId: sec.id,
            admissionDate: new Date(`${year}-06-01`),
            active: true,
          },
        });
        studentIds.push(student.id);
        counts.students++;

        // Guardian
        const existingGuardian = await prisma.guardian.findFirst({
          where: { studentId: student.id },
        });
        if (!existingGuardian) {
          const gPassword = await bcrypt.hash("Parent@1234", 10);
          await prisma.guardian.create({
            data: {
              schoolId,
              studentId: student.id,
              name: student.guardianName,
              relationship: "Father",
              phone: student.guardianPhone,
              email: `parent.${admissionNo}@demo.com`,
              password: gPassword,
              isPrimary: true,
            },
          });
          counts.guardians++;
        }

        // Enrollment
        if (academicYear) {
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: { studentId: student.id, academicYearId: academicYear.id },
          });
          if (!existingEnrollment) {
            await prisma.enrollment.create({
              data: {
                schoolId,
                studentId: student.id,
                sectionId: sec.id,
                academicYearId: academicYear.id,
                status: "ACTIVE",
              },
            });
          }
        }

        studentCounter++;
      }
    }
  }

  // ── 7. Attendance (last 30 days) ─────────────────────────────────────────
  const existingAttendance = await prisma.attendance.count({ where: { schoolId } });
  if (existingAttendance === 0 && studentIds.length > 0) {
    const attendanceRows: any[] = [];
    const today = new Date();
    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dow = date.getDay();
      if (dow === 0) continue; // skip Sundays

      const dateOnly = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );

      for (const sid of studentIds) {
        const isPresent = Math.random() > 0.1;
        attendanceRows.push({
          schoolId,
          studentId: sid,
          date: dateOnly,
          status: isPresent ? "PRESENT" : "ABSENT",
        });
      }
    }

    // Insert in batches of 500
    for (let i = 0; i < attendanceRows.length; i += 500) {
      await (prisma.attendance.createMany as any)({
        data: attendanceRows.slice(i, i + 500),
        skipDuplicates: true,
      });
    }
    counts.attendance = attendanceRows.length;
  }

  // ── 8. Fee structure + records ───────────────────────────────────────────
  const existingFees = await prisma.feeRecord.count({ where: { schoolId } });
  if (existingFees === 0) {
    // Create one fee head per class level group
    const feeHeadMap = new Map<string, string>(); // classId → feeHeadId

    for (let level = 1; level <= 10; level++) {
      const classId = classMap.get(level)!;
      let feeHead = await prisma.feeHead.findFirst({
        where: { schoolId, classId, name: "Tuition Fee" },
      });
      if (!feeHead) {
        feeHead = await prisma.feeHead.create({
          data: {
            schoolId,
            classId,
            name: "Tuition Fee",
            defaultAmount: (1000 + level * 100) * 100, // in paise
            active: true,
          },
        });
      }
      feeHeadMap.set(classId, feeHead.id);
    }

    // Create fee records for each student
    const allStudents = await prisma.student.findMany({
      where: { schoolId, active: true },
      include: { section: true },
    });

    for (const student of allStudents) {
      const cls = await prisma.schoolClass.findFirst({
        where: { id: student.section.classId },
      });
      if (!cls) continue;

      const feeHeadId = feeHeadMap.get(cls.id);
      if (!feeHeadId) continue;

      const feeHead = await prisma.feeHead.findUnique({ where: { id: feeHeadId } });
      if (!feeHead) continue;

      const feeRecord = await prisma.feeRecord.create({
        data: {
          schoolId,
          studentId: student.id,
          academicYearId: academicYear?.id ?? null,
          title: "Annual Tuition Fee",
          amount: feeHead.defaultAmount,
          amountPaid: 0,
          status: "PENDING",
          dueDate: new Date(`${year}-07-31`),
        },
      });
      counts.fees++;

      // 70% chance of payment
      if (Math.random() > 0.3) {
        const receiptNo = `RCP${year}${pad(counts.fees, 5)}`;
        await prisma.feePayment.create({
          data: {
            schoolId,
            feeRecordId: feeRecord.id,
            amount: feeHead.defaultAmount,
            mode: "CASH",
            receiptNo,
            paidAt: new Date(`${year}-07-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`),
          },
        });
        await prisma.feeRecord.update({
          where: { id: feeRecord.id },
          data: {
            amountPaid: feeHead.defaultAmount,
            status: "PAID",
          },
        });
      }
    }
  }

  // ── 9. Exams ─────────────────────────────────────────────────────────────
  const existingExams = await prisma.exam.count({ where: { schoolId } });
  if (existingExams === 0) {
    const examSubjects = ["ENG", "MAT", "SCI", "SST", "HIN"];
    const examClasses = [1, 5, 10];
    for (const level of examClasses) {
      const classId = classMap.get(level)!;
      for (const code of examSubjects) {
        const subjectId = subjectMap.get(code);
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + 30 + Math.floor(Math.random() * 30));

        await prisma.exam.create({
          data: {
            schoolId,
            classId,
            academicYearId: academicYear?.id ?? null,
            name: `Term 1 - ${code}`,
            subject: code,
            subjectId: subjectId ?? null,
            maxMarks: 100,
            examDate,
          },
        });
        counts.exams++;
      }
    }
  }

  return {
    message: "Dummy data created successfully.",
    school: school.name,
    counts,
  };
}
