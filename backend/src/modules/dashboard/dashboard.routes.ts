import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import * as service from "./dashboard.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    res.json(await service.getStats(tenantId(req)));
  })
);

export default router;
