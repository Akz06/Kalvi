import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useParentAuth } from "../../context/ParentAuthContext";
import { parentApi } from "../../api/parentClient";
import { Spinner } from "../../components/ui";

interface AttendanceSummary {
  summary: Record<string, number>;
  attendancePercentage: number;
  recent: { date: string; status: string }[];
}

interface FeeRecord {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
}

interface ExamSummary {
  results: { subject: string; grade: string }[];
  summary: { overallGrade: string; percentage: number };
}

export default function ParentDashboard() {
  const { guardian } = useParentAuth();
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [exams, setExams] = useState<ExamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      parentApi.get("/parent/portal/attendance"),
      parentApi.get("/parent/portal/fees"),
      parentApi.get("/parent/portal/exams"),
    ])
      .then(([a, f, e]) => {
        setAttendance(a.data);
        setFees(f.data);
        setExams(e.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const student = guardian?.student;
  const outstanding = fees.filter((f) => f.status !== "PAID");
  const totalDue = outstanding.reduce((s, f) => s + (f.amount - f.amountPaid), 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome back, {guardian?.name}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Here's a quick snapshot of {student?.firstName}'s school performance.
        </p>
      </div>

      {/* Child info banner */}
      {student && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
            {student.firstName[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-sm text-slate-500">
              {student.section.class.name} — Section {student.section.name} &nbsp;·&nbsp;
              Admission No: {student.admissionNo}
            </p>
          </div>
          <span className="ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            Active
          </span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📅"
          label="Attendance"
          value={`${attendance?.attendancePercentage ?? 0}%`}
          sub={`${attendance?.summary.PRESENT ?? 0} days present`}
          color="blue"
        />
        <StatCard
          icon="❌"
          label="Absences"
          value={String(attendance?.summary.ABSENT ?? 0)}
          sub="total absent days"
          color="red"
        />
        <StatCard
          icon="📝"
          label="Overall Grade"
          value={exams?.summary.overallGrade ?? "—"}
          sub={
            exams?.summary.percentage != null
              ? `${exams.summary.percentage.toFixed(1)}% average`
              : "No exams yet"
          }
          color="purple"
        />
        <StatCard
          icon="💰"
          label="Fees Due"
          value={totalDue > 0 ? `₹${totalDue.toLocaleString("en-IN")}` : "All Clear"}
          sub={outstanding.length > 0 ? `${outstanding.length} pending invoice(s)` : "No pending fees"}
          color={totalDue > 0 ? "amber" : "green"}
        />
      </div>

      {/* Two-column detail rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent attendance */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Recent Attendance</h3>
            <Link to="/parent/attendance" className="text-xs text-emerald-600 hover:underline">
              View all →
            </Link>
          </div>
          {attendance?.recent.length ? (
            <div className="space-y-2">
              {attendance.recent.slice(0, 7).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {new Date(r.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No attendance records yet.</p>
          )}
        </div>

        {/* Pending fees */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Pending Fees</h3>
            <Link to="/parent/fees" className="text-xs text-emerald-600 hover:underline">
              View all →
            </Link>
          </div>
          {outstanding.length ? (
            <div className="space-y-3">
              {outstanding.slice(0, 4).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-800">{f.title}</p>
                    <p className="text-xs text-slate-400">
                      Due {new Date(f.dueDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      ₹{(f.amount - f.amountPaid).toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        f.status === "PARTIAL"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">🎉 All fees are paid. Great job!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
};

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "blue",
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR_MAP[color] ?? COLOR_MAP.blue}`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs opacity-60 mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT: "bg-red-100 text-red-700",
    LATE: "bg-amber-100 text-amber-700",
    LEAVE: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}
