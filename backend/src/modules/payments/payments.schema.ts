import { z } from "zod";

// ── Allowed constants ──────────────────────────────────────
export const PROVIDERS = ["RAZORPAY", "STRIPE", "PAYU", "CASHFREE", "MANUAL"] as const;
export const GATEWAY_MODES = ["TEST", "LIVE"] as const;
export const PAYMENT_MODES = ["CASH", "CARD", "UPI", "BANK", "CHEQUE", "ONLINE"] as const;

export type Provider = (typeof PROVIDERS)[number];
export type GatewayMode = (typeof GATEWAY_MODES)[number];
export type PaymentModeOption = (typeof PAYMENT_MODES)[number];

// ── Upsert gateway configuration (admin-only) ─────────────
export const upsertGatewaySchema = z
  .object({
    provider: z.enum(PROVIDERS, {
      errorMap: () => ({
        message:
          "Provider must be one of: Razorpay, Stripe, PayU, Cashfree, or Manual.",
      }),
    }),
    mode: z.enum(GATEWAY_MODES, {
      errorMap: () => ({
        message: "Gateway mode must be either TEST or LIVE.",
      }),
    }),
    keyId: z
      .string()
      .trim()
      .optional()
      .default(""),
    keySecret: z
      .string()
      .trim()
      .optional()
      .default(""),
    webhookSecret: z
      .string()
      .trim()
      .optional()
      .default(""),
    enabledModes: z
      .array(
        z.enum(PAYMENT_MODES, {
          errorMap: () => ({
            message: "Each payment mode must be one of: Cash, Card, UPI, Bank, Cheque, Online.",
          }),
        })
      )
      .min(1, "Please enable at least one payment mode.")
      .optional(),
    active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // If provider is not MANUAL and gateway is being activated, keys are required
    if (data.active && data.provider !== "MANUAL") {
      if (!data.keyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keyId"],
          message: `Key ID is required to activate ${data.provider}.`,
        });
      }
      if (!data.keySecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keySecret"],
          message: `Secret key is required to activate ${data.provider}.`,
        });
      }
    }
  });

// ── Create an online payment order (Razorpay / Stripe) ────
export const createOrderSchema = z.object({
  feeRecordId: z.string().min(1, "Please select a fee to pay."),
  amount: z
    .number({ invalid_type_error: "Amount must be a number." })
    .positive("Payment amount must be greater than zero."),
});

// ── Verify / capture a gateway payment callback ────────────
export const verifyPaymentSchema = z.object({
  feeRecordId: z.string().min(1, "Fee record ID is required."),
  gatewayOrderId: z.string().min(1, "Gateway order ID is required."),
  gatewayPaymentId: z.string().min(1, "Gateway payment ID is required."),
  gatewaySignature: z.string().optional(),
  amount: z
    .number({ invalid_type_error: "Amount must be a number." })
    .positive("Payment amount must be greater than zero."),
});
