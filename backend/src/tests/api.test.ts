import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { prepareTestDb, cleanupTestDb } from "./setup.js";

// Prepare DB & env BEFORE importing app / prisma so DATABASE_URL is correct.
prepareTestDb();

const { createApp } = await import("../app.js");
const { prisma } = await import("../lib/prisma.js");

const app = createApp();

let token = "";
let otherToken = "";
let schoolId = "";
let sectionId = "";
let classId = "";
let studentId = "";
let feeId = "";
let examId = "";
let feeHeadId = "";
let feeHeadId2 = "";
let yearId = "";
let prevYearId = "";

async function makeSchool(slug: string, adminEmail: string) {
  const hashed = await bcrypt.hash("Admin@123", 10);
  const school = await prisma.school.create({
    data: {
      slug,
      name: `${slug} School`,
      settings: { create: {} },
      users: {
        create: {
          name: "Admin",
          email: adminEmail,
          password: hashed,
          role: "ADMIN",
        },
      },
    },
  });
  const cls = await prisma.schoolClass.create({
    data: { schoolId: school.id, level: 1, name: "Class 1" },
  });
  const section = await prisma.section.create({
    data: { schoolId: school.id, name: "A", classId: cls.id },
  });
  return { school, cls, section };
}

beforeAll(async () => {
  const a = await makeSchool("alpha", "admin@alpha.local");
  schoolId = a.school.id;
  sectionId = a.section.id;
  classId = a.cls.id;
  await makeSchool("beta", "admin@beta.local");
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("Auth (multi-tenant)", () => {
  it("rejects invalid credentials with a clear message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "alpha", email: "admin@alpha.local", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.error.toLowerCase()).toContain("couldn't find an account");
  });

  it("gives a clear message for a short password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "alpha", email: "admin@alpha.local", password: "12" });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("Password must be at least 6 characters");
  });

  it("gives a clear message for an unknown school code", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "does-not-exist", email: "x@y.local", password: "Admin@123" });
    expect(res.status).toBe(401);
    expect(res.body.error.toLowerCase()).toContain("school with that code");
  });

  it("logs in scoped to a school and returns schoolId", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "alpha", email: "admin@alpha.local", password: "Admin@123" });
    expect(res.status).toBe(200);
    expect(res.body.user.schoolId).toBe(schoolId);
    token = res.body.token;
  });

  it("logs in the second school's admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "beta", email: "admin@beta.local", password: "Admin@123" });
    expect(res.status).toBe(200);
    otherToken = res.body.token;
  });
});

describe("Onboarding", () => {
  it("registers a new school with configurable class range", async () => {
    const res = await request(app)
      .post("/api/schools/register")
      .send({
        school: { name: "Gamma High", slug: "gamma" },
        admin: { name: "G Admin", email: "admin@gamma.local", password: "Admin@123" },
        settings: { city: "Madurai", board: "ICSE", minClassLevel: 6, maxClassLevel: 8, sectionsPerClass: 2 },
      });
    expect(res.status).toBe(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "gamma", email: "admin@gamma.local", password: "Admin@123" });
    const gToken = login.body.token;
    const classes = await request(app)
      .get("/api/classes")
      .set("Authorization", `Bearer ${gToken}`);
    // levels 6,7,8 => 3 classes
    expect(classes.body.length).toBe(3);
  });
});

