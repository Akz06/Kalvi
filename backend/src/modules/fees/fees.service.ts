import { prisma } from "../../shared/prisma.js";
import { BadRequest, Conflict, NotFound } from "../../shared/errors.js";
import { toMinor, moneyToMajor, MONEY_FIELDS } from "../../shared/money.js";

type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK" | "CHEQUE" | "ONLINE" | "OTHER";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asEnum = <T>(v: string): T => v as any;

/** Present a fee entity to the client with money fields in major units. */
export function present<T extends Record<string, any>>(obj: T): T {
  return moneyToMajor(obj, MONEY_FIELDS);
}

function computeStatus(amount: number, paid: number) {
  if (paid <= 0) return "PENDING" as const;
  if (paid >= amount) return "PAID" as const;
  return "PARTIAL" as const;
}

const headInclude = { class: { select: { id: true, name: true, level: true } } };

// ── Fee configuration (per class) ───────────────────────────
export async function listFeeHeads(
  schoolId: string,
  filter: { classId?: string; activeOnly?: string }
) {
  const heads = await prisma.feeHead.findMany({
    where: {
      schoolId,
      ...(filter.classId ? { classId: filter.classId } : {}),
      ...(filter.activeOnly === "true" ? { active: true } : {}),
    },
    orderBy: [{ class: { level: "asc" } }, { name: "asc" }],
    include: headInclude,
  });
  return heads.map(present);
}

export async function createFeeHead(schoolId: string, body: any) {
  const { classId, name } = body;
  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!cls) throw NotFound("The selected class was not found in your school.");

  const existing = await prisma.feeHead.findFirst({ where: { classId, name } });
  if (existing)
    throw Conflict(
      "A fee head with this name already exists for this class. Please use a different name."
    );

  const head = await prisma.feeHead.create({
    data: {
      schoolId,
      classId,
      name,
      defaultAmount: toMinor(body.defaultAmount ?? 0),
      active: body.active ?? true,
    },
    include: headInclude,
  });
  return present(head);
}

export async function updateFeeHead(schoolId: string, id: string, body: any) {
  const head = await prisma.feeHead.findFirst({ where: { id, schoolId } });
  if (!head) throw NotFound("That fee head could not be found.");

  const data: any = { ...body };
  if (data.defaultAmount !== undefined) data.defaultAmount = toMinor(data.defaultAmount);

  const updated = await prisma.feeHead.update({
    where: { id: head.id },
    data,
    include: headInclude,
  });
  return present(updated);
}

export async function deleteFeeHead(schoolId: string, id: string) {
  const head = await prisma.feeHead.findFirst({ where: { id, schoolId } });
  if (!head) throw NotFound("That fee head could not be found.");
  const used = await prisma.feeItem.count({ where: { feeHeadId: head.id } });
  if (used > 0)
    throw BadRequest(
      "This fee head is used on existing invoices, so it can't be deleted. Deactivate it instead."
    );
  await prisma.feeHead.delete({ where: { id: head.id } });
}

// ── Fee invoices ────────────────────────────────────────────
const feeInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
  },
  items: { include: { feeHead: { select: { id: true, name: true } } } },
  payments: { orderBy: { paidAt: "desc" as const } },
};

export async function listFees(
  schoolId: string,
  filter: { studentId?: string; status?: string }
) {
  const fees = await prisma.feeRecord.findMany({
    where: {
      schoolId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.status ? { status: filter.status as any } : {}),
    },
    orderBy: { dueDate: "desc" },
    include: feeInclude,
  });
  return fees.map(present);
}

export async function createFee(
  schoolId: string,
  body: {
    studentId: string;
    title: string;
    dueDate: Date;
    items: { feeHeadId: string; amount: number }[];
  }
) {
  const { studentId, title, dueDate, items } = body;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: { section: { select: { classId: true } } },
  });
  if (!student) throw NotFound("That student was not found in your school.");

  const headIds = Array.from(new Set(items.map((i) => i.feeHeadId)));
  if (headIds.length !== items.length)
    throw BadRequest(
      "Each fee head can only appear once per invoice. Please remove duplicates."
    );

  const heads = await prisma.feeHead.findMany({
    where: { id: { in: headIds }, schoolId },
    select: { id: true, classId: true },
  });
  if (heads.length !== headIds.length)
    throw BadRequest(
      "One or more selected fee heads are invalid. Please refresh and try again."
    );
  if (heads.some((h) => h.classId !== student.section.classId))
    throw BadRequest(
      "One or more selected fee heads do not belong to this student's class. Please choose fee heads configured for the student's class."
    );

  const total = items.reduce((sum, i) => sum + toMinor(i.amount), 0);

  const fee = await prisma.feeRecord.create({
    data: {
      schoolId,
      studentId,
      title,
      dueDate,
      amount: total,
      items: {
        create: items.map((i) => ({
          schoolId,
          feeHeadId: i.feeHeadId,
          amount: toMinor(i.amount),
        })),
      },
    },
    include: feeInclude,
  });
  return present(fee);
}

export async function payFee(
  schoolId: string,
  id: string,
  body: { amount: number; mode?: string; reference?: string }
) {
  const fee = await prisma.feeRecord.findFirst({ where: { id, schoolId } });
  if (!fee) throw NotFound("That fee record could not be found.");
  if (fee.status === "PAID") throw BadRequest("This fee has already been paid in full.");

  const payMinor = toMinor(body.amount);
  const newPaid = fee.amountPaid + payMinor;
  if (newPaid > fee.amount) {
    const due = (fee.amount - fee.amountPaid) / 100;
    throw BadRequest(
      `Payment is more than the amount due. The remaining balance is ${due}.`
    );
  }

  const status = computeStatus(fee.amount, newPaid);
  const receiptNo = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const [, updated] = await prisma.$transaction([
    prisma.feePayment.create({
      data: {
        schoolId,
        feeRecordId: fee.id,
        amount: payMinor,
        mode: asEnum<PaymentMode>(body.mode ?? "CASH"),
        reference: body.reference,
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
  return { ...present(updated), receiptNo };
}

export async function deleteFee(schoolId: string, id: string) {
  const fee = await prisma.feeRecord.findFirst({ where: { id, schoolId } });
  if (!fee) throw NotFound("That fee record could not be found.");
  await prisma.feeRecord.delete({ where: { id } });
}
