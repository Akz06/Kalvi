import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { Prisma } from "@prisma/client";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "The requested resource or endpoint was not found." });
}

/** Maps common unique-constraint column names to human-friendly labels. */
function friendlyUniqueField(raw: string): string {
  const map: Record<string, string> = {
    admissionNo: "admission number",
    employeeNo: "employee number",
    email: "email address",
    slug: "school code",
    receiptNo: "receipt number",
  };
  for (const key of Object.keys(map)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return map[key];
  }
  return "";
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Turn raw DB column names into a friendly, specific message.
      const target = (err.meta as any)?.target;
      const raw = Array.isArray(target) ? target.join(", ") : String(target ?? "");
      const label = friendlyUniqueField(raw);
      return res.status(409).json({
        error: label
          ? `A record with this ${label} already exists. Please use a different value.`
          : "A record with these details already exists. Please use different values.",
        field: target,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "That record could not be found." });
    }
    if (err.code === "P2003") {
      return res.status(400).json({
        error:
          "This action references a related record that doesn't exist. Please check your selection.",
      });
    }
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal Server Error" });
}