describe("Settings preference form", () => {
  it("updates settings and feature flags", async () => {
    const res = await request(app)
      .put("/api/schools/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ city: "Chennai", board: "CBSE", features: { parentPortal: true } });
    expect(res.status).toBe(200);
    expect(res.body.settings.city).toBe("Chennai");
    expect(res.body.features.parentPortal).toBe(true);
  });

  it("rejects an invalid class range with a clear message", async () => {
    const res = await request(app)
      .put("/api/schools/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ minClassLevel: 10, maxClassLevel: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(
      "Lowest class level cannot be greater than the highest class level."
    );
  });

  it("rejects an invalid currency code with a clear message", async () => {
    const res = await request(app)
      .put("/api/schools/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ currency: "RUPEES" });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("3-letter ISO code");
  });
});

describe("Students CRUD (tenant scoped)", () => {
  it("creates a student", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        admissionNo: "ADM001",
        firstName: "Arjun",
        lastName: "Kumar",
        gender: "MALE",
        dob: "2015-06-01",
        guardianName: "Suresh Kumar",
        guardianPhone: "9840099999",
        sectionId,
      });
    expect(res.status).toBe(201);
    studentId = res.body.id;
  });

  it("rejects invalid student payload with clear, field-level messages", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "NoAdmission" });
    expect(res.status).toBe(400);
    // Friendly summary message
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.toLowerCase()).toContain("required");
    // Structured field issues for inline display
    expect(Array.isArray(res.body.details)).toBe(true);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("Admission number is required.");
    expect(messages).toContain("Guardian name is required.");
  });

  it("returns a readable message for an invalid guardian phone", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        admissionNo: "ADM777",
        firstName: "Test",
        lastName: "User",
        gender: "MALE",
        dob: "2015-01-01",
        guardianName: "Parent",
        guardianPhone: "12",
        sectionId,
      });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("Guardian phone must be at least 6 digits.");
  });

  it("reports a friendly duplicate error for a repeated admission number", async () => {
    const payload = {
      admissionNo: "DUP001",
      firstName: "First",
      lastName: "Enrol",
      gender: "MALE",
      dob: "2015-01-01",
      guardianName: "Parent",
      guardianPhone: "9840012345",
      sectionId,
    };
    const first = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(dup.status).toBe(409);
    expect(dup.body.error).toContain("admission number");
  });

  it("isolates students between schools", async () => {
    const mine = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${token}`);
    // ADM001 + DUP001 were created in this school; the invalid ones were rejected.
    expect(mine.body.length).toBe(2);

    const others = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(others.body.length).toBe(0);
  });

  it("prevents cross-tenant access to a student", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe("Attendance", () => {
  it("marks attendance for a section", async () => {
    const res = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2024-07-01",
        sectionId,
        records: [{ studentId, status: "PRESENT" }],
      });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });

  it("blocks marking a student from another school", async () => {
    const res = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        date: "2024-07-01",
        sectionId,
        records: [{ studentId, status: "PRESENT" }],
      });
    expect(res.status).toBe(403);
  });
});

describe("Fee configuration (fee heads, per class)", () => {
  it("creates class-scoped fee heads", async () => {
    const a = await request(app)
      .post("/api/fees/heads")
      .set("Authorization", `Bearer ${token}`)
      .send({ classId, name: "Tuition Fee", defaultAmount: 8000 });
    expect(a.status).toBe(201);
    expect(a.body.classId).toBe(classId);
    expect(a.body.defaultAmount).toBe(8000); // returned in major units
    feeHeadId = a.body.id;

    const b = await request(app)
      .post("/api/fees/heads")
      .set("Authorization", `Bearer ${token}`)
      .send({ classId, name: "Transport Fee", defaultAmount: 2000 });
    expect(b.status).toBe(201);
    feeHeadId2 = b.body.id;
  });

  it("requires a class when creating a fee head", async () => {
    const res = await request(app)
      .post("/api/fees/heads")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "No Class Fee", defaultAmount: 100 });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages.toLowerCase()).toContain("class is required");
  });

  it("rejects a duplicate fee head in the same class", async () => {
    const res = await request(app)
      .post("/api/fees/heads")
      .set("Authorization", `Bearer ${token}`)
      .send({ classId, name: "Tuition Fee" });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("filters fee heads by class and isolates by school", async () => {
    const mine = await request(app)
      .get(`/api/fees/heads?classId=${classId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(mine.body.length).toBe(2);

    const others = await request(app)
      .get("/api/fees/heads")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(others.body.length).toBe(0);
  });
});

