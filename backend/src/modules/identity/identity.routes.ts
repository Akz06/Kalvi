import { Router } from "express";
import rateLimit from "express-rate-limit";
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
// NOTE: createSchoolSchema is also used by the /auth/create-school endpoint above
import * as service from "./identity.service.js";
import { googleCallback, googleSelectSchool } from "./google-auth.service.js";

// Tight limiter only for the public /register endpoint (5 per hour per IP)
// Skip in test environment so tests don't hit rate limits
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again in an hour." },
});

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

// ── Google Sign-In (OAuth2 redirect flow) ───────────────────
// Step 1: Frontend redirects user to Google with client_id + redirect_uri.
// Step 2: Google redirects to /auth/google/callback with a `code`.
// Step 3: Frontend POSTs { code, redirectUri } to this endpoint.
// Step 4: Backend exchanges code for id_token, verifies, finds/creates user.
authRouter.post(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const { code, redirectUri } = req.body;
    if (!code || !redirectUri)
      return res.status(400).json({ error: "code and redirectUri are required." });
    res.json(await googleCallback(code, redirectUri));
  })
);

// Google school selector — called when user has multiple schools after Google sign-in.
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

// PUBLIC onboarding — has its own rate limiter
schoolRouter.post(
  "/register",
  registerLimiter,
  validate({ body: registerSchoolSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.registerSchool(req.body));
  })
);

// ── Create school (authenticated, but NO schoolId required yet) ──────────
// This must come BEFORE the schoolRouter.use(authenticate, resolveTenant)
// middleware below, because resolveTenant throws if schoolId is null.
authRouter.post(
  "/create-school",
  authenticate,
  validate({ body: createSchoolSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createSchoolForUser(req.user!.sub, req.body));
  })
);

// ── All routes below this line require auth + tenant context ─────────────
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
