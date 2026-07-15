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
  console.log("🗑  Wiping all application data...");

  // Order matters — most cascading happens automatically via FK cascade,
  // but we explicitly delete from the top of the tree.
  const deleted = await prisma.$transaction([
    prisma.feePayment.deleteMany(),
    prisma.feeRecord.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.examResult.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.student.deleteMany(),
    prisma.classSection.deleteMany(),
    prisma.guardian.deleteMany(),
    prisma.schoolSettings.deleteMany(),
    prisma.user.deleteMany(),
    prisma.school.deleteMany(),
  ]);

  deleted.forEach((r, i) => console.log(`  Step ${i + 1}: deleted ${r.count} rows`));
  console.log("✅ All data wiped. Database is clean.");
}

main()
  .catch((e) => { console.error("❌ Reset failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
