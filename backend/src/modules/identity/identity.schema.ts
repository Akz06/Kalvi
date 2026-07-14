import { z } from "zod";

const board = z.enum(["CBSE", "STATE", "ICSE", "IB", "OTHER"], {
  errorMap: () => ({ message: "Board must be one of CBSE, STATE, ICSE, IB, or OTHER." }),
});

export const loginSchema = z.object({
  schoolSlug: z.string().trim().min(1, "School code cannot be empty.").optional(),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export const registerSchoolSchema = z.object({
  school: z.object({
    name: z.string().min(2, "School name must be at least 2 characters long."),
    slug: z
      .string()
      .min(2, "School code must be at least 2 characters long.")
      .max(40, "School code must be at most 40 characters long.")
      .regex(
        /^[a-z0-9-]+$/,
        "School code may only contain lowercase letters, numbers, and hyphens (e.g. 'greenwood-high')."
      ),
  }),
  admin: z.object({
    name: z.string().min(2, "Admin name must be at least 2 characters long."),
    email: z.string().email("Admin email must be a valid email address."),
    password: z.string().min(6, "Admin password must be at least 6 characters long."),
  }),
  settings: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      board: board.optional(),
      minClassLevel: z
        .number({ invalid_type_error: "Lowest class level must be a number." })
        .int("Lowest class level must be a whole number.")
        .min(1, "Lowest class level must be at least 1.")
        .max(20, "Lowest class level must be at most 20.")
        .optional(),
      maxClassLevel: z
        .number({ invalid_type_error: "Highest class level must be a number." })
        .int("Highest class level must be a whole number.")
        .min(1, "Highest class level must be at least 1.")
        .max(20, "Highest class level must be at most 20.")
        .optional(),
      sectionsPerClass: z
        .number({ invalid_type_error: "Sections per class must be a number." })
        .int("Sections per class must be a whole number.")
        .min(1, "Each class needs at least 1 section.")
        .max(10, "A class can have at most 10 sections.")
        .optional(),
    })
    .refine(
      (s) =>
        s.minClassLevel === undefined ||
        s.maxClassLevel === undefined ||
        s.minClassLevel <= s.maxClassLevel,
      {
        message: "Lowest class level cannot be greater than the highest class level.",
        path: ["minClassLevel"],
      }
    )
    .optional(),
});

export const updateSettingsSchema = z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    addressLine: z.string().optional(),
    phone: z.string().optional(),
    email: z
      .string()
      .email("Contact email must be a valid email address.")
      .or(z.literal(""))
      .optional(),
    logoUrl: z.string().optional(),
    currency: z
      .string()
      .length(3, "Currency must be a 3-letter ISO code (e.g. INR, USD, EUR).")
      .toUpperCase()
      .optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    board: board.optional(),
    academicYear: z.string().optional(),
    minClassLevel: z
      .number({ invalid_type_error: "Lowest class level must be a number." })
      .int("Lowest class level must be a whole number.")
      .min(1, "Lowest class level must be at least 1.")
      .max(20, "Lowest class level must be at most 20.")
      .optional(),
    maxClassLevel: z
      .number({ invalid_type_error: "Highest class level must be a number." })
      .int("Highest class level must be a whole number.")
      .min(1, "Highest class level must be at least 1.")
      .max(20, "Highest class level must be at most 20.")
      .optional(),
    sectionsPerClass: z
      .number({ invalid_type_error: "Sections per class must be a number." })
      .int("Sections per class must be a whole number.")
      .min(1, "Each class needs at least 1 section.")
      .max(10, "A class can have at most 10 sections.")
      .optional(),
    tagline: z.string().max(200, "Tagline can be at most 200 characters.").optional(),
    primaryColor: z
      .string()
      .regex(/^(#[0-9a-fA-F]{6})?$/, "Primary colour must be a valid hex code (e.g. #1d4ed8) or empty.")
      .optional(),
    passPercentage: z
      .number({ invalid_type_error: "Pass percentage must be a number." })
      .int("Pass percentage must be a whole number.")
      .min(0, "Pass percentage cannot be below 0.")
      .max(100, "Pass percentage cannot be above 100.")
      .optional(),
    features: z
      .object({
        students: z.boolean().optional(),
        staff: z.boolean().optional(),
        classes: z.boolean().optional(),
        attendance: z.boolean().optional(),
        fees: z.boolean().optional(),
        exams: z.boolean().optional(),
        parentPortal: z.boolean().optional(),
        academicYears: z.boolean().optional(),
        onlinePayments: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (s) =>
      s.minClassLevel === undefined ||
      s.maxClassLevel === undefined ||
      s.minClassLevel <= s.maxClassLevel,
    {
      message: "Lowest class level cannot be greater than the highest class level.",
      path: ["minClassLevel"],
    }
  );
