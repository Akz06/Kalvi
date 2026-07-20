import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { SeedIcon, TrashIcon, SearchIcon, ArrowRightIcon } from "../../components/icons";
import { platformApiBase } from "../../api/client";

const PLATFORM_API = platformApiBase();
function headers() { return { Authorization: `Bearer ${localStorage.getItem("platform_token")}` }; }

interface School {
  id: string; name: string; slug: string; active: boolean;
  createdAt: string; city: string; board: string; plan: string;
  students: number; staff: number;
}

interface SeedResult {
  message: string; school: string;
  counts: Record<string, number>;
}

export default function PlatformSchools() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seedTarget, setSeedTarget] = useState<School | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    axios.get(`${PLATFORM_API}/schools?search=${search}`, { headers: headers() })
      .then((r) => setSchools(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const handleSuspend = async (school: School) => {
    await axios.post(`${PLATFORM_API}/schools/${school.id}/suspend`, {}, { headers: headers() });
    load();
  };

  const handleSeed = async () => {
    if (!seedTarget) return;
    setSeeding(true);
    try {
      const res = await axios.post(`${PLATFORM_API}/schools/${seedTarget.id}/seed`, {}, { headers: headers() });
      setSeedResult(res.data);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${PLATFORM_API}/schools/${deleteTarget.id}`, { headers: headers() });
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schools</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{schools.length} schools on the platform</p>
        </div>
        {/* Search */}
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
              <th className="text-left px-6 py-3">School</th>
              <th className="text-left px-6 py-3">Board / City</th>
              <th className="text-right px-6 py-3">Students</th>
              <th className="text-right px-6 py-3">Staff</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Joined</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading…</td></tr>
            ) : schools.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">No schools found.</td></tr>
            ) : schools.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-slate-400 text-xs">{s.slug}</p>
                </td>
                <td className="px-6 py-3.5 text-slate-600 text-xs">
                  <p>{s.board || "—"}</p>
                  <p className="text-slate-400">{s.city || "—"}</p>
                </td>
                <td className="px-6 py-3.5 text-right font-medium text-slate-800">{s.students}</td>
                <td className="px-6 py-3.5 text-right font-medium text-slate-800">{s.staff}</td>
                <td className="px-6 py-3.5">
                  <button
                    onClick={() => handleSuspend(s)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      s.active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {s.active ? "Active" : "Suspended"}
                  </button>
                </td>
                <td className="px-6 py-3.5 text-slate-500 text-xs">
                  {new Date(s.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/admin/schools/${s.id}`)}
                      title="View detail"
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSeedTarget(s); setSeedResult(null); }}
                      title="Seed dummy data"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <SeedIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      title="Delete school"
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Seed Modal */}
      {seedTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {!seedResult ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <SeedIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Create Dummy Data</h3>
                    <p className="text-sm text-slate-500">{seedTarget.name}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5 text-sm text-slate-600">
                  {[
                    "1 Academic Year (current)",
                    "8 Designations",
                    "12 Subjects",
                    "10 Classes (Grade 1–10) + 20 Sections",
                    "10 Staff members",
                    "200 Students + Guardians",
                    "30 days of Attendance",
                    "Fee records + payments",
                    "15 Exams across 3 classes",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400 mb-5">
                  Already existing data will be skipped. Safe to run multiple times.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSeedTarget(null)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {seeding ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                      </svg>
                    ) : <SeedIcon className="w-4 h-4" />}
                    {seeding ? "Creating…" : "Create Dummy Data"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">Done!</h3>
                  <p className="text-sm text-slate-500 mt-1">{seedResult.message}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(seedResult.counts).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-500 capitalize">{k}</span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSeedTarget(null); setSeedResult(null); }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Delete School?</h3>
              <p className="text-sm text-slate-500 mt-1">
                This will permanently delete <strong>{deleteTarget.name}</strong> and all its data.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
