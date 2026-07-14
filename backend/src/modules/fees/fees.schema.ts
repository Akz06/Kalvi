import { z } from "zod";

// ── Fee configuration (fee heads / categories) — PER CLASS ──
export const createFeeHeadSchema = z.object({
  classId: z.string().min(1, "Please select a class for this fee head."),
  name: z.string().trim().min(1, "Fee head name is required (e.g. 'Tuition Fee')."),
  defaultAmount: z
    .number({ invalid_type_error: "Default amount must be a number." })
    .min(0, "Default amount cannot be negative.")
    .optional(),
  active: z.boolean().optional(),
});

// classId is immutable on update (a head belongs to one class).
export const updateFeeHeadSchema = createFeeHeadSchema.omit({ classId: true }).partial();

export const listFeeHeadsQuery = z.object({
  classId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

// ── Fee invoice with a subform of line items (fee head + amount) ──
const feeItemSchema = z.object({
  feeHeadId: z.string().min(1, "Please choose a fee head for each line."),
  amount: z
    .number({ invalid_type_error: "Each line amount must be a number." })
    .positive("Each line amount must be greater than zero."),
});

export const createFeeSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  title: z.string().trim().min(1, "Fee title is required (e.g. 'Term 1 Fees')."),
  dueDate: z.coerce.date({
    errorMap: () => ({ message: "Due date must be a valid date." }),
  }),
  items: z
    .array(feeItemSchema)
    .min(1, "Please add at least one fee head with an amount."),
});

export const payFeeSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Payment amount must be a number." })
    .positive("Payment amount must be greater than zero."),
  mode: z
    .enum(["CASH", "CARD", "UPI", "BANK", "CHEQUE", "OTHER"], {
      errorMap: () => ({
        message: "Payment mode must be one of Cash, Card, UPI, Bank, Cheque, or Other.",
      }),
    })
    .optional(),
  reference: z.string().optional(),
});
