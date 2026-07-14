import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { BadRequest } from "../lib/errors.js";

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * Converts a raw Zod field path into a human-friendly label.
 * e.g. ["admin", "email"] -> "Admin email", ["guardianPhone"] -> "Guardian phone"
 */
const FIELD_LABELS: Record<string, string> = {
  admissionNo: "Admission number",
  employeeNo: "Employee number",
  sectionId: "Section",
  classId: "Class",
  studentId: "Student",
  dob: "Date of birth",
  maxMarks: "Maximum marks",
  marksObtained: "Marks",
  slug: "School code",
  schoolSlug: "School code",
  minClassLevel: "Lowest class level",
  maxClassLevel: "Highest class level",
  sectionsPerClass: "Sections per class",
  passPercentage: "Pass percentage",
};

function humanizeField(path: (string | number)[]): string {
  if (path.length === 0) return "Value";
  const last = path[path.length - 1];
  if (typeof last === "string" && FIELD_LABELS[last]) {
    return FIELD_LABELS[last];
  }
  const readable = path
    .filter((p) => typeof p === "string")
    .join(" ")
    // camelCase -> spaced words
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/**
 * Turns a ZodError into a flat list of clear, user-facing messages.
 * Each entry names the field and explains what to fix in plain language.
 */
function formatZodError(err: ZodError): {
  message: string;
  issues: { field: string; message: string }[];
} {
  const issues = err.errors.map((issue) => {
    const field = humanizeField(issue.path);

    // If the schema already provided a custom (non-default) message, keep it
    // verbatim — those are hand-written to be the clearest. Zod's built-in
    // defaults ("Required", "Invalid enum value", etc.) are translated below.
    const ZOD_DEFAULT = /^(Required|Invalid|Expected|String must|Number must|Array must)/;
    let message = issue.message;
    if (!ZOD_DEFAULT.test(message)) {
      return { field: issue.path.join(".") || "value", message };
    }

    if (message === "Required" || /^Required/i.test(message)) {
      message = `${field} is required.`;
    } else if (/^Invalid enum value/i.test(message)) {
      const options = (issue as any).options?.join(", ");
      message = `${field} must be one of: ${options}.`;
    } else if (/String must contain at least/i.test(message)) {
      const min = (issue as any).minimum;
      message = `${field} must be at least ${min} character${min === 1 ? "" : "s"} long.`;
    } else if (/String must contain at most/i.test(message)) {
      const max = (issue as any).maximum;
      message = `${field} must be at most ${max} character${max === 1 ? "" : "s"} long.`;
    } else if (/Number must be greater than 0/i.test(message)) {
      message = `${field} must be greater than zero.`;
    } else if (/Number must be greater than or equal to/i.test(message)) {
      const min = (issue as any).minimum;
      message = `${field} must be at least ${min}.`;
    } else if (/Number must be less than or equal to/i.test(message)) {
      const max = (issue as any).maximum;
      message = `${field} must be at most ${max}.`;
    } else if (/Invalid email/i.test(message)) {
      message = `${field} must be a valid email address.`;
    } else if (/Invalid date/i.test(message) || /Expected date/i.test(message)) {
      message = `${field} must be a valid date.`;
    } else if (/Expected number/i.test(message)) {
      message = `${field} must be a number.`;
    } else if (!message.toLowerCase().startsWith(field.toLowerCase())) {
      // Prefix the field name so the user knows which input to fix.
      message = `${field}: ${message}`;
    }

    return { field: issue.path.join(".") || "value", message };
  });

  // A short summary line for toast/alert display; issues array powers inline errors.
  const message =
    issues.length === 1
      ? issues[0].message
      : `Please fix ${issues.length} field${issues.length === 1 ? "" : "s"}: ${issues
          .map((i) => i.message)
          .join(" ")}`;

  return { message, issues };
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const { message, issues } = formatZodError(err);
        throw BadRequest(message, issues);
      }
      throw err;
    }
  };
}
