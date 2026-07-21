import { useEffect, useState } from "react";
import axios from "axios";
import { platformApiBase } from "../../api/client";
import {
  SchoolIcon, StudentsIcon, StaffIcon, CheckCircleIcon,
  CloseIcon, TrendUpIcon,
} from "../../components/icons";

const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem("platform_token")}` });

interface Stats {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalStudents: number;
  totalStaff: number;
  growth: { month: string; count: number }[];
  recentSchools: {
    id: string; name: string; slug: string; active: boolean;
    createdAt: string; city: string; board: string;
    students: number; staff: number;
  }[];
}

const COLORS: Record<string, string> = {
  indigo: "from-indigo-500 to-indigo-700",
  green:  "from-emerald-500 to-emerald-700",
  violet: "from-violet-500 to-violet-700",
  orange: "from-orange-500 to-orange-600",
};

export default function PlatformDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = () => {
    setLoading(true); setError(false);
    axios.get(`${platformApiBase()}/stats`, { headers: hdrs() })
      .then((r) => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
      </svg>
    </div>
  );

  if (error || !stats) return (
    <div className="flex items-center justify-center h-full flex-col gap-3">
      <CloseIcon className="w-10 h-10 text-red-400" />
      <p className="text-slate-500 font-medium">Could not load platform stats.</p>
      <button onClick={load} className="text-indigo-600 text-sm font-semibold hover:underline">Retry</button>
    </div>
  );

  const cards = [
    { label: "Total Schools",    value: stats.totalSchools,   sub: `${stats.activeSchools} active`,    color: "indigo", icon: <SchoolIcon   className="w-5 h-5 text-white" /> },
    { label: "Active Schools",   value: stats.activeSchools,  sub: `${stats.suspendedSchools} suspended`, color: "green",  icon: <CheckCircleIcon className="w-5 h-5 text-white" /> },
    { label: "Total Students",   value: stats.totalStudents,  sub: "across all schools",              color: "violet", icon: <StudentsIcon className="w-5 h-5 text-white" /> },
    { label: "Total Staff",      value: stats.totalStaff,     sub: "active staff members",            color: "orange", icon: <StaffIcon    className="w-5 h-5 text-white" /> },
  ];

  // Growth bar chart
  const maxCount = Math.max(...stats.growth.map((g) => g.count), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-slate-500 mt-1 text-sm">Live stats across all schools on Kalvi.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl overflow-hidden shadow-sm">
            <div className={`bg-gradient-to-br ${COLORS[c.color]} p-5 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{c.label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {c.icon}
                </div>
              </div>
              <p className="text-4xl font-extrabold">{c.value.toLocaleString()}</p>
              <p className="text-xs mt-1 opacity-70">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Growth chart + Recent schools side by side */}
      <div className="grid grid-cols-3 gap-6">
        {/* Signups Growth */}
        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendUpIcon className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-800 text-sm">School Signups (6 months)</h2>
          </div>
          {stats.growth.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {stats.growth.map((g) => (
                <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-700">{g.count}</span>
                  <div
                    className="w-full rounded-t-md bg-indigo-500 transition-all"
                    style={{ height: `${(g.count / maxCount) * 80}px`, minHeight: 4 }}
                  />
                  <span className="text-[10px] text-slate-400 rotate-45 origin-left">
                    {g.month.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Schools */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Schools</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">School</th>
                <th className="text-left px-5 py-3">Board</th>
                <th className="text-right px-5 py-3">Students</th>
                <th className="text-right px-5 py-3">Staff</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentSchools.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No schools yet.</td></tr>
              ) : stats.recentSchools.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="text-slate-400 text-xs">{s.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{s.board || "—"}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{s.students}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{s.staff}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>{s.active ? "Active" : "Suspended"}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {new Date(s.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
