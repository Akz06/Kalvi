import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { markAttendanceSchema } from "./attendance.schema.js";
import * as service from "./attendance.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { sectionId, date } = req.query as { sectionId?: string; date?: string };
    res.json(await service.getAttendance(tenantId(req), sectionId, date));
  })
);

router.post(
  "/",
  authorize("ADMIN", "TEACHER", "SUPERADMIN"),
  validate({ body: markAttendanceSchema }),
  asyncHandler(async (req, res) => {
    const { date, records } = req.body as {
      date: Date;
      records: { studentId: string; status: string; remark?: string }[];
    };
    res.status(201).json(await service.markAttendance(tenantId(req), date, records));
  })
);

router.get(
  "/student/:id/summary",
  asyncHandler(async (req, res) => {
    res.json(await service.studentSummary(tenantId(req), req.params.id));
  })
);

export default router;
