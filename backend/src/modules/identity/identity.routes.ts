import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import {
  loginSchema,
  signupSchema,
  createSchoolSchema,
  registerSchoolSchema,
  updateSettingsSchema,
} from "./identity.schema.js";
import * as service from "./identity.service.js";
import { googleSignIn, googleSelectSchool } from "./google-auth.service.js";

// ── Auth router: /api/auth ──────────────────────────────────
export const authRouter = Router();

// Public: sign up (user account only — no school)
authRouter.post(
  "/signup",
  validate({ body: signupSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.signup(req.body));
  })
);

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.login(req.body));
  })
);

// ── Google Sign-In ──────────────────────────────────────────
// Receives Google id_token from the frontend, verifies with Google's
// public keys, then finds-or-creates the user and returns a Kalvi JWT.
authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken is required." });
    res.json(await googleSignIn(idToken));
  })
);

// Google school selector — called when user has multiple schools after Google sign-in.
// Frontend sends the email (extracted from the Google response) + chosen schoolSlug.
authRouter.post(
  "/google/select-school",
  asyncHandler(async (req, res) => {
    const { email, schoolSlug } = req.body;
    if (!email || !schoolSlug)
      return res.status(400).json({ error: "email and schoolSlug are required." });
    res.json(await googleSelectSchool(email, schoolSlug));
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: await service.currentUser(req.user!.sub) });
  })
);

// Authenticated: switch active school context
authRouter.post(
  "/switch-school",
  authenticate,
  asyncHandler(async (req, res) => {
    const { schoolSlug } = req.body;
    if (!schoolSlug) return res.status(400).json({ error: "schoolSlug is required." });
    res.json(await service.switchSchool(req.user!.sub, schoolSlug));
  })
);

// Authenticated: list all schools the current user belongs to
authRouter.get(
  "/my-schools",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ schools: await service.getUserSchools(req.user!.sub) });
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

// Authenticated: create a new school for the logged-in user
schoolRouter.post(
  "/",
  authenticate,
  validate({ body: createSchoolSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createSchoolForUser(req.user!.sub, req.body));
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
