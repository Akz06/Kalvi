import { useEffect, useState } from "react";
import axios from "axios";
import { platformApiBase } from "../../api/client";
import { AnnouncementIcon, TrashIcon, CloseIcon } from "../../components/icons";

const PLATFORM_API = platformApiBase();
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem("platform_token")}` });

interface Announcement {
  id: string; title: string; message: string;
  type: "info" | "warning" | "success" | "critical";
  target: string; createdAt: string; expiresAt?: string;
}

const TYPE_STYLES: Record<string, string> = {
  info:     "bg-blue-50 text-blue-700 border-blue-200",
  warning:  "bg-amber-50 text-amber-700 border-amber-200",
  success:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function PlatformAnnouncements() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: "", message: "", type: "info", target: "all", expiresAt: "" });
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    axios.get(`${PLATFORM_API}/announcements`, { headers: hdrs() })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await axios.post(`${PLATFORM_API}/announcements`, form, { headers: hdrs() });
      setShowForm(false);
      setForm({ title: "", message: "", type: "info", target: "all", expiresAt: "" });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`${PLATFORM_API}/announcements/${id}`, { headers: hdrs() });
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Broadcast messages to all schools or specific schools.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <AnnouncementIcon className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">New Announcement</h3>
              <button onClick={() => setShowForm(false)}><CloseIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Scheduled Maintenance"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  placeholder="Announcement details…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Target</label>
                  <select
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Schools</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Expires At (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.title || !form.message}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold"
              >{saving ? "Sending…" : "Send Announcement"}</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AnnouncementIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No announcements yet.</p>
          <p className="text-slate-400 text-sm mt-1">Create one to broadcast to all schools.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-5 flex items-start gap-4 ${TYPE_STYLES[a.type] ?? TYPE_STYLES.info}`}>
              <AnnouncementIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <span className="text-xs uppercase font-medium opacity-60 border rounded-full px-2 py-0.5 border-current">
                    {a.type}
                  </span>
                  <span className="text-xs opacity-60">
                    → {a.target === "all" ? "All schools" : a.target}
                  </span>
                </div>
                <p className="text-sm opacity-80">{a.message}</p>
                <p className="text-xs opacity-50 mt-1">
                  {new Date(a.createdAt).toLocaleString("en-IN")}
                  {a.expiresAt && ` · Expires ${new Date(a.expiresAt).toLocaleDateString("en-IN")}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
