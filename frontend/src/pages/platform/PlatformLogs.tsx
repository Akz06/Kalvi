import { useEffect, useState } from "react";
import axios from "axios";
import { platformApiBase } from "../../api/client";
import { ActivityIcon, SearchIcon } from "../../components/icons";

const PLATFORM_API = platformApiBase();
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem("platform_token")}` });

interface Log {
  id: string; action: string; target: string;
  meta?: string; timestamp: string; ip?: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:              "bg-blue-50 text-blue-700",
  SEED:               "bg-emerald-50 text-emerald-700",
  SUSPEND:            "bg-amber-50 text-amber-700",
  UNSUSPEND:          "bg-emerald-50 text-emerald-700",
  DELETE_SCHOOL:      "bg-red-50 text-red-700",
  IMPERSONATE:        "bg-violet-50 text-violet-700",
  UPDATE_PLAN:        "bg-indigo-50 text-indigo-700",
  UPDATE_FLAGS:       "bg-slate-100 text-slate-600",
  CREATE_ANNOUNCEMENT:"bg-orange-50 text-orange-700",
};

export default function PlatformLogs() {
  const [logs, setLogs]         = useState<Log[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    axios.get(`${PLATFORM_API}/logs?limit=200`, { headers: hdrs() })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target.toLowerCase().includes(search.toLowerCase()) ||
    (l.meta ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-500 text-sm mt-1">All platform admin actions — last 200 events (resets on restart).</p>
        </div>
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ActivityIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No activity yet.</p>
            <p className="text-slate-400 text-sm mt-1">Actions you take will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                <th className="text-left px-6 py-3">Action</th>
                <th className="text-left px-6 py-3">Target</th>
                <th className="text-left px-6 py-3">Details</th>
                <th className="text-left px-6 py-3">IP</th>
                <th className="text-left px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ACTION_COLORS[l.action] ?? "bg-slate-100 text-slate-600"
                    }`}>{l.action}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{l.target}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs max-w-xs truncate">{l.meta ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs font-mono">{l.ip ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
