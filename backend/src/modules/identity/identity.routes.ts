import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import {
  loginSchema,
  registerSchoolSchema,
  updateSettingsSchema,
} from "./identity.schema.js";
import * as service from "./identity.service.js";

// ── Auth router: /api/auth ──────────────────────────────────
export const authRouter = Router();

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.login(req.body));
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: await service.currentUser(req.user!.sub) });
  })
);

// ── School / settings router: /api/schools ──────────────────
export const schoolRouter = Router();

// PUBLIC — school branding lookup (used by public home/login pages)
schoolRouter.get(
  "/public/:slug",
  asyncHandler(async (req, res) => {
    const school = await service.getPublicBranding(req.params.slug);
    if (!school) return res.status(404).json({ error: "School not found." });
    res.json(school);
  })
);

// PUBLIC onboarding — rate-limited at app level.
schoolRouter.post(
  "/register",
  validate({ body: registerSchoolSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.registerSchool(req.body));
  })
);

schoolRouter.use(authenticate, resolveTenant);

schoolRouter.get(
  "/current",
  asyncHandler(async (req, res) => {
    const profile = await service.getSchoolProfile(tenantId(req));
    if (!profile)
      return res.status(404).json({ error: "Your school profile could not be found." });
    res.json(profile);
  })
);

schoolRouter.put(
  "/settings",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: updateSettingsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateSettings(tenantId(req), req.body));
  })
);

schoolRouter.post(
  "/provision-classes",
  authorize("ADMIN", "SUPERADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await service.reprovisionClasses(tenantId(req)));
  })
);
