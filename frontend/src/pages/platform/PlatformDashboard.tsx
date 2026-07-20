import { useEffect, useState } from "react";
import axios from "axios";
import { SchoolIcon, StudentsIcon, StaffIcon, CheckCircleIcon } from "../../components/icons";

const PLATFORM_API = `${(import.meta.env.VITE_API_URL as string ?? "").replace(/\/$/, "")}/api/platform`;

function platformHeaders() {
  const token = localStorage.getItem("platform_token");
  return { Authorization: `Bearer ${token}` };
}

interface Stats {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalStaff: number;
  recentSchools: {
    id: string; name: string; slug: string; active: boolean;
    createdAt: string; city: string; board: string;
    students: number; staff: number;
  }[];
}

const statCards = (s: Stats) => [
  { label: "Total Schools",   value: s.totalSchools,   icon: <SchoolIcon  className="w-6 h-6" />, color: "indigo" },
  { label: "Active Schools",  value: s.activeSchools,  icon: <CheckCircleIcon className="w-6 h-6" />, color: "green"  },
  { label: "Total Students",  value: s.totalStudents,  icon: <StudentsIcon className="w-6 h-6" />, color: "violet" },
  { label: "Total Staff",     value: s.totalStaff,     icon: <StaffIcon   className="w-6 h-6" />, color: "orange" },
];

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  green:  "bg-emerald-50 text-emerald-600 border-emerald-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
};

export default function PlatformDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${PLATFORM_API}/stats`, { headers: platformHeaders() })
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
        </svg>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-slate-500 mt-1">All schools and usage across the Kalvi platform.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {statCards(stats).map((c) => (
          <div key={c.label} className={`rounded-2xl border p-5 ${colorMap[c.color]}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-80">{c.label}</span>
              {c.icon}
            </div>
            <p className="text-3xl font-bold">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent schools */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Schools</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-3">School</th>
              <th className="text-left px-6 py-3">Board</th>
              <th className="text-left px-6 py-3">City</th>
              <th className="text-right px-6 py-3">Students</th>
              <th className="text-right px-6 py-3">Staff</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.recentSchools.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-slate-400 text-xs">{s.slug}</p>
                </td>
                <td className="px-6 py-3.5 text-slate-600">{s.board || "—"}</td>
                <td className="px-6 py-3.5 text-slate-600">{s.city || "—"}</td>
                <td className="px-6 py-3.5 text-right text-slate-800 font-medium">{s.students}</td>
                <td className="px-6 py-3.5 text-right text-slate-800 font-medium">{s.staff}</td>
                <td className="px-6 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    s.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {s.active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-500 text-xs">
                  {new Date(s.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
