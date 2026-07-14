import { z } from "zod";

export const createAcademicYearSchema = z
  .object({
    name: z
      .string({ required_error: "Academic year name is required." })
      .min(4, "Academic year name must be at least 4 characters (e.g. 2024-2025).")
      .max(20, "Academic year name is too long."),
    startDate: z.coerce.date({
      required_error: "Start date is required.",
      invalid_type_error: "Start date must be a valid date.",
    }),
    endDate: z.coerce.date({
      required_error: "End date is required.",
      invalid_type_error: "End date must be a valid date.",
    }),
    active: z.boolean().optional(),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

export const updateAcademicYearSchema = z
  .object({
    name: z.string().min(4).max(20).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    active: z.boolean().optional(),
  })
  .partial();

export const promoteSchema = z.object({
  fromYearId: z.string({ required_error: "Source academic year is required." }).cuid(
    "Please select a valid source academic year."
  ),
  toYearId: z.string({ required_error: "Destination academic year is required." }).cuid(
    "Please select a valid destination academic year."
  ),
  promotions: z
    .array(
      z.object({
        studentId: z
          .string({ required_error: "Student ID is required." })
          .cuid("Invalid student ID."),
        toSectionId: z
          .string({ required_error: "Target section is required." })
          .cuid("Please select a valid target section."),
        action: z.enum(["PROMOTED", "TRANSFERRED", "LEFT"], {
          errorMap: () => ({
            message: "Action must be PROMOTED, TRANSFERRED, or LEFT.",
          }),
        }),
      })
    )
    .min(1, "Please include at least one student in the promotion batch."),
});

export const bulkEnrollSchema = z.object({
  academicYearId: z
    .string({ required_error: "Academic year is required." })
    .cuid("Please select a valid academic year."),
  enrollments: z
    .array(
      z.object({
        studentId: z.string().cuid("Invalid student ID."),
        sectionId: z.string().cuid("Invalid section ID."),
      })
    )
    .min(1, "Please include at least one student to enroll."),
});
