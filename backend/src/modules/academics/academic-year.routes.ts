import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import { validate } from "../../middleware/validate.js";
import { idParam } from "../../shared/params.js";
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  promoteSchema,
  bulkEnrollSchema,
} from "./academic-year.schema.js";
import * as service from "./academic-year.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

// ── Academic years ──────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.listAcademicYears(tenantId(req)));
  })
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.getAcademicYear(tenantId(req), req.params.id));
  })
);

router.post(
  "/",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: createAcademicYearSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createAcademicYear(tenantId(req), req.body));
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam, body: updateAcademicYearSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateAcademicYear(tenantId(req), req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteAcademicYear(tenantId(req), req.params.id);
    res.status(204).send();
  })
);

// Activate an academic year (sets it as the current year)
router.post(
  "/:id/activate",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.activateAcademicYear(tenantId(req), req.params.id));
  })
);

// ── Enrollments ─────────────────────────────────────────────
router.get(
  "/:id/enrollments",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const filter = {
      academicYearId: req.params.id,
      sectionId: (req.query as any).sectionId,
      status: (req.query as any).status,
    };
    res.json(await service.listEnrollments(tenantId(req), filter));
  })
);

router.post(
  "/:id/enroll",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.status(201).json(
      await service.enrollStudent(tenantId(req), {
        studentId: req.body.studentId,
        sectionId: req.body.sectionId,
        academicYearId: req.params.id,
      })
    );
  })
);

router.post(
  "/bulk-enroll",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: bulkEnrollSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.bulkEnroll(tenantId(req), req.body));
  })
);

// ── Promotion ────────────────────────────────────────────────
router.post(
  "/promote",
  authorize("ADMIN", "SUPERADMIN"),
  validate({ body: promoteSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.promoteStudents(tenantId(req), req.body));
  })
);

// ── Per-student enrollment history ─────────────────────────
router.get(
  "/students/:id/history",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.studentEnrollmentHistory(tenantId(req), req.params.id));
  })
);

export default router;
