/**
 * Payment Gateway Routes  —  /api/payments
 *
 * Admin routes:
 *   GET    /config               — view gateway config (secrets masked)
 *   PUT    /config               — upsert gateway config
 *   POST   /config/test          — test gateway connectivity
 *
 * Shared (admin + parent portal):
 *   POST   /orders               — create a payment order
 *   POST   /verify               — verify gateway callback & record payment
 *
 * Webhooks (public, signature-verified):
 *   POST   /webhook/:schoolId    — Razorpay / other webhook receiver
 */

import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import {
  upsertGatewaySchema,
  createOrderSchema,
  verifyPaymentSchema,
} from "./payments.schema.js";
import * as service from "./payments.service.js";

const router = Router();

// ── Webhook (public — no auth, but signature-verified) ──────
// Must be registered BEFORE the auth middleware so the raw body
// is available (express.json() is applied in app.ts after this).
router.post(
  "/webhook/:schoolSlug",
  asyncHandler(async (req, res) => {
    const rawBody = (req as any).rawBody as string;
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!rawBody || !signature) {
      return res.status(400).json({ error: "Missing webhook body or signature." });
    }

    // Look up school by slug so webhook URL stays stable
    const { prisma } = await import("../../shared/prisma.js");
    const school = await prisma.school.findUnique({
      where: { slug: req.params.schoolSlug },
    });
    if (!school) return res.status(404).json({ error: "School not found." });

    const result = await service.handleWebhook(school.id, rawBody, signature);
    res.json(result);
  })
);

// ── All other routes require authentication ──────────────────
router.use(authenticate, resolveTenant);

// ── Admin: gateway configuration ────────────────────────────
router.get(
  "/config",
  authorize("ADMIN", "SUPERADMIN"),
  asyncHandler(async (req, res) => {
    const cfg = await service.getGatewayConfig(tenantId(req));
    res.json(cfg ?? { active: false, provider: "MANUAL", mode: "TEST", enabledModes: ["CASH","CARD","UPI","BANK","CHEQUE","ONLINE"], keyId: "" });
  })
);

router.put(
  "/config",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: upsertGatewaySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.upsertGatewayConfig(tenantId(req), req.body));
  })
);

router.post(
  "/config/test",
  authorize("ADMIN", "SUPERADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await service.testGatewayConnection(tenantId(req)));
  })
);

// ── Create a payment order (admin or parent portal) ─────────
router.post(
  "/orders",
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.createPaymentOrder(tenantId(req), req.body));
  })
);

// ── Verify gateway callback and record in ledger ────────────
router.post(
  "/verify",
  validate({ body: verifyPaymentSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.verifyAndRecordPayment(tenantId(req), req.body));
  })
);

export default router;
