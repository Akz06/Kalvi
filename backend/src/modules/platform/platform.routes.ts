import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../shared/http.js";
import { Unauthorized, Forbidden } from "../../shared/errors.js";
import * as svc from "./platform.service.js";
import * as seedSvc from "./seed.service.js";

const router = Router();

// ── Platform JWT helpers ──────────────────────────────────────────────────────

const PLATFORM_SECRET  = process.env.PLATFORM_ADMIN_JWT_SECRET ?? "platform-dev-secret";
const PLATFORM_PASS    = process.env.PLATFORM_ADMIN_PASSWORD ?? "";
const PLATFORM_HASH    = process.env.PLATFORM_ADMIN_PASSWORD_HASH ?? "";

function signPlatformToken() {
  return jwt.sign({ role: "PLATFORM_ADMIN" }, PLATFORM_SECRET, { expiresIn: "8h" });
}

function verifyPlatformToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(Unauthorized("Missing platform token"));
  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, PLATFORM_SECRET) as any;
    if (decoded.role !== "PLATFORM_ADMIN") return next(Forbidden("Not a platform admin"));
    next();
  } catch {
    return next(Unauthorized("Invalid or expired platform token"));
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", asyncHandler(async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "Password is required." });

  let valid = false;
  if (PLATFORM_HASH) {
    valid = await bcrypt.compare(password, PLATFORM_HASH);
  } else if (PLATFORM_PASS) {
    valid = password === PLATFORM_PASS;
  }
  if (!valid) return res.status(401).json({ error: "Invalid password." });

  svc.logActivity("LOGIN", "platform_admin", undefined, req.ip);
  return res.json({ token: signPlatformToken() });
}));

// All routes below require a valid platform token
router.use(verifyPlatformToken);

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get("/stats", asyncHandler(async (_req, res) => {
  res.json(await svc.getPlatformStats());
}));

// ── Schools ───────────────────────────────────────────────────────────────────

router.get("/schools", asyncHandler(async (req, res) => {
  const search = (req.query.search as string) ?? undefined;
  const plan   = (req.query.plan   as string) ?? undefined;
  res.json(await svc.getAllSchools(search, plan));
}));

router.get("/schools/:id", asyncHandler(async (req, res) => {
  res.json(await svc.getSchoolDetail(req.params.id));
}));

router.post("/schools/:id/seed", asyncHandler(async (req, res) => {
  svc.logActivity("SEED", req.params.id, undefined, req.ip);
  const result = await seedSvc.seedSchool(req.params.id);
  res.json(result);
}));

router.post("/schools/:id/suspend", asyncHandler(async (req, res) => {
  const school = await svc.toggleSuspend(req.params.id);
  svc.logActivity(school.active ? "UNSUSPEND" : "SUSPEND", req.params.id, undefined, req.ip);
  res.json({ active: school.active });
}));

router.delete("/schools/:id", asyncHandler(async (req, res) => {
  svc.logActivity("DELETE_SCHOOL", req.params.id, undefined, req.ip);
  await svc.deleteSchool(req.params.id);
  res.status(204).send();
}));

// ── Impersonate ───────────────────────────────────────────────────────────────

router.post("/schools/:id/impersonate", asyncHandler(async (req, res) => {
  svc.logActivity("IMPERSONATE", req.params.id, undefined, req.ip);
  const result = await svc.impersonateSchool(req.params.id);
  res.json(result);
}));

// ── Plans ────────────────────────────────────────────────────────────────────

router.put("/schools/:id/plan", asyncHandler(async (req, res) => {
  const { plan } = req.body ?? {};
  if (!plan) return res.status(400).json({ error: "plan is required" });
  svc.logActivity("UPDATE_PLAN", req.params.id, plan, req.ip);
  res.json(await svc.updatePlan(req.params.id, plan));
}));

// ── Feature flags ─────────────────────────────────────────────────────────────

router.get("/schools/:id/flags", asyncHandler(async (req, res) => {
  res.json(await svc.getFeatureFlags(req.params.id));
}));

router.put("/schools/:id/flags", asyncHandler(async (req, res) => {
  svc.logActivity("UPDATE_FLAGS", req.params.id, JSON.stringify(req.body), req.ip);
  res.json(await svc.updateFeatureFlags(req.params.id, req.body));
}));

// ── Announcements ────────────────────────────────────────────────────────────

router.get("/announcements", asyncHandler(async (_req, res) => {
  res.json(svc.getAnnouncements());
}));

router.post("/announcements", asyncHandler(async (req, res) => {
  const { title, message, type, target, expiresAt } = req.body ?? {};
  if (!title || !message) return res.status(400).json({ error: "title and message required" });
  const ann = svc.createAnnouncement({ title, message, type: type ?? "info", target: target ?? "all", expiresAt });
  svc.logActivity("CREATE_ANNOUNCEMENT", "platform", title, req.ip);
  res.status(201).json(ann);
}));

router.delete("/announcements/:id", asyncHandler(async (req, res) => {
  svc.deleteAnnouncement(req.params.id);
  res.status(204).send();
}));

// ── Activity Logs ─────────────────────────────────────────────────────────────

router.get("/logs", asyncHandler(async (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "100", 10);
  res.json(svc.getActivityLogs(limit));
}));

export default router;
