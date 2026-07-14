import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import {
  createGuardianSchema,
  updateGuardianSchema,
  parentLoginSchema,
} from "./parent.schema.js";
import * as service from "./parent.service.js";

// ── /api/parent/auth ─────────────────────────────────────────────────────────
// Dedicated auth for parents — separate from admin/teacher login.
export const parentAuthRouter = Router();

parentAuthRouter.post(
  "/login",
  validate({ body: parentLoginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.parentLogin(req.body));
  })
);

// ── /api/guardians — Admin-side guardian management ──────────────────────────
export const guardianRouter = Router();
guardianRouter.use(authenticate, resolveTenant);

// List all guardians for the school, or filter by ?studentId=
guardianRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { studentId } = req.query as { studentId?: string };
    res.json(await service.listGuardians(tenantId(req), studentId));
  })
);

// Create a guardian account for a student
guardianRouter.post(
  "/",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createGuardianSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createGuardian(tenantId(req), req.body));
  })
);

// Update guardian details
guardianRouter.put(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: updateGuardianSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateGuardian(tenantId(req), req.params.id, req.body));
  })
);

// Reset guardian password (admin only)
guardianRouter.post(
  "/:id/reset-password",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long." });
    res.json(await service.resetGuardianPassword(tenantId(req), req.params.id, password));
  })
);

// Delete (remove) a guardian
guardianRouter.delete(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteGuardian(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

// ── /api/parent/portal — Parent-only read-only views ─────────────────────────
// These routes authenticate parents via the same JWT but check role=PARENT.
export const parentPortalRouter = Router();

// Middleware: authenticate + verify PARENT role + resolve tenant
parentPortalRouter.use(
  authenticate,
  authorize("PARENT"),
  resolveTenant
);

// Parent's own profile + child info
parentPortalRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    res.json(await service.getGuardianProfile(req.user!.sub, tenantId(req)));
  })
);

// Child's attendance summary + recent records
parentPortalRouter.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    res.json(await service.getChildAttendance(req.user!.sub, tenantId(req)));
  })
);

// Child's fee records (read-only)
parentPortalRouter.get(
  "/fees",
  asyncHandler(async (req, res) => {
    res.json(await service.getChildFees(req.user!.sub, tenantId(req)));
  })
);

// Child's exam results + report summary
parentPortalRouter.get(
  "/exams",
  asyncHandler(async (req, res) => {
    res.json(await service.getChildExams(req.user!.sub, tenantId(req)));
  })
);

// Child's class/section overview
parentPortalRouter.get(
  "/class-info",
  asyncHandler(async (req, res) => {
    res.json(await service.getChildTimetableOverview(req.user!.sub, tenantId(req)));
  })
);
