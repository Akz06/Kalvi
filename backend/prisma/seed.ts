import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const DEFAULT_FEATURES = {
  students: true,
  staff: true,
  classes: true,
  attendance: true,
  fees: true,
  exams: true,
  parentPortal: true,
  academicYears: true,
};

async function provision(
  schoolId: string,
  min: number,
  max: number,
  sectionCount: number
) {
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

async function createSchool(opts: {
  slug: string;
  name: string;
  city: string;
  board: string;
  adminEmail: string;
  adminPassword: string;
  min: number;
  max: number;
  sections: number;
}) {
  const hashed = await bcrypt.hash(opts.adminPassword, 10);
  const school = await prisma.school.upsert({
    where: { slug: opts.slug },
    update: {},
    create: {
      slug: opts.slug,
      name: opts.name,
      settings: {
        create: {
          city: opts.city,
          state: "Tamil Nadu",
          board: opts.board,
          academicYear: "2024-2025",
          minClassLevel: opts.min,
          maxClassLevel: opts.max,
          sectionsPerClass: opts.sections,
          features: JSON.stringify(DEFAULT_FEATURES),
        },
      },
      users: {
        create: {
          name: `${opts.name} Administrator`,
          email: opts.adminEmail,
          password: hashed,
          role: "ADMIN" as const,
        },
      },
    },
  });
  await provision(school.id, opts.min, opts.max, opts.sections);

  // Per-class fee heads — amounts scale with class level. Amounts stored in
  // MINOR units (paise), so ₹8,000 => 800000.
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    orderBy: { level: "asc" },
  });
  for (const cls of classes) {
    // Base amounts grow with the class level; higher classes add a Lab Fee.
    const tuition = (8000 + cls.level * 400) * 100;
    const transport = 3000 * 100;
    const library = 500 * 100;
    const exam = (500 + cls.level * 50) * 100;
    const heads: { name: string; defaultAmount: number }[] = [
      { name: "Tuition Fee", defaultAmount: tuition },
      { name: "Transport Fee", defaultAmount: transport },
      { name: "Library Fee", defaultAmount: library },
      { name: "Examination Fee", defaultAmount: exam },
    ];
    if (cls.level >= 6) heads.push({ name: "Lab Fee", defaultAmount: 2500 * 100 });
    for (const h of heads) {
      await prisma.feeHead.upsert({
        where: { classId_name: { classId: cls.id, name: h.name } },
        update: {},
        create: {
          schoolId: school.id,
          classId: cls.id,
          name: h.name,
          defaultAmount: h.defaultAmount,
        },
      });
    }
  }

  console.log(
    `✓ School "${opts.name}" (${opts.slug}) — admin: ${opts.adminEmail}`
  );
  return school;
}

async function main() {
  // School 1 — the original Chennai school (Classes 1–12, sections A & B)
  const greenwood = await createSchool({
    slug: "greenwood",
    name: "Greenwood Public School",
    city: "Chennai",
    board: "CBSE",
    adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@school.local",
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
    min: 1,
    max: 12,
    sections: 2,
  });

  // Sample teacher for school 1
  await prisma.staff.upsert({
    where: { schoolId_employeeNo: { schoolId: greenwood.id, employeeNo: "EMP001" } },
    update: {},
    create: {
      schoolId: greenwood.id,
      employeeNo: "EMP001",
      firstName: "Priya",
      lastName: "Raman",
      gender: "FEMALE" as const,
      email: "priya.raman@greenwood.local",
      phone: "9840012345",
      designation: "Teacher",
      subject: "Mathematics",
    },
  });

  // School 2 — demonstrates multi-tenancy with a different configuration
  await createSchool({
    slug: "sunrise",
    name: "Sunrise Academy",
    city: "Coimbatore",
    board: "STATE",
    adminEmail: "admin@sunrise.local",
    adminPassword: "Admin@123",
    min: 1,
    max: 10,
    sections: 3,
  });

  // ── Academic years for Greenwood ──────────────────────────
  const prevYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: greenwood.id, name: "2023-2024" } },
    update: {},
    create: {
      schoolId: greenwood.id,
      name: "2023-2024",
      startDate: new Date("2023-06-01"),
      endDate: new Date("2024-04-30"),
      active: false,
    },
  });

  const currentYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: greenwood.id, name: "2024-2025" } },
    update: {},
    create: {
      schoolId: greenwood.id,
      name: "2024-2025",
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-04-30"),
      active: true,
    },
  });

  // Sample student for Greenwood (Class 1 - A)
  const class1 = await prisma.class.findFirst({
    where: { schoolId: greenwood.id, level: 1 },
    include: { sections: true },
  });
  if (class1) {
    const sectionA = class1.sections.find((s) => s.name === "A");
    if (sectionA) {
      const student = await prisma.student.upsert({
        where: { schoolId_admissionNo: { schoolId: greenwood.id, admissionNo: "GW001" } },
        update: {},
        create: {
          schoolId: greenwood.id,
          admissionNo: "GW001",
          firstName: "Arun",
          lastName: "Vijay",
          gender: "MALE" as const,
          dob: new Date("2015-05-12"),
          guardianName: "Vijay Kumar",
          guardianPhone: "9841012345",
          sectionId: sectionA.id,
        },
      });

      // Enroll in both years to demonstrate history
      await prisma.enrollment.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: prevYear.id } },
        update: {},
        create: {
          schoolId: greenwood.id,
          studentId: student.id,
          sectionId: sectionA.id,
          academicYearId: prevYear.id,
          status: "PROMOTED",
          promotedAt: new Date("2024-04-30"),
        },
      });

      await prisma.enrollment.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: currentYear.id } },
        update: {},
        create: {
          schoolId: greenwood.id,
          studentId: student.id,
          sectionId: sectionA.id,
          academicYearId: currentYear.id,
          status: "ACTIVE",
        },
      });

      // ── Seed a sample guardian (parent portal demo) ──────────────────────
      const guardianPwd = await bcrypt.hash("Parent@123", 10);
      await prisma.guardian.upsert({
        where: { schoolId_email: { schoolId: greenwood.id, email: "vijay@parent.local" } },
        update: {},
        create: {
          schoolId: greenwood.id,
          studentId: student.id,
          name: "Vijay Kumar",
          relationship: "Father",
          phone: "9841012345",
          email: "vijay@parent.local",
          password: guardianPwd,
          isPrimary: true,
        },
      });
      console.log("  ↳ Guardian seeded → vijay@parent.local / Parent@123");
    }
  }

  console.log("\nSeed complete. Two demo schools created.");
  console.log("  greenwood → admin@school.local / Admin@123 (Classes 1–12, A/B)");
  console.log("  sunrise   → admin@sunrise.local / Admin@123 (Classes 1–10, A/B/C)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
