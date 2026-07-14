import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

function required(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) {
    throw new Error(
      `Missing required environment variable "${name}". It must be set in production.`
    );
  }
  if (devFallback === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

const INSECURE_DEFAULT = "dev-secret-change-me";
const JWT_SECRET = required("JWT_SECRET", INSECURE_DEFAULT);

// Hard-fail if someone ships the insecure dev secret to production.
if (isProd && (JWT_SECRET === INSECURE_DEFAULT || JWT_SECRET.length < 32)) {
  throw new Error(
    "JWT_SECRET is insecure for production. Set a random secret of at least 32 characters."
  );
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV,
  isProd,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  DATABASE_URL: required("DATABASE_URL", "file:./dev.db"),
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1d",
};

export const isTest = env.NODE_ENV === "test";
