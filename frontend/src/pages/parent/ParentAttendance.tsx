import { useEffect, useState } from "react";
import { parentApi } from "../../api/parentClient";
import { Spinner } from "../../components/ui";
import { AttendanceIcon, WarningIcon } from "../../components/icons";

interface AttendanceRecord {
  date: string;
  status: string;
  remark?: string;
}

export default function ParentAttendance() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [pct, setPct] = useState(0);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi
      .get("/parent/portal/attendance")
      .then((r) => {
        setSummary(r.data.summary);
        setPct(r.data.attendancePercentage);
        setRecent(r.data.recent);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><AttendanceIcon className="w-6 h-6 text-blue-600" /> Attendance</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Present", key: "PRESENT", color: "bg-green-100 text-green-700" },
          { label: "Absent", key: "ABSENT", color: "bg-red-100 text-red-700" },
          { label: "Late", key: "LATE", color: "bg-amber-100 text-amber-700" },
          { label: "Leave", key: "LEAVE", color: "bg-blue-100 text-blue-700" },
        ].map(({ label, key, color }) => (
          <div key={key} className={`rounded-xl p-4 ${color}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-3xl font-bold">{summary[key] ?? 0}</p>
            <p className="text-xs opacity-60">
              {total > 0 ? `${Math.round(((summary[key] ?? 0) / total) * 100)}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Attendance % bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Overall Attendance</span>
          <span className={`font-bold text-lg ${pct >= 75 ? "text-green-600" : "text-red-600"}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${pct >= 75 ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        {pct < 75 && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
            <WarningIcon className="w-3.5 h-3.5" /> Attendance is below 75%. Please contact the school.
          </p>
        )}
      </div>

      {/* Recent records table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Recent Records (last 30 days)</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No records found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Day</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((r, i) => {
                const d = new Date(r.date);
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">
                      {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {d.toLocaleDateString("en-IN", { weekday: "long" })}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{r.remark ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
