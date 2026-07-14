import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";
import { Forbidden, NotFound } from "./errors.js";

/**
 * Resolves the active tenant (school) for the request from the authenticated
 * user. SUPERADMIN may target any school via the `x-school-id` header or
 * `?schoolId=` query param; everyone else is locked to their own school.
 *
 * Must run AFTER `authenticate`. Populates `req.schoolId`.
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) throw Forbidden("Authentication required");

  let schoolId: string | undefined;

  if (user.role === "SUPERADMIN") {
    schoolId =
      (req.header("x-school-id") as string) ||
      (req.query.schoolId as string) ||
      undefined;
    if (!schoolId) {
      throw Forbidden(
        "SUPERADMIN must select a school via x-school-id header or schoolId query param"
      );
    }
  } else {
    schoolId = user.schoolId ?? undefined;
    if (!schoolId) throw Forbidden("User is not attached to any school");
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw NotFound("School not found");
  if (!school.active) throw Forbidden("This school is deactivated");

  req.schoolId = schoolId;
  next();
}

/** Convenience getter that guarantees a schoolId is present. */
export function tenantId(req: Request): string {
  if (!req.schoolId) throw Forbidden("Tenant context not resolved");
  return req.schoolId;
}
