import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import * as service from "./academics.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listClasses(tenantId(req)));
  })
);

router.get(
  "/sections",
  asyncHandler(async (req, res) => {
    res.json(await service.listSections(tenantId(req)));
  })
);

export default router;
