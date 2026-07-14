import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../../prisma/test.db");

/**
 * Creates a fresh SQLite test database and pushes the Prisma schema.
 * Called once from the test files' beforeAll.
 */
export function prepareTestDb() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret";

  if (existsSync(testDbPath)) rmSync(testDbPath);

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}

export function cleanupTestDb() {
  if (existsSync(testDbPath)) rmSync(testDbPath);
}
