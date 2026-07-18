import { useEffect, useState } from "react";
import { parentApi } from "../../api/parentClient";
import { Spinner } from "../../components/ui";
import { FeesIcon, WarningIcon, ChevronDownIcon, ChevronUpIcon } from "../../components/icons";

interface FeeItem {
  amount: number;
  feeHead: { name: string };
}

interface FeePayment {
  receiptNo: string;
  amount: number;
  mode: string;
  paidAt: string;
}

interface FeeRecord {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  items: FeeItem[];
  payments: FeePayment[];
}

export default function ParentFees() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    parentApi
      .get("/parent/portal/fees")
      .then((r) => setFees(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const paid = fees.filter((f) => f.status === "PAID");
  const pending = fees.filter((f) => f.status !== "PAID");
  const totalOutstanding = pending.reduce((s, f) => s + (f.amount - f.amountPaid), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FeesIcon className="w-6 h-6 text-amber-600" /> Fees</h2>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-xs text-red-500 font-medium">Outstanding</p>
          <p className="text-2xl font-bold text-red-700">
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-red-400">{pending.length} pending invoice(s)</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-xs text-green-500 font-medium">Paid Invoices</p>
          <p className="text-2xl font-bold text-green-700">{paid.length}</p>
          <p className="text-xs text-green-400">fully settled</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-700">{fees.length}</p>
          <p className="text-xs text-slate-400">all time</p>
        </div>
      </div>

      {/* Fee records */}
      {fees.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          No fee invoices found. Contact your school administrator.
        </div>
      ) : (
        <div className="space-y-3">
          {fees.map((f) => (
            <div key={f.id} className="card overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-semibold text-slate-800">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Due: {new Date(f.dueDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-bold text-slate-800">
                      ₹{f.amount.toLocaleString("en-IN")}
                    </p>
                    {f.amountPaid > 0 && f.status !== "PAID" && (
                      <p className="text-xs text-amber-600">
                        ₹{(f.amount - f.amountPaid).toLocaleString("en-IN")} remaining
                      </p>
                    )}
                  </div>
                  <StatusBadge status={f.status} />
                  <span className="text-slate-300 text-sm">{expanded === f.id ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === f.id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-4">
                  {/* Fee breakdown */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                      Fee Breakdown
                    </p>
                    <div className="space-y-1">
                      {f.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item.feeHead.name}</span>
                          <span className="font-medium">₹{item.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1 mt-1">
                        <span>Total</span>
                        <span>₹{f.amount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payments made */}
                  {f.payments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Payment History
                      </p>
                      <div className="space-y-1">
                        {f.payments.map((p, i) => (
                          <div key={i} className="flex justify-between text-sm bg-white rounded p-2">
                            <div>
                              <p className="font-medium text-slate-700">
                                {p.mode} &nbsp;·&nbsp;
                                <span className="text-xs text-slate-400">{p.receiptNo}</span>
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(p.paidAt).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                            <span className="font-semibold text-green-700">
                              ₹{p.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {f.status !== "PAID" && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 flex items-start gap-1.5">
                      <WarningIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>This invoice has an outstanding balance of{" "}
                      <strong>₹{(f.amount - f.amountPaid).toLocaleString("en-IN")}</strong>.
                      Please contact the school office to make a payment.</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PARTIAL: "bg-amber-100 text-amber-700",
    PENDING: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
