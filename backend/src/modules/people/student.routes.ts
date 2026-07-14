import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import { createStudentSchema, updateStudentSchema } from "./people.schema.js";
import * as service from "./people.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listStudents(tenantId(req), req.query as any));
  })
);

// Previous-year students — enrolled in any inactive academic year
router.get(
  "/previous-year",
  asyncHandler(async (req, res) => {
    res.json(
      await service.listPreviousYearStudents(tenantId(req), req.query as any)
    );
  })
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.getStudent(tenantId(req), req.params.id));
  })
);

router.post(
  "/",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createStudentSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createStudent(tenantId(req), req.body));
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: updateStudentSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateStudent(tenantId(req), req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteStudent(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

export default router;
