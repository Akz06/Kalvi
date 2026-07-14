import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import { createStaffSchema, updateStaffSchema } from "./people.schema.js";
import * as service from "./people.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listStaff(tenantId(req), (req.query as any).q));
  })
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.getStaff(tenantId(req), req.params.id));
  })
);

router.post(
  "/",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createStaffSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createStaff(tenantId(req), req.body));
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: updateStaffSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateStaff(tenantId(req), req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteStaff(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

export default router;
