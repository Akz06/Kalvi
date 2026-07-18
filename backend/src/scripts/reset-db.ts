/**
 * One-shot script to wipe all application data from the Railway PostgreSQL DB.
 * Run on Railway console: npx ts-node src/scripts/reset-db.ts
 * Or: node -e "require('./dist/scripts/reset-db.js')"
 *
 * Cascades from School down — deletes all schools, users, students, fees, etc.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DB_RESET !== "true") {
    throw new Error("DB reset is disabled. Set ALLOW_DB_RESET=true temporarily to run this script.");
  }

  console.log("Wiping all application data...");

  // Order matters — most cascading happens automatically via FK cascade,
  // but we explicitly delete from the top of the tree.
  // Delete in dependency order (children before parents)
  const steps: Array<{ name: string; count: number }> = [];

  const run = async (name: string, p: Promise<{ count: number }>) => {
    const { count } = await p;
    steps.push({ name, count });
  };

  await run("FeePayment",           prisma.feePayment.deleteMany());
  await run("FeeItem",              prisma.feeItem.deleteMany());
  await run("FeeRecord",            prisma.feeRecord.deleteMany());
  await run("FeeHead",              prisma.feeHead.deleteMany());
  await run("Attendance",           prisma.attendance.deleteMany());
  await run("ExamResult",           prisma.examResult.deleteMany());
  await run("Exam",                 prisma.exam.deleteMany());
  await run("Enrollment",           prisma.enrollment.deleteMany());
  await run("Student",              prisma.student.deleteMany());
  await run("Section",              prisma.section.deleteMany());
  await run("SchoolClass",          prisma.schoolClass.deleteMany());
  await run("Guardian",             prisma.guardian.deleteMany());
  await run("GuardianRefreshToken", prisma.guardianRefreshToken.deleteMany());
  await run("GuardianPasswordReset",prisma.guardianPasswordReset.deleteMany());
  await run("RefreshToken",         prisma.refreshToken.deleteMany());
  await run("PasswordResetToken",   prisma.passwordResetToken.deleteMany());
  await run("SchoolSettings",       prisma.schoolSettings.deleteMany());
  await run("PaymentGatewayConfig", prisma.paymentGatewayConfig.deleteMany());
  await run("AcademicYear",         prisma.academicYear.deleteMany());
  await run("User",                 prisma.user.deleteMany());
  await run("School",               prisma.school.deleteMany());

  steps.forEach(({ name, count }) => console.log(`  ✓ ${name}: ${count} deleted`));
  console.log("All data wiped. Database is clean.");
}

main()
  .catch((e) => { console.error("❌ Reset failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
