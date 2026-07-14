import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

function required(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) {
    throw new Error(
      `[School ERP] Missing required environment variable "${name}". ` +
        `Set it in your Railway service variables.`
    );
  }
  if (devFallback === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

const INSECURE_DEFAULT = "dev-secret-change-me";
const JWT_SECRET = required("JWT_SECRET", INSECURE_DEFAULT);

// Hard-fail if insecure secret reaches production.
if (isProd && (JWT_SECRET === INSECURE_DEFAULT || JWT_SECRET.length < 32)) {
  throw new Error(
    "[School ERP] JWT_SECRET is insecure. Set a cryptographically random " +
      "string of at least 32 characters in Railway service variables."
  );
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV,
  isProd,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  DATABASE_URL: required("DATABASE_URL", "file:./dev.db"),
  JWT_SECRET,
  // Access token TTL — short in prod (15m), generous in dev (1d)
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? (isProd ? "15m" : "1d"),
  // Refresh token TTL in days
  REFRESH_TOKEN_EXPIRES_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30),
};

export const isTest = env.NODE_ENV === "test";
