/**
 * Payment Gateway Service
 *
 * Handles per-school online payment gateway configuration and order
 * lifecycle (create order → verify/capture → record in FeePayment ledger).
 *
 * SECURITY:
 *  - keySecret and webhookSecret are NEVER returned to the client.
 *  - Razorpay signature verification uses HMAC-SHA256 over
 *    `orderId|paymentId` with the school's webhookSecret (or keySecret).
 *  - Gateway is only used if `active === true` AND `onlinePayments` feature
 *    flag is enabled for the school.
 *
 * MULTI-TENANT: every operation is scoped by schoolId.
 */

import crypto from "crypto";
import { prisma } from "../../shared/prisma.js";
import { BadRequest, NotFound, Forbidden } from "../../shared/errors.js";
import { toMinor, moneyToMajor, MONEY_FIELDS } from "../../shared/money.js";
import { parseFeatures } from "../../shared/config.js";
import type { Provider } from "./payments.schema.js";

// ── Helpers ─────────────────────────────────────────────────

function presentFee<T extends Record<string, any>>(obj: T): T {
  return moneyToMajor(obj, MONEY_FIELDS);
}

/** Strip secrets before sending config to the client. */
function sanitiseConfig(cfg: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { keySecret, webhookSecret, ...safe } = cfg;
  return {
    ...safe,
    enabledModes: JSON.parse(safe.enabledModes ?? "[]"),
    // Mask keyId — show only last 4 chars so admin can verify without exposing it
    keyId: safe.keyId ? `****${String(safe.keyId).slice(-4)}` : "",
  };
}

/** Return the raw (unmasked) config for internal use only. */
async function getRawConfig(schoolId: string) {
  return prisma.paymentGatewayConfig.findUnique({ where: { schoolId } });
}

// ── Gateway configuration (admin) ───────────────────────────

export async function getGatewayConfig(schoolId: string) {
  const cfg = await getRawConfig(schoolId);
  if (!cfg) return null;
  return sanitiseConfig(cfg as any);
}

export async function upsertGatewayConfig(schoolId: string, body: {
  provider?: Provider;
  mode?: "TEST" | "LIVE";
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  enabledModes?: string[];
  active?: boolean;
}) {
  // Build the data object — only update fields that were supplied
  const data: Record<string, any> = { schoolId };
  if (body.provider !== undefined) data.provider = body.provider;
  if (body.mode !== undefined) data.mode = body.mode;
  if (body.keyId !== undefined) data.keyId = body.keyId;
  if (body.keySecret !== undefined) data.keySecret = body.keySecret;
  if (body.webhookSecret !== undefined) data.webhookSecret = body.webhookSecret;
  if (body.enabledModes !== undefined)
    data.enabledModes = JSON.stringify(body.enabledModes);
  if (body.active !== undefined) data.active = body.active;

  // If activating a non-MANUAL provider, validate keys exist
  if (body.active === true && body.provider && body.provider !== "MANUAL") {
    const existing = await getRawConfig(schoolId);
    const effectiveKeyId = body.keyId ?? existing?.keyId ?? "";
    const effectiveSecret = body.keySecret ?? existing?.keySecret ?? "";
    if (!effectiveKeyId || !effectiveSecret) {
      throw BadRequest(
        "Please enter both the Key ID and Secret Key before activating the gateway."
      );
    }
  }

  const cfg = await prisma.paymentGatewayConfig.upsert({
    where: { schoolId },
    create: data as Parameters<typeof prisma.paymentGatewayConfig.create>[0]["data"],
    update: data,
  });

  // Sync the onlinePayments feature flag to match cfg.active
  const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  const features = parseFeatures(settings?.features);
  if (features.onlinePayments !== cfg.active) {
    features.onlinePayments = cfg.active;
    await prisma.schoolSettings.update({
      where: { schoolId },
      data: { features: JSON.stringify(features) },
    });
  }

  return sanitiseConfig(cfg as any);
}

