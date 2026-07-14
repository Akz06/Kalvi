import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import { createExamSchema, recordResultsSchema } from "./exams.schema.js";
import * as service from "./exams.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listExams(tenantId(req), (req.query as any).classId));
  })
);

router.post(
  "/",
  authorize("ADMIN", "TEACHER", "SUPERADMIN"),
  validate({ body: createExamSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createExam(tenantId(req), req.body));
  })
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.getExamDetail(tenantId(req), req.params.id));
  })
);

router.post(
  "/:id/results",
  authorize("ADMIN", "TEACHER", "SUPERADMIN"),
  validate({ params: idParam, body: recordResultsSchema }),
  asyncHandler(async (req, res) => {
    const { results } = req.body as {
      results: { studentId: string; marksObtained: number; remark?: string }[];
    };
    res
      .status(201)
      .json(await service.recordResults(tenantId(req), req.params.id, results));
  })
);

router.get(
  "/student/:id/report",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.studentReport(tenantId(req), req.params.id));
  })
);

export default router;
