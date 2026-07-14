import { z } from "zod";

export const createGuardianSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  name: z.string().min(2, "Guardian name must be at least 2 characters."),
  relationship: z.string().min(1, "Please specify the relationship (e.g. Father, Mother)."),
  phone: z
    .string()
    .min(6, "Phone number must be at least 6 digits.")
    .max(15, "Phone number must be at most 15 digits.")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number."),
  email: z.string().email("Please enter a valid email address for the guardian."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .max(100, "Password is too long."),
  isPrimary: z.boolean().optional(),
});

export const updateGuardianSchema = z.object({
  name: z.string().min(2, "Guardian name must be at least 2 characters.").optional(),
  relationship: z.string().min(1, "Relationship cannot be empty.").optional(),
  phone: z
    .string()
    .min(6, "Phone number must be at least 6 digits.")
    .max(15, "Phone number must be at most 15 digits.")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number.")
    .optional(),
  email: z.string().email("Please enter a valid email address.").optional(),
  password: z
    .string()
    .min(6, "New password must be at least 6 characters long.")
    .optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const parentLoginSchema = z.object({
  schoolSlug: z.string().min(1, "School code is required."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