export async function testGatewayConnection(schoolId: string) {
  const cfg = await getRawConfig(schoolId);
  if (!cfg) throw NotFound("No payment gateway has been configured for your school yet.");
  if (!cfg.active) throw BadRequest("The payment gateway is not active. Please enable it first.");

  if (cfg.provider === "MANUAL") {
    return {
      ok: true,
      message: "Manual mode — no gateway connection required. Payments are recorded manually.",
    };
  }

  if (cfg.provider === "RAZORPAY") {
    // Lightweight connectivity check — fetch Razorpay account info
    try {
      const credentials = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (res.ok || res.status === 200) {
        return { ok: true, message: `Connected to Razorpay (${cfg.mode} mode) successfully.` };
      }
      const body = await res.json().catch(() => ({}));
      throw BadRequest(
        `Razorpay returned an error: ${(body as any)?.error?.description ?? res.statusText}. Check your Key ID and Secret.`
      );
    } catch (err: any) {
      if (err.status) throw err;
      throw BadRequest(
        "Could not reach Razorpay. Check your internet connection and credentials."
      );
    }
  }

  // For other providers, return a placeholder until SDKs are integrated
  return {
    ok: true,
    message: `${cfg.provider} gateway configured (${cfg.mode} mode). Full SDK integration is pending.`,
  };
}

// ── Payment order lifecycle ──────────────────────────────────

export async function createPaymentOrder(
  schoolId: string,
  input: { feeRecordId: string; amount: number }
) {
  // 1. Validate fee record
  const fee = await prisma.feeRecord.findFirst({
    where: { id: input.feeRecordId, schoolId },
  });
  if (!fee) throw NotFound("That fee record could not be found.");
  if (fee.status === "PAID") throw BadRequest("This fee has already been paid in full.");

  const amountMinor = toMinor(input.amount);
  const remaining = fee.amount - fee.amountPaid;
  if (amountMinor > remaining) {
    throw BadRequest(
      `Payment of ${input.amount} exceeds the remaining balance of ${remaining / 100}. Please enter a valid amount.`
    );
  }

  // 2. Get gateway config
  const cfg = await getRawConfig(schoolId);
  if (!cfg || !cfg.active) {
    throw Forbidden(
      "Online payments are not enabled for your school. Please configure a payment gateway in Preferences → Online Payments."
    );
  }

  // 3. Create order per provider
  if (cfg.provider === "RAZORPAY") {
    return createRazorpayOrder(cfg, input.feeRecordId, amountMinor, schoolId);
  }

  if (cfg.provider === "MANUAL") {
    // Manual provider — return a pseudo-order that the client records directly
    return {
      provider: "MANUAL",
      orderId: `MANUAL-${Date.now()}`,
      feeRecordId: input.feeRecordId,
      amount: input.amount,
      currency: await getSchoolCurrency(schoolId),
      message:
        "Manual mode — collect payment offline and click 'Confirm Payment' to record it.",
    };
  }

  throw BadRequest(
    `Order creation for ${cfg.provider} is not yet integrated. Please use Manual mode.`
  );
}

async function getSchoolCurrency(schoolId: string) {
  const s = await prisma.schoolSettings.findUnique({ where: { schoolId }, select: { currency: true } });
  return s?.currency ?? "INR";
}

async function createRazorpayOrder(
  cfg: { keyId: string; keySecret: string; mode: string },
  feeRecordId: string,
  amountMinor: number,
  schoolId: string
) {
  const currency = await getSchoolCurrency(schoolId);
  const credentials = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");

  const body = {
    amount: amountMinor,
    currency,
    receipt: `fee_${feeRecordId.slice(-8)}_${Date.now()}`,
    notes: { feeRecordId, schoolId },
  };

  const resp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw BadRequest(
      `Razorpay order creation failed: ${(err as any)?.error?.description ?? resp.statusText}. Check your API credentials.`
    );
  }

  const order = await resp.json() as any;
  return {
    provider: "RAZORPAY" as const,
    orderId: order.id,
    keyId: cfg.keyId, // publishable — safe to send to client
    amount: amountMinor / 100,
    currency,
    feeRecordId,
    mode: cfg.mode,
  };
}

