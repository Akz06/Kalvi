import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../shared/http.js";
import { Unauthorized, Forbidden, NotFound } from "../../shared/errors.js";
import * as svc from "./platform.service.js";
import * as seedSvc from "./seed.service.js";

const router = Router();

// ── Platform JWT helpers ──────────────────────────────────────────────────────

const PLATFORM_SECRET = process.env.PLATFORM_ADMIN_JWT_SECRET ?? "platform-dev-secret";
const PLATFORM_PASSWORD_HASH = process.env.PLATFORM_ADMIN_PASSWORD_HASH ?? "";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? "";

function signPlatformToken() {
  return jwt.sign({ role: "PLATFORM_ADMIN" }, PLATFORM_SECRET, { expiresIn: "8h" });
}

function verifyPlatformToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw Unauthorized("Missing platform token");
  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, PLATFORM_SECRET) as any;
    if (decoded.role !== "PLATFORM_ADMIN") throw Forbidden("Not a platform admin");
    next();
  } catch {
    throw Unauthorized("Invalid or expired platform token");
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", asyncHandler(async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "Password is required." });

  let valid = false;

  // If a hashed password is stored use bcrypt compare (more secure)
  if (PLATFORM_PASSWORD_HASH) {
    valid = await bcrypt.compare(password, PLATFORM_PASSWORD_HASH);
  } else if (PLATFORM_PASSWORD) {
    // Plain-text fallback (acceptable for initial setup; remind admin to hash it)
    valid = password === PLATFORM_PASSWORD;
  }

  if (!valid) {
    return res.status(401).json({ error: "Invalid password." });
  }

  return res.json({ token: signPlatformToken() });
}));

// All routes below require a valid platform token
router.use(verifyPlatformToken);

// ── Platform stats ────────────────────────────────────────────────────────────

router.get("/stats", asyncHandler(async (_req, res) => {
  res.json(await svc.getPlatformStats());
}));

// ── Schools ───────────────────────────────────────────────────────────────────

router.get("/schools", asyncHandler(async (req, res) => {
  const search = (req.query.search as string) ?? undefined;
  res.json(await svc.getAllSchools(search));
}));

router.post("/schools/:id/seed", asyncHandler(async (req, res) => {
  const result = await seedSvc.seedSchool(req.params.id);
  res.json(result);
}));

router.post("/schools/:id/suspend", asyncHandler(async (req, res) => {
  const school = await svc.toggleSuspend(req.params.id);
  res.json({ active: school.active });
}));

router.delete("/schools/:id", asyncHandler(async (req, res) => {
  await svc.deleteSchool(req.params.id);
  res.status(204).send();
}));

export default router;
