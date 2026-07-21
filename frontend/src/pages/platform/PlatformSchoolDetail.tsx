import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { platformApi } from "../../api/client";
import {
  ArrowLeftIcon, SchoolIcon, StudentsIcon, StaffIcon,
  CheckCircleIcon, CloseIcon, KeyIcon, FlagIcon, EditIcon,
} from "../../components/icons";



const PLANS = ["free", "starter", "pro", "enterprise"];
const PLAN_COLORS: Record<string, string> = {
  free:       "bg-slate-100 text-slate-600",
  starter:    "bg-blue-50 text-blue-700",
  pro:        "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
};

interface SchoolDetail {
  id: string; name: string; slug: string; active: boolean;
  createdAt: string; plan: string;
  settings: { city: string; state: string; board: string; phone: string; email: string; timezone: string };
  counts: Record<string, number>;
  users: { id: string; name: string; email: string; role: string; createdAt: string; active: boolean }[];
  features: Record<string, any>;
}

interface Flags {
  fees: boolean; exams: boolean; timetable: boolean;
  parent_portal: boolean; reports: boolean; announcements: boolean;
  custom_domain: boolean; api_access: boolean;
}

export default function PlatformSchoolDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [school, setSchool]   = useState<SchoolDetail | null>(null);
  const [flags, setFlags]     = useState<Flags | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"overview" | "users" | "flags" | "plan">("overview");
  const [saving, setSaving]   = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [toast, setToast]     = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const load = async () => {
    setLoading(true);
    const [detailRes, flagsRes] = await Promise.all([
      platformApi.get(`/schools/${id}`),
      platformApi.get(`/schools/${id}/flags`),
    ]);
    setSchool(detailRes.data);
    setFlags(flagsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const res = await platformApi.post(`/schools/${id}/impersonate`, {});
      const { token, schoolSlug } = res.data;

      // Write the impersonated school token into localStorage so the
      // school app's AuthContext picks it up on load — no login needed.
      localStorage.setItem("token", token);

      // Open /app/dashboard directly — bypass login page entirely.
      // Use replace: true inside the new tab so the back button won't
      // bring them back to /login (there's nothing to go back to).
      const target = schoolSlug
        ? `/app/dashboard`
        : `/app`;
      window.open(target, "_blank");
      showToast(`Impersonating ${school?.name} — new tab opened`);
    } catch {
      showToast("Failed to impersonate. No admin user found for this school.");
    } finally {
      setImpersonating(false);
    }
  };

  const handlePlanChange = async (plan: string) => {
    setSaving(true);
    try {
      await platformApi.put(`/schools/${id}/plan`, { plan });
      setSchool((s) => s ? { ...s, plan } : s);
      showToast(`Plan updated to ${plan}`);
    } finally { setSaving(false); }
  };

  const handleFlagToggle = async (key: keyof Flags) => {
    if (!flags) return;
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    await platformApi.put(`/schools/${id}/flags`, updated);
    showToast("Feature flags saved");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
      </svg>
    </div>
  );

  if (!school) return (
    <div className="flex items-center justify-center h-full flex-col gap-3">
      <CloseIcon className="w-10 h-10 text-red-400" />
      <p className="text-slate-500">School not found.</p>
      <button onClick={() => navigate("/admin/schools")} className="text-indigo-600 text-sm font-semibold hover:underline">← Back</button>
    </div>
  );

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "users",    label: "Users" },
    { key: "flags",    label: "Feature Flags" },
    { key: "plan",     label: "Plan & Billing" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate("/admin/schools")} className="mt-1 p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <SchoolIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{school.name}</h1>
              <p className="text-sm text-slate-500">{school.slug} · {school.settings.board || "No board"} · {school.settings.city || "No city"}</p>
            </div>
            <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[school.plan] ?? PLAN_COLORS.free}`}>
              {school.plan}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              school.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>{school.active ? "Active" : "Suspended"}</span>
          </div>
        </div>
        <button
          onClick={handleImpersonate}
          disabled={impersonating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <KeyIcon className="w-4 h-4" />
          {impersonating ? "Opening…" : "Impersonate"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Counts */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Students", value: school.counts.students ?? 0, icon: <StudentsIcon className="w-5 h-5 text-indigo-600" /> },
              { label: "Staff",    value: school.counts.staff    ?? 0, icon: <StaffIcon    className="w-5 h-5 text-violet-600" /> },
              { label: "Classes",  value: school.counts.classes  ?? 0, icon: <SchoolIcon   className="w-5 h-5 text-orange-600" /> },
              { label: "Exams",    value: school.counts.exams    ?? 0, icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">{c.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-xs text-slate-500">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">School Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(school.settings).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-medium text-slate-800">{v || "—"}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-800">{new Date(school.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">{school.users.length} Users</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Role</th>
                <th className="text-left px-6 py-3">Joined</th>
                <th className="text-left px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {school.users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No users found.</td></tr>
              ) : school.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-3 text-slate-500">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "ADMIN" ? "bg-indigo-50 text-indigo-700" :
                      u.role === "TEACHER" ? "bg-violet-50 text-violet-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>{u.active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Feature Flags */}
      {tab === "flags" && flags && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FlagIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">Feature Flags</h3>
            <span className="text-xs text-slate-400 ml-1">Toggle to enable/disable modules for this school</span>
          </div>
          <div className="space-y-4">
            {(Object.entries(flags) as [keyof Flags, boolean][]).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-medium text-slate-800 capitalize text-sm">{key.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400">
                    {key === "fees"          ? "Fee management and payment tracking" :
                     key === "exams"         ? "Exam scheduling and result entry" :
                     key === "timetable"     ? "Class timetable management" :
                     key === "parent_portal" ? "Parent mobile/web access" :
                     key === "reports"       ? "Report cards and analytics" :
                     key === "announcements" ? "School-wide announcements" :
                     key === "custom_domain" ? "Custom domain for school portal" :
                     key === "api_access"    ? "API access for third-party integrations" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleFlagToggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    val ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform ${
                    val ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Plan */}
      {tab === "plan" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <EditIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Change Plan</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {PLANS.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlanChange(p)}
                  disabled={saving || school.plan === p}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    school.plan === p
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                  } disabled:opacity-50`}
                >
                  <p className={`text-sm font-bold capitalize mb-1 ${school.plan === p ? "text-indigo-700" : "text-slate-700"}`}>{p}</p>
                  <p className="text-xs text-slate-400">
                    {p === "free"       ? "100 students · 2 modules"    :
                     p === "starter"    ? "500 students · 4 modules"    :
                     p === "pro"        ? "2000 students · All modules" :
                     "Unlimited · Everything"}
                  </p>
                  {school.plan === p && (
                    <span className="mt-2 inline-block text-xs text-indigo-600 font-semibold">Current</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