describe("Fees", () => {
  it("creates a fee invoice with multiple fee-head line items", async () => {
    const res = await request(app)
      .post("/api/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        title: "Term 1 Fees",
        dueDate: "2024-08-01",
        items: [
          { feeHeadId, amount: 8000 },
          { feeHeadId: feeHeadId2, amount: 2000 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
    // Total is the sum of the two line items (major units on the wire).
    expect(res.body.amount).toBe(10000);
    expect(res.body.items.length).toBe(2);
    expect(res.body.items[0].amount).toBe(8000);
    feeId = res.body.id;
  });

  it("requires at least one fee-head line item", async () => {
    const res = await request(app)
      .post("/api/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({ studentId, title: "Empty", dueDate: "2024-08-01", items: [] });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("at least one fee head");
  });

  it("rejects duplicate fee heads in the same invoice", async () => {
    const res = await request(app)
      .post("/api/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        title: "Dup heads",
        dueDate: "2024-08-01",
        items: [
          { feeHeadId, amount: 100 },
          { feeHeadId, amount: 200 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("only appear once");
  });

  it("records a partial payment into the ledger with a mode + receipt", async () => {
    const res = await request(app)
      .post(`/api/fees/${feeId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 4000, mode: "UPI", reference: "TXN123" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PARTIAL");
    expect(res.body.amountPaid).toBe(4000); // major units
    expect(res.body.receiptNo).toBeTruthy();
    // Payment appears in the immutable ledger.
    expect(res.body.payments.length).toBe(1);
    expect(res.body.payments[0].mode).toBe("UPI");
    expect(res.body.payments[0].amount).toBe(4000);
  });

  it("rejects overpayment with the remaining balance in the message", async () => {
    const res = await request(app)
      .post(`/api/fees/${feeId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("more than the amount due");
  });

  it("rejects a non-positive line amount with a clear message", async () => {
    const res = await request(app)
      .post("/api/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        title: "Bad",
        dueDate: "2024-08-01",
        items: [{ feeHeadId, amount: 0 }],
      });
    expect(res.status).toBe(400);
    const messages = res.body.details.map((d: any) => d.message).join(" ");
    expect(messages).toContain("Each line amount must be greater than zero.");
  });

  it("completes payment, issues a receipt, and records both ledger entries", async () => {
    const res = await request(app)
      .post(`/api/fees/${feeId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 6000 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PAID");
    expect(res.body.receiptNo).toBeTruthy();
    expect(res.body.amountPaid).toBe(10000);
    expect(res.body.payments.length).toBe(2); // 4000 + 6000
  });

  it("rejects a fee head from another class on an invoice", async () => {
    // Create a head on a different class (level 2) in the same school.
    const cls2 = await prisma.schoolClass.create({
      data: { schoolId, level: 2, name: "Class 2" },
    });
    const otherHead = await prisma.feeHead.create({
      data: { schoolId, classId: cls2.id, name: "Tuition Fee", defaultAmount: 100000 },
    });
    const res = await request(app)
      .post("/api/fees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        title: "Wrong class head",
        dueDate: "2024-08-01",
        items: [{ feeHeadId: otherHead.id, amount: 1000 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("do not belong to this student's class");
  });
});

describe("Phase 2 — Exams & Report Cards", () => {
  it("creates an exam", async () => {
    const res = await request(app)
      .post("/api/exams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Term 1", classId, subject: "Mathematics", maxMarks: 100, examDate: "2024-09-01" });
    expect(res.status).toBe(201);
    examId = res.body.id;
  });

  it("records results and auto-computes grade", async () => {
    const res = await request(app)
      .post(`/api/exams/${examId}/results`)
      .set("Authorization", `Bearer ${token}`)
      .send({ results: [{ studentId, marksObtained: 85 }] });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });

  it("generates a student report card with overall grade", async () => {
    const res = await request(app)
      .get(`/api/exams/student/${studentId}/report`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].grade).toBe("A"); // 85% => A
    expect(res.body.summary.overallGrade).toBe("A");
  });
});

describe("Phase 3 — Report Card API (PDF data source)", () => {
  it("returns a complete report card payload for a student", async () => {
    const res = await request(app)
      .get(`/api/exams/student/${studentId}/report`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    // Student profile block
    expect(res.body.student).toBeDefined();
    expect(res.body.student.admissionNo).toBe("ADM001");
    expect(res.body.student.name).toMatch(/\w+ \w+/);
    expect(res.body.student.class).toBeDefined();
    expect(res.body.student.section).toBeDefined();

    // Results table — at least the exam recorded above
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    const r = res.body.results[0];
    expect(r).toHaveProperty("exam");
    expect(r).toHaveProperty("subject");
    expect(r).toHaveProperty("examDate");
    expect(r).toHaveProperty("marksObtained");
    expect(r).toHaveProperty("maxMarks");
    expect(r).toHaveProperty("grade");

    // Summary block
    expect(res.body.summary).toMatchObject({
      totalObtained: expect.any(Number),
      totalMax: expect.any(Number),
      percentage: expect.any(Number),
      overallGrade: expect.any(String),
    });
    expect(res.body.summary.overallGrade).toBe("A"); // 85 / 100 = 85% => A
    expect(res.body.summary.percentage).toBeCloseTo(85, 1);
  });

  it("returns 404 for a student in another school", async () => {
    const res = await request(app)
      .get(`/api/exams/student/${studentId}/report`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("returns empty results for a student with no exam entries", async () => {
    // Create a fresh student with no results
    const newStudent = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        admissionNo: "NEW001",
        firstName: "Fresh",
        lastName: "Student",
        gender: "FEMALE",
        dob: "2012-06-15",
        guardianName: "Guardian",
        guardianPhone: "9940012345",
        sectionId,
      });
    expect(newStudent.status).toBe(201);
    const newId = newStudent.body.id;

    const res = await request(app)
      .get(`/api/exams/student/${newId}/report`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
    expect(res.body.summary.totalMax).toBe(0);
    expect(res.body.summary.percentage).toBe(0);
  });

  it("returns the fee ledger with payments for receipt PDF", async () => {
    // Verify the fee endpoint includes the payments array (used to render receipts).
    const res = await request(app)
      .get("/api/fees")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const paidFee = res.body.find((f: any) => f.status === "PAID");
    expect(paidFee).toBeDefined();
    expect(Array.isArray(paidFee.payments)).toBe(true);
    expect(paidFee.payments.length).toBe(2); // 4000 + 6000

    // Each payment has the fields needed for a receipt PDF.
    const p = paidFee.payments[0];
    expect(p).toHaveProperty("receiptNo");
    expect(p).toHaveProperty("paidAt");
    expect(p).toHaveProperty("amount");
    expect(p).toHaveProperty("mode");

    // Fee items (fee-head breakdown) are present.
    expect(Array.isArray(paidFee.items)).toBe(true);
    expect(paidFee.items.length).toBe(2);
    expect(paidFee.items[0]).toHaveProperty("feeHead");
    expect(paidFee.items[0].feeHead).toHaveProperty("name");
  });
});

describe("Phase 3 — Academic Years & Enrollment/Promotion", () => {
  it("creates an academic year and activates it", async () => {
    // Create previous year (inactive)
    const prev = await request(app)
      .post("/api/academic-years")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "2023-2024", startDate: "2023-06-01", endDate: "2024-04-30" });
    expect(prev.status).toBe(201);
    expect(prev.body.active).toBe(false);
    prevYearId = prev.body.id;

    // Create current year
    const curr = await request(app)
      .post("/api/academic-years")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "2024-2025", startDate: "2024-06-01", endDate: "2025-04-30", active: true });
    expect(curr.status).toBe(201);
    expect(curr.body.active).toBe(true);
    yearId = curr.body.id;
  });

  it("rejects an academic year with end date before start date", async () => {
    const res = await request(app)
      .post("/api/academic-years")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bad Year", startDate: "2025-06-01", endDate: "2024-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: any) => d.message).join(" ")).toContain(
      "End date must be after the start date."
    );
  });

  it("rejects a duplicate academic year name", async () => {
    const res = await request(app)
      .post("/api/academic-years")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "2024-2025", startDate: "2024-06-01", endDate: "2025-04-30" });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("lists academic years and shows enrollment counts", async () => {
    const res = await request(app)
      .get("/api/academic-years")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const current = res.body.find((y: any) => y.active === true);
    expect(current).toBeDefined();
    expect(current._count).toHaveProperty("enrollments");
  });

  it("activates a year (deactivates all others)", async () => {
    // Activate the previous year — should make 2024-2025 inactive
    const res = await request(app)
      .post(`/api/academic-years/${prevYearId}/activate`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);

    // Now list — only prevYear should be active
    const list = await request(app)
      .get("/api/academic-years")
      .set("Authorization", `Bearer ${token}`);
    const activeYears = list.body.filter((y: any) => y.active);
    expect(activeYears.length).toBe(1);
    expect(activeYears[0].id).toBe(prevYearId);

    // Re-activate current year for subsequent tests
    await request(app)
      .post(`/api/academic-years/${yearId}/activate`)
      .set("Authorization", `Bearer ${token}`);
  });

  it("enrolls a student in an academic year", async () => {
    const res = await request(app)
      .post(`/api/academic-years/${yearId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ studentId, sectionId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.student.id).toBe(studentId);
    expect(res.body.academicYear.id).toBe(yearId);
  });

  it("rejects duplicate enrollment for the same student and year", async () => {
    const res = await request(app)
      .post(`/api/academic-years/${yearId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ studentId, sectionId });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already enrolled");
  });

  it("lists enrollments for a year", async () => {
    const res = await request(app)
      .get(`/api/academic-years/${yearId}/enrollments`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("student");
    expect(res.body[0]).toHaveProperty("section");
    expect(res.body[0]).toHaveProperty("academicYear");
  });

  it("promotes a student from one year to another", async () => {
    // Create a fresh student to avoid enrollment conflicts with ADM001.
    const newStu = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        admissionNo: "PROMO001",
        firstName: "Promote",
        lastName: "Test",
        gender: "MALE",
        dob: "2014-03-10",
        guardianName: "Guardian",
        guardianPhone: "9840099000",
        sectionId,
      });
    expect(newStu.status).toBe(201);
    const promoStudentId = newStu.body.id;

    // Enroll them in the previous year
    const enrollPrev = await request(app)
      .post(`/api/academic-years/${prevYearId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ studentId: promoStudentId, sectionId });
    expect(enrollPrev.status).toBe(201);

    // Promote to current year
    const res = await request(app)
      .post("/api/academic-years/promote")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fromYearId: prevYearId,
        toYearId: yearId,
        promotions: [{ studentId: promoStudentId, toSectionId: sectionId, action: "PROMOTED" }],
      });
    expect(res.status).toBe(200);
    expect(res.body.promoted).toBeGreaterThanOrEqual(1);

    // Verify enrollment history shows 2 entries (PROMOTED + ACTIVE)
    const history = await request(app)
      .get(`/api/academic-years/students/${promoStudentId}/history`)
      .set("Authorization", `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.length).toBe(2);
    const statuses = history.body.map((h: any) => h.status);
    expect(statuses).toContain("PROMOTED");
    expect(statuses).toContain("ACTIVE");
  });

  it("returns the full enrollment history for a student", async () => {
    // studentId (ADM001) was enrolled in yearId in the "enrolls a student" test
    const res = await request(app)
      .get(`/api/academic-years/students/${studentId}/history`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const entry = res.body[0];
    expect(entry).toHaveProperty("academicYear");
    expect(entry).toHaveProperty("section");
    expect(entry).toHaveProperty("status");
  });

  it("rejects promotion when source and destination years are the same", async () => {
    const res = await request(app)
      .post("/api/academic-years/promote")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fromYearId: yearId,
        toYearId: yearId,
        promotions: [{ studentId, toSectionId: sectionId, action: "PROMOTED" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("must be different");
  });

  it("blocks cross-tenant access to academic years", async () => {
    const res = await request(app)
      .get("/api/academic-years")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // beta school has no years
  });

  it("rejects an empty promotion batch", async () => {
    const res = await request(app)
      .post("/api/academic-years/promote")
      .set("Authorization", `Bearer ${token}`)
      .send({ fromYearId: prevYearId, toYearId: yearId, promotions: [] });
    expect(res.status).toBe(400);
    const msgs = res.body.details?.map((d: any) => d.message).join(" ") ?? res.body.error;
    expect(msgs).toContain("at least one student");
  });
});

describe("Dashboard", () => {
  it("returns aggregate stats for the tenant", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // ADM001 + DUP001 + NEW001 + PROMO001 were successfully created in this school.
    expect(res.body.students).toBe(4);
    expect(res.body.outstandingFees).toBe(0);
    expect(res.body.exams).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Parent Portal
// ─────────────────────────────────────────────────────────────────────────────

let guardianId = "";
let parentToken = "";

describe("Phase 3 — Guardian Management (admin side)", () => {
  it("creates a guardian for a student with valid credentials", async () => {
    const res = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "Ramesh Kumar",
        relationship: "Father",
        phone: "9840011111",
        email: "ramesh@parent.test",
        password: "Parent@123",
        isPrimary: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Ramesh Kumar");
    expect(res.body.isPrimary).toBe(true);
    expect(res.body).not.toHaveProperty("password"); // password never returned
    guardianId = res.body.id;
  });

  it("rejects a duplicate guardian email within the same school", async () => {
    const res = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "Duplicate",
        relationship: "Mother",
        phone: "9840022222",
        email: "ramesh@parent.test", // same email
        password: "Parent@123",
      });
    expect(res.status).toBe(409);
    expect(res.body.error.toLowerCase()).toContain("already registered");
  });

  it("rejects adding a 3rd guardian when student already has 2", async () => {
    // Add the second guardian first
    const second = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "Meena Kumar",
        relationship: "Mother",
        phone: "9840033333",
        email: "meena@parent.test",
        password: "Parent@123",
        isPrimary: false,
      });
    expect(second.status).toBe(201);

    // Third should fail
    const third = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "Uncle",
        relationship: "Guardian",
        phone: "9840044444",
        email: "uncle@parent.test",
        password: "Parent@123",
      });
    expect(third.status).toBe(400);
    expect(third.body.error).toContain("at most 2 guardians");
  });

  it("lists guardians for a student", async () => {
    const res = await request(app)
      .get(`/api/guardians?studentId=${studentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("student");
    expect(res.body[0]).not.toHaveProperty("password");
  });

  it("updates guardian details", async () => {
    const res = await request(app)
      .put(`/api/guardians/${guardianId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "9840099999", relationship: "Father" });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe("9840099999");
  });

  it("rejects a guardian with an invalid phone number", async () => {
    const res = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "Bad Phone",
        relationship: "Parent",
        phone: "abc",
        email: "badphone@parent.test",
        password: "Parent@123",
      });
    expect(res.status).toBe(400);
    const msgs = res.body.details.map((d: any) => d.message).join(" ");
    expect(msgs.toLowerCase()).toContain("phone");
  });

  it("rejects missing relationship field with a clear message", async () => {
    const res = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId,
        name: "No Relation",
        phone: "9840055555",
        email: "norel@parent.test",
        password: "Parent@123",
        // relationship missing
      });
    expect(res.status).toBe(400);
    const msgs = res.body.details.map((d: any) => d.message).join(" ");
    expect(msgs.toLowerCase()).toContain("relationship");
  });

  it("blocks cross-tenant access to guardians", async () => {
    const res = await request(app)
      .get(`/api/guardians?studentId=${studentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // beta school sees nothing
  });
});

describe("Phase 3 — Parent Portal login & read-only views", () => {
  it("logs in as a parent and receives a PARENT-role JWT", async () => {
    const res = await request(app)
      .post("/api/parent/auth/login")
      .send({
        schoolSlug: "alpha",
        email: "ramesh@parent.test",
        password: "Parent@123",
      });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.guardian.name).toBe("Ramesh Kumar");
    expect(res.body.guardian.school.slug).toBe("alpha");
    parentToken = res.body.token;
  });

  it("rejects parent login with wrong password", async () => {
    const res = await request(app)
      .post("/api/parent/auth/login")
      .send({ schoolSlug: "alpha", email: "ramesh@parent.test", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.error.toLowerCase()).toContain("couldn't find a guardian");
  });

  it("rejects parent login for an unknown school code", async () => {
    const res = await request(app)
      .post("/api/parent/auth/login")
      .send({ schoolSlug: "nonexistent", email: "ramesh@parent.test", password: "Parent@123" });
    expect(res.status).toBe(401);
    expect(res.body.error.toLowerCase()).toContain("couldn't find a school");
  });

  it("returns the guardian profile with child details", async () => {
    const res = await request(app)
      .get("/api/parent/portal/profile")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ramesh Kumar");
    expect(res.body.student).toBeDefined();
    expect(res.body.student.admissionNo).toBe("ADM001");
    expect(res.body).not.toHaveProperty("password");
  });

  it("returns the child's attendance summary", async () => {
    const res = await request(app)
      .get("/api/parent/portal/attendance")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("summary");
    expect(res.body).toHaveProperty("attendancePercentage");
    expect(res.body).toHaveProperty("recent");
    expect(typeof res.body.attendancePercentage).toBe("number");
  });

  it("returns the child's fee records", async () => {
    const res = await request(app)
      .get("/api/parent/portal/fees")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The fee created in the Fees tests should be visible
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("status");
      expect(res.body[0]).toHaveProperty("amount");
      expect(res.body[0]).toHaveProperty("items");
    }
  });

  it("returns the child's exam results and grade summary", async () => {
    const res = await request(app)
      .get("/api/parent/portal/exams")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.summary).toHaveProperty("overallGrade");
    expect(res.body.summary).toHaveProperty("percentage");
  });

  it("returns the child class-info", async () => {
    const res = await request(app)
      .get("/api/parent/portal/class-info")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("class");
    expect(res.body).toHaveProperty("section");
  });

  it("blocks admin token from accessing parent-only routes", async () => {
    const res = await request(app)
      .get("/api/parent/portal/profile")
      .set("Authorization", `Bearer ${token}`); // admin token, not parent
    expect(res.status).toBe(403);
  });

  it("blocks parent token from modifying data (guardian creation)", async () => {
    const res = await request(app)
      .post("/api/guardians")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({
        studentId,
        name: "Sneaky",
        relationship: "Other",
        phone: "9840077777",
        email: "sneaky@parent.test",
        password: "Parent@123",
      });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3.4 — Online Payment Gateway Configuration
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 3.4 — Payment Gateway Configuration", () => {
  it("returns default config when no gateway is configured", async () => {
    const res = await request(app)
      .get("/api/payments/config")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("active");
    expect(res.body).toHaveProperty("provider");
    expect(res.body).toHaveProperty("enabledModes");
    expect(res.body.active).toBe(false);
  });

  it("does not expose secret keys in GET /config response", async () => {
    const res = await request(app)
      .get("/api/payments/config")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("keySecret");
    expect(res.body).not.toHaveProperty("webhookSecret");
  });

  it("saves gateway config (Manual provider)", async () => {
    const res = await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "MANUAL",
        mode: "TEST",
        enabledModes: ["CASH", "UPI", "BANK"],
        active: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe("MANUAL");
    expect(res.body.active).toBe(true);
    expect(res.body.enabledModes).toContain("UPI");
    // Secrets still not returned
    expect(res.body).not.toHaveProperty("keySecret");
  });

  it("activating MANUAL auto-enables the onlinePayments feature flag", async () => {
    const res = await request(app)
      .get("/api/schools/current")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.features.onlinePayments).toBe(true);
  });

  it("rejects activating Razorpay without credentials", async () => {
    const res = await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "RAZORPAY",
        mode: "TEST",
        active: true,
        // no keyId / keySecret
      });
    expect(res.status).toBe(400);
    const msg = res.body.error + " " + (res.body.details?.map((d: any) => d.message).join(" ") ?? "");
    expect(msg).toMatch(/key id|Key ID/i);
  });

  it("saves Razorpay config with credentials (not active)", async () => {
    const res = await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "RAZORPAY",
        mode: "TEST",
        keyId: "rzp_test_abcdef1234",
        keySecret: "test_secret_xyz",
        webhookSecret: "wh_secret_abc",
        enabledModes: ["CASH", "CARD", "UPI", "ONLINE"],
        active: false,
      });
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe("RAZORPAY");
    expect(res.body.active).toBe(false);
    // keyId is masked — only last 4 chars returned
    expect(res.body.keyId).toContain("1234");
    expect(res.body.keyId).not.toBe("rzp_test_abcdef1234");
    expect(res.body).not.toHaveProperty("keySecret");
    expect(res.body).not.toHaveProperty("webhookSecret");
  });

  it("rejects invalid payment mode in enabledModes", async () => {
    const res = await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "MANUAL",
        mode: "TEST",
        enabledModes: ["CASH", "INVALID_MODE"],
        active: false,
      });
    expect(res.status).toBe(400);
    const msgs = res.body.details?.map((d: any) => d.message).join(" ") ?? res.body.error;
    expect(msgs).toContain("Cash, Card, UPI");
  });

  it("rejects empty enabledModes array", async () => {
    const res = await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "MANUAL",
        mode: "TEST",
        enabledModes: [],
        active: false,
      });
    expect(res.status).toBe(400);
    const msgs = res.body.details?.map((d: any) => d.message).join(" ") ?? res.body.error;
    expect(msgs).toContain("at least one payment mode");
  });

  it("disabling gateway auto-disables the onlinePayments feature flag", async () => {
    await request(app)
      .put("/api/payments/config")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "MANUAL", mode: "TEST", active: false });

    const res = await request(app)
      .get("/api/schools/current")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.features.onlinePayments).toBe(false);
  });

  it("blocks non-admin from accessing gateway config", async () => {
    const res = await request(app)
      .get("/api/payments/config")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(403);
  });

  it("is tenant-isolated — beta school sees its own empty config", async () => {
    const betaRes = await request(app)
      .post("/api/auth/login")
      .send({ schoolSlug: "beta", email: "admin@beta.local", password: "Admin@123" });
    const betaToken = betaRes.body.token;

    const res = await request(app)
      .get("/api/payments/config")
      .set("Authorization", `Bearer ${betaToken}`);
    expect(res.status).toBe(200);
    // Beta's config is independent — not affected by alpha's gateway setup
    expect(res.body.active).toBe(false);
  });
});
