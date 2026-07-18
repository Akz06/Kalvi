import { Fragment, useEffect, useState } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import {
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  FormError,
  FieldHint,
} from "../components/ui";
import { formatDate, money } from "../lib/format";
import { CloseIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from "../components/icons";
import { useConfig } from "../context/ConfigContext";
import { DownloadPDFButton } from "../components/pdf/DownloadPDFButton";
import { ReceiptPDF } from "../components/pdf/ReceiptPDF";

interface FeeItem {
  id: string;
  amount: number;
  feeHead: { id: string; name: string };
}
interface FeePaymentRow {
  id: string;
  amount: number;
  mode: string;
  reference?: string;
  receiptNo: string;
  paidAt: string;
}
interface Fee {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  dueDate: string;
  items: FeeItem[];
  payments: FeePaymentRow[];
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    guardianName?: string;
    section?: { name: string; class?: { name: string } };
  };
}
interface StudentOpt {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  section?: { classId: string; class?: { name: string } };
}
interface FeeHead {
  id: string;
  name: string;
  defaultAmount: number;
  active: boolean;
  classId: string;
}
interface LineItem {
  feeHeadId: string;
  amount: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
};

export default function Fees() {
  const { config } = useConfig();
  const cur = config?.settings?.currency ?? "INR";
  const loc = config?.settings?.locale ?? "en-IN";
  const money$ = (n: number) => money(n, cur, loc);

  const [fees, setFees] = useState<Fee[] | null>(null);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Fee | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{ fee: Fee; payment: FeePaymentRow } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [payRef, setPayRef] = useState("");

  // Invoice header + subform lines
  const [form, setForm] = useState({ studentId: "", title: "", dueDate: "" });
  const [lines, setLines] = useState<LineItem[]>([{ feeHeadId: "", amount: "" }]);

  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [payError, setPayError] = useState("");

  function load() {
    api.get("/fees").then((r) => setFees(r.data));
  }
  useEffect(() => {
    load();
    api.get("/students").then((r) => setStudents(r.data));
  }, []);

  const activeHeads = heads.filter((h) => h.active);
  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // Load the fee heads for the selected student's class.
  function onSelectStudent(studentId: string) {
    setForm((f) => ({ ...f, studentId }));
    setLines([{ feeHeadId: "", amount: "" }]);
    setHeads([]);
    const student = students.find((s) => s.id === studentId);
    const classId = student?.section?.classId;
    if (classId) {
      api
        .get(`/fees/heads?activeOnly=true&classId=${classId}`)
        .then((r) => setHeads(r.data));
    }
  }

  function openNew() {
    setForm({ studentId: "", title: "", dueDate: "" });
    setLines([{ feeHeadId: "", amount: "" }]);
    setHeads([]);
    setError("");
    setIssues([]);
    setOpen(true);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function pickHead(idx: number, feeHeadId: string) {
    const head = heads.find((h) => h.id === feeHeadId);
    // Pre-fill the amount with the fee head's default when empty.
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              feeHeadId,
              amount:
                l.amount === "" && head && head.defaultAmount > 0
                  ? String(head.defaultAmount)
                  : l.amount,
            }
          : l
      )
    );
  }
  function addLine() {
    setLines((prev) => [...prev, { feeHeadId: "", amount: "" }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function createFee(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);

    // Client-side guards with plain-language messages.
    const filled = lines.filter((l) => l.feeHeadId && l.amount !== "");
    if (filled.length === 0) {
      setError("Please add at least one fee head with an amount.");
      return;
    }
    const headIds = filled.map((l) => l.feeHeadId);
    if (new Set(headIds).size !== headIds.length) {
      setError("Each fee head can only appear once. Please remove duplicates.");
      return;
    }
    if (filled.some((l) => Number(l.amount) <= 0)) {
      setError("Each line amount must be greater than zero.");
      return;
    }

    try {
      await api.post("/fees", {
        studentId: form.studentId,
        title: form.title,
        dueDate: form.dueDate,
        items: filled.map((l) => ({
          feeHeadId: l.feeHeadId,
          amount: Number(l.amount),
        })),
      });
      setOpen(false);
      load();
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't create this fee.");
      setError(parsed.message);
      setIssues(parsed.issues);
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    setPayError("");
    try {
      const res = await api.post(`/fees/${payFor.id}/pay`, {
        amount: Number(payAmount),
        mode: payMode,
        reference: payRef || undefined,
      });
      // Capture the receipt data so we can offer a download immediately.
      const updatedFee: Fee = res.data;
      const latestPayment = updatedFee.payments?.[0];
      if (latestPayment) setLastReceipt({ fee: updatedFee, payment: latestPayment });
      setPayFor(null);
      setPayAmount("");
      setPayRef("");
      setPayMode("CASH");
      load();
    } catch (err) {
      setPayError(parseApiError(err, "We couldn't record this payment.").message);
    }
  }

  /** Build the props needed to render a ReceiptPDF for a given fee + payment. */
  function buildReceiptProps(fee: Fee, payment: FeePaymentRow) {
    const schoolSettings = config?.settings;
    return {
      school: {
        name: config?.name ?? "Kalvi",
        addressLine: schoolSettings?.addressLine,
        city: schoolSettings?.city,
        state: schoolSettings?.state,
        phone: schoolSettings?.phone,
        email: schoolSettings?.email,
        board: schoolSettings?.board,
        currency: cur,
        locale: loc,
      },
      student: {
        admissionNo: fee.student.admissionNo,
        name: `${fee.student.firstName} ${fee.student.lastName}`,
        class: fee.student.section?.class?.name ?? "—",
        section: fee.student.section?.name ?? "—",
        guardianName: fee.student.guardianName,
      },
      invoice: {
        title: fee.title,
        dueDate: fee.dueDate,
        totalAmount: fee.amount,
        previouslyPaid: fee.amountPaid - payment.amount,
        items: fee.items.map((it) => ({
          name: it.feeHead.name,
          amount: it.amount,
        })),
      },
      payment: {
        receiptNo: payment.receiptNo,
        paidAt: payment.paidAt,
        amount: payment.amount,
        mode: payment.mode,
        reference: payment.reference,
      },
      allPayments: fee.payments.map((p) => ({
        receiptNo: p.receiptNo,
        paidAt: p.paidAt,
        amount: p.amount,
        mode: p.mode,
        reference: p.reference,
      })),
    };
  }

  return (
    <div>
      <PageHeader
        title="Fees"
        action={
          <button className="btn-primary" onClick={openNew}>
            + New Fee
          </button>
        }
      />

      {!fees ? (
        <Spinner />
      ) : fees.length === 0 ? (
        <EmptyState text="No fee records yet." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Heads</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((f) => (
                <Fragment key={f.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {f.student.firstName} {f.student.lastName}
                      <span className="block text-xs text-slate-400">
                        {f.student.admissionNo}
                      </span>
                    </td>
                    <td className="px-4 py-3">{f.title}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-brand-600 hover:underline text-xs"
                        onClick={() =>
                          setExpanded(expanded === f.id ? null : f.id)
                        }
                      >
                        {f.items?.length ?? 0} head
                        {(f.items?.length ?? 0) === 1 ? "" : "s"}{" "}
                        {expanded === f.id ? <ChevronUpIcon className="w-3.5 h-3.5 inline" /> : <ChevronDownIcon className="w-3.5 h-3.5 inline" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">{money$(f.amount)}</td>
                    <td className="px-4 py-3">{money$(f.amountPaid)}</td>
                    <td className="px-4 py-3">{formatDate(f.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColors[f.status]}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-y-1">
                      {f.status !== "PAID" && (
                        <button
                          className="text-brand-600 hover:text-brand-800 text-xs font-medium block"
                          onClick={() => {
                            setPayError("");
                            setPayFor(f);
                            setPayAmount(String(f.amount - f.amountPaid));
                          }}
                        >
                          Record Payment
                        </button>
                      )}
                      {/* Show download button for each recorded payment */}
                      {f.payments?.map((p) => (
                        <DownloadPDFButton
                          key={p.id}
                          document={<ReceiptPDF {...buildReceiptProps(f, p)} />}
                          fileName={`receipt-${p.receiptNo}.pdf`}
                          label={`Receipt ${p.receiptNo}`}
                          className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200"
                        />
                      ))}
                    </td>
                  </tr>
                  {expanded === f.id && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="text-xs text-slate-500 mb-1 font-medium">
                          Fee heads
                        </div>
                        <ul className="space-y-1">
                          {f.items?.map((it) => (
                            <li
                              key={it.id}
                              className="flex justify-between max-w-sm"
                            >
                              <span>{it.feeHead.name}</span>
                              <span className="font-medium">
                                {money$(it.amount)}
                              </span>
                            </li>
                          ))}
                          <li className="flex justify-between max-w-sm border-t border-slate-200 pt-1 font-semibold">
                            <span>Total</span>
                            <span>{money$(f.amount)}</span>
                          </li>
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New invoice with fee-head subform */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Fee Invoice">
        <form onSubmit={createFee} className="space-y-3">
          <div>
            <label className="label">Student</label>
            <select
              className="input"
              value={form.studentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.admissionNo} — {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <FieldHint>
              Fee heads are shown based on the student's class.
            </FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                placeholder="e.g. Term 1 Fees"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Subform: Fee head + Amount */}
          <div>
            <label className="label">Fee Heads</label>
            <FieldHint>
              Add one or more fee heads with their amounts. Options come from the
              student's class configuration.
            </FieldHint>
            {!form.studentId ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Select a student first to load their class's fee heads.
              </p>
            ) : activeHeads.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                This student's class has no fee heads configured yet. Add them
                under <strong>Preferences &gt; Fee Configuration</strong>.
              </p>
            ) : null}
            <div className="mt-2 space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={line.feeHeadId}
                    onChange={(e) => pickHead(idx, e.target.value)}
                    disabled={!form.studentId || activeHeads.length === 0}
                  >
                    <option value="">Select fee head…</option>
                    {activeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input w-32"
                    type="number"
                    min="1"
                    placeholder={`Amount`}
                    value={line.amount}
                    onChange={(e) => updateLine(idx, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-500 px-2"
                    onClick={() => removeLine(idx)}
                    title="Remove line"
                    disabled={lines.length === 1}
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-2 text-sm"
              onClick={addLine}
            >
              + Add fee head
            </button>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
              <span>Total ({cur})</span>
              <span>{money$(linesTotal)}</span>
            </div>
          </div>

          <FormError message={error} issues={issues} />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      {/* Post-payment receipt download toast */}
      {lastReceipt && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-white shadow-2xl border border-slate-200 px-4 py-3 animate-fade-in">
          <CheckCircleIcon className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Payment recorded!</p>
            <p className="text-xs text-slate-500">Receipt {lastReceipt.payment.receiptNo}</p>
          </div>
          <DownloadPDFButton
            document={<ReceiptPDF {...buildReceiptProps(lastReceipt.fee, lastReceipt.payment)} />}
            fileName={`receipt-${lastReceipt.payment.receiptNo}.pdf`}
            label="Download Receipt"
          />
          <button
            className="ml-2 text-slate-400 hover:text-slate-600"
            onClick={() => setLastReceipt(null)}
          ><CloseIcon className="w-4 h-4" /></button>
        </div>
      )}

      {/* Payment */}
      <Modal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        title="Record Payment"
      >
        {payFor && (
          <form onSubmit={pay} className="space-y-3">
            <p className="text-sm text-slate-600">
              {payFor.title} — {payFor.student.firstName}{" "}
              {payFor.student.lastName}
            </p>
            {payFor.items?.length > 0 && (
              <ul className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
                {payFor.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span className="text-slate-600">{it.feeHead.name}</span>
                    <span>{money$(it.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm">
              Balance due:{" "}
              <strong>{money$(payFor.amount - payFor.amountPaid)}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Payment Amount ({cur})</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select
                  className="input"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  {["CASH", "CARD", "UPI", "BANK", "CHEQUE", "OTHER"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Reference (optional)</label>
              <input
                className="input"
                placeholder="Txn ID / Cheque no."
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
              <FieldHint>For UPI/card/cheque, record the transaction id.</FieldHint>
            </div>
            <FormError message={payError} />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPayFor(null)}
              >
                Cancel
              </button>
              <button className="btn-primary">Record</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