// ── Payment verification & ledger recording ──────────────────

export async function verifyAndRecordPayment(
  schoolId: string,
  input: {
    feeRecordId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature?: string;
    amount: number;
  }
) {
  const cfg = await getRawConfig(schoolId);
  if (!cfg || !cfg.active) {
    throw Forbidden("Online payments are not enabled for your school.");
  }

  // Verify signature for Razorpay
  if (cfg.provider === "RAZORPAY" && input.gatewaySignature) {
    const secret = cfg.webhookSecret || cfg.keySecret;
    const payload = `${input.gatewayOrderId}|${input.gatewayPaymentId}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (expected !== input.gatewaySignature) {
      throw BadRequest(
        "Payment signature verification failed. This payment cannot be recorded — please contact support."
      );
    }
  }

  // Record in the immutable fee payment ledger
  const fee = await prisma.feeRecord.findFirst({
    where: { id: input.feeRecordId, schoolId },
  });
  if (!fee) throw NotFound("That fee record could not be found.");
  if (fee.status === "PAID") throw BadRequest("This fee has already been paid in full.");

  const payMinor = toMinor(input.amount);
  const newPaid = fee.amountPaid + payMinor;
  const remaining = fee.amount - fee.amountPaid;
  if (payMinor > remaining) {
    throw BadRequest(`Payment exceeds the remaining balance of ${remaining / 100}.`);
  }

  const status =
    newPaid >= fee.amount ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";
  const receiptNo = `RCPT-${Date.now()}-${crypto.randomInt(100000, 999999)}`;

  const [, updated] = await prisma.$transaction([
    prisma.feePayment.create({
      data: {
        schoolId,
        feeRecordId: fee.id,
        amount: payMinor,
        mode: "ONLINE",
        reference: input.gatewayPaymentId,
        receiptNo,
      },
    }),
    prisma.feeRecord.update({
      where: { id: fee.id },
      data: {
        amountPaid: newPaid,
        status,
        paidDate: status === "PAID" ? new Date() : fee.paidDate,
      },
      include: {
        items: { include: { feeHead: { select: { id: true, name: true } } } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
  ]);

  return { ...presentFee(updated), receiptNo };
}

// ── Razorpay webhook handler ──────────────────────────────────
// Called by Razorpay's servers on payment.captured events.
// Verifies the X-Razorpay-Signature header and records the payment.
export async function handleWebhook(
  schoolId: string,
  rawBody: string,
  signature: string
) {
  const cfg = await getRawConfig(schoolId);
  if (!cfg || !cfg.webhookSecret) {
    throw BadRequest("Webhook secret not configured for this school.");
  }

  const expected = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    throw BadRequest("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody);
  if (event.event !== "payment.captured") {
    return { ok: true, message: "Event ignored." };
  }

  const payment = event.payload?.payment?.entity;
  const feeRecordId = payment?.notes?.feeRecordId;
  if (!feeRecordId) return { ok: true, message: "No feeRecordId in notes — skipped." };

  const fee = await prisma.feeRecord.findFirst({
    where: { id: feeRecordId, schoolId },
  });
  if (!fee || fee.status === "PAID") return { ok: true, message: "Already paid or not found." };

  const amountMinor = payment.amount; // Razorpay sends paise
  const newPaid = fee.amountPaid + amountMinor;
  const status =
    newPaid >= fee.amount ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";
  const receiptNo = `RCPT-WH-${Date.now()}-${crypto.randomInt(100000, 999999)}`;

  await prisma.$transaction([
    prisma.feePayment.create({
      data: {
        schoolId,
        feeRecordId: fee.id,
        amount: amountMinor,
        mode: "ONLINE",
        reference: payment.id,
        receiptNo,
      },
    }),
    prisma.feeRecord.update({
      where: { id: fee.id },
      data: {
        amountPaid: newPaid,
        status,
        paidDate: status === "PAID" ? new Date() : fee.paidDate,
      },
    }),
  ]);

  return { ok: true, message: `Payment ${payment.id} recorded.` };
}
