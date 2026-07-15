import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../../prisma/test.db");

/**
 * Prepares the test database. Supports both SQLite (CI fast path) and
 * PostgreSQL (full integration) via DATABASE_URL environment variable.
 */
export function prepareTestDb() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-for-ci-only-not-production-abc123";

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./test.db";
  }

  // Tests always use the SQLite schema (schema.test.prisma) to run without
  // needing a PostgreSQL server. The production schema (schema.prisma) uses
  // PostgreSQL with native enums — SQLite doesn't support those.
  //
  // Step 1: regenerate the Prisma client from the SQLite test schema so that
  // @prisma/client uses sqlite (not the production postgresql client).
  execSync(
    "npx prisma generate --schema=prisma/schema.test.prisma",
    {
      cwd: path.resolve(__dirname, "../.."),
      stdio: "ignore",
      env: { ...process.env },
    }
  );

  // Step 2: push the SQLite schema to the test database.
  execSync(
    "npx prisma db push --schema=prisma/schema.test.prisma --skip-generate --accept-data-loss --force-reset",
    {
      cwd: path.resolve(__dirname, "../.."),
      stdio: "ignore",
      env: { ...process.env },
    }
  );
}

export function cleanupTestDb() {
  if (existsSync(testDbPath)) rmSync(testDbPath);
}
