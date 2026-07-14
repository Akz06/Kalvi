import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import {
  createFeeSchema,
  payFeeSchema,
  createFeeHeadSchema,
  updateFeeHeadSchema,
  listFeeHeadsQuery,
} from "./fees.schema.js";
import * as service from "./fees.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

// ── Fee configuration (per-class fee heads) ─────────────────
router.get(
  "/heads",
  validate({ query: listFeeHeadsQuery }),
  asyncHandler(async (req, res) => {
    res.json(await service.listFeeHeads(tenantId(req), req.query as any));
  })
);

router.post(
  "/heads",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createFeeHeadSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createFeeHead(tenantId(req), req.body));
  })
);

router.put(
  "/heads/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: updateFeeHeadSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateFeeHead(tenantId(req), req.params.id, req.body));
  })
);

router.delete(
  "/heads/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteFeeHead(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

// ── Fee invoices (multi-line subform) ───────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listFees(tenantId(req), req.query as any));
  })
);

router.post(
  "/",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createFeeSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createFee(tenantId(req), req.body));
  })
);

router.post(
  "/:id/pay",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: payFeeSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.payFee(tenantId(req), req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteFee(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

export default router;
