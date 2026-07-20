import { Router } from "express";
import { asyncHandler } from "../../shared/http.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveTenant, tenantId } from "../../shared/tenant.js";
import * as svc from "./timetable.service.js";

const router = Router();
router.use(authenticate, resolveTenant);

// ── Designations ─────────────────────────────────────────────────────────────

router.get("/designations", asyncHandler(async (req, res) => {
  await svc.ensureDefaultDesignations(tenantId(req));
  res.json(await svc.listDesignations(tenantId(req)));
}));

router.post("/designations", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createDesignation(tenantId(req), req.body.name));
}));

router.delete("/designations/:id", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  await svc.deleteDesignation(tenantId(req), req.params.id);
  res.status(204).send();
}));

// ── Subjects ──────────────────────────────────────────────────────────────────

router.get("/subjects", asyncHandler(async (req, res) => {
  await svc.ensureDefaultSubjects(tenantId(req));
  res.json(await svc.listSubjects(tenantId(req)));
}));

router.post("/subjects", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createSubject(tenantId(req), req.body));
}));

router.put("/subjects/:id", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.json(await svc.updateSubject(tenantId(req), req.params.id, req.body));
}));

router.delete("/subjects/:id", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  await svc.deleteSubject(tenantId(req), req.params.id);
  res.status(204).send();
}));

// Staff ↔ Subject assignments
router.get("/subjects/staff/:staffId", asyncHandler(async (req, res) => {
  res.json(await svc.getStaffSubjects(tenantId(req), req.params.staffId));
}));

router.post("/subjects/staff/:staffId/assign", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.status(201).json(
    await svc.assignSubjectToStaff(tenantId(req), req.params.staffId, req.body.subjectId)
  );
}));

router.delete("/subjects/staff/:staffId/assign/:subjectId", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  await svc.removeSubjectFromStaff(tenantId(req), req.params.staffId, req.params.subjectId);
  res.status(204).send();
}));

// ── Timetable ─────────────────────────────────────────────────────────────────

// All periods across all active timetables (for exchange form dropdown)
router.get("/all-periods", asyncHandler(async (req, res) => {
  res.json(await svc.getAllPeriods(tenantId(req)));
}));

router.get("/section/:sectionId", asyncHandler(async (req, res) => {
  const tt = await svc.getTimetableForSection(
    tenantId(req), req.params.sectionId,
    (req.query as any).academicYearId
  );
  res.json(tt ?? null);
}));

router.get("/staff/:staffId", asyncHandler(async (req, res) => {
  res.json(await svc.getTimetableForStaff(tenantId(req), req.params.staffId));
}));

router.get("/staff/:staffId/next-class", asyncHandler(async (req, res) => {
  res.json(await svc.getNextClassForStaff(tenantId(req), req.params.staffId));
}));

router.get("/subjects-conducted", asyncHandler(async (req, res) => {
  const { academicYearId } = req.query as any;
  res.json(await svc.getSubjectsConductedStats(tenantId(req), academicYearId));
}));

router.post("/generate", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.generateTimetable(tenantId(req), req.body));
}));

router.put("/period/:periodId", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.json(await svc.updatePeriod(tenantId(req), req.params.periodId, req.body));
}));

// ── Period Exchange ───────────────────────────────────────────────────────────

router.get("/exchanges", asyncHandler(async (req, res) => {
  const { staffId, status, date } = req.query as any;
  res.json(await svc.listPeriodExchanges(tenantId(req), { staffId, status, date }));
}));

router.post("/exchanges", asyncHandler(async (req, res) => {
  res.status(201).json(await svc.requestPeriodExchange(tenantId(req), req.body));
}));

router.put("/exchanges/:id/status", authorize("ADMIN", "SUPERADMIN"), asyncHandler(async (req, res) => {
  res.json(await svc.approveExchange(tenantId(req), req.params.id, req.body.status));
}));

// ── Teacher Dashboard ────────────────────────────────────────────────────────

router.get("/teacher-dashboard/:staffId", asyncHandler(async (req, res) => {
  res.json(await svc.getTeacherDashboard(tenantId(req), req.params.staffId));
}));

export default router;
