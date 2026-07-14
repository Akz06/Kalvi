import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

// Access token: short-lived (15 min default). Stateless — verified on every request.
// Refresh token: long-lived (30 days), stored as a bcrypt hash in the DB.
// On every refresh: delete old token row, issue new access + refresh pair (rotation).

export interface JwtPayload {
  sub: string;       // User.id or Guardian.id
  role: string;      // Role enum value
  email: string;
  schoolId: string | null;
  type: "access";    // Prevent refresh tokens being used as access tokens
}

export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

/** Generate a cryptographically secure refresh token (opaque, 40 bytes hex). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/** Hash a refresh token for safe DB storage. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Back-compat alias (used in existing identity.service.ts)
export const signToken = signAccessToken;
