import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { PageHeader, Modal, FormError, FieldHint, Spinner, EmptyState } from "../components/ui";

interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  active: boolean;
  student: Student & { section: { name: string; class: { name: string } } };
}

const BLANK = {
  studentId: "",
  name: "",
  relationship: "Father",
  phone: "",
  email: "",
  password: "",
  isPrimary: true,
};

export default function Guardians() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [createErr, setCreateErr] = useState<{ message: string; issues: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset password modal
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/guardians"),
      api.get("/students"),
    ]).then(([g, s]) => {
      setGuardians(g.data);
      setStudents(s.data);
    }).finally(() => setLoading(false));
  }, []);

  // Reload guardians
  async function reload() {
    const g = await api.get("/guardians");
    setGuardians(g.data);
  }

  const filtered = guardians.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase()) ||
      g.student.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      `${g.student.firstName} ${g.student.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setSaving(true);
    try {
      await api.post("/guardians", form);
      setCreateOpen(false);
      setForm(BLANK);
      await reload();
    } catch (err) {
      setCreateErr(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(g: Guardian) {
    try {
      await api.put(`/guardians/${g.id}`, { active: !g.active });
      await reload();
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this guardian? They will lose access to the parent portal.")) return;
    await api.delete(`/guardians/${id}`);
    await reload();
  }

  async function handleResetPwd(e: React.FormEvent) {
    e.preventDefault();
    setResetErr("");
    setResetting(true);
    try {
      await api.post(`/guardians/${resetId}/reset-password`, { password: newPwd });
      setResetId(null);
      setNewPwd("");
      alert("Password reset successfully.");
    } catch (err: any) {
      setResetErr(err?.response?.data?.error ?? "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Guardians (Parent Portal)"
        action={
          <button className="btn-primary" onClick={() => { setCreateOpen(true); setCreateErr(null); setForm(BLANK); }}>
            + Add Guardian
          </button>
        }
      />

      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        👨‍👩‍👧 Guardians can log in at <strong>/parent/login</strong> using their email and password to view their child's attendance, fees, and exam results.
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by guardian name, email, or student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full max-w-sm"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState text={search ? "No guardians match your search." : "No guardians added yet. Click '+ Add Guardian' to create the first one."} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Guardian</th>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-center font-medium">Primary</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-xs text-slate-400">{g.relationship}</p>
                    <p className="text-xs text-slate-400">{g.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{g.student.firstName} {g.student.lastName}</p>
                    <p className="text-xs text-slate-400">{g.student.admissionNo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {g.student.section.class.name} — {g.student.section.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{g.phone}</td>
                  <td className="px-4 py-3 text-center">
                    {g.isPrimary ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Primary</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {g.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => { setResetId(g.id); setNewPwd(""); setResetErr(""); }}
                        className="text-xs text-blue-600 hover:underline"
                        title="Reset password"
                      >
                        Reset Pwd
                      </button>
                      <button
                        onClick={() => toggleActive(g)}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        {g.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Guardian Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Guardian">
        <form onSubmit={handleCreate} className="space-y-3" noValidate>
          {createErr && <FormError message={createErr.message} issues={createErr.issues} />}

          <div>
            <label className="label">Student *</label>
            <select
              className="input w-full"
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              required
            >
              <option value="">— Select a student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
            </select>
            <FieldHint>A student can have at most 2 guardians.</FieldHint>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Guardian Name *</label>
              <input
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="label">Relationship *</label>
              <select
                className="input w-full"
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              >
                <option>Father</option>
                <option>Mother</option>
                <option>Guardian</option>
                <option>Grandfather</option>
                <option>Grandmother</option>
                <option>Uncle</option>
                <option>Aunt</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              className="input w-full"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="guardian@email.com"
              required
            />
            <FieldHint>This email will be used to log in to the Parent Portal.</FieldHint>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone *</label>
              <input
                type="tel"
                className="input w-full"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="9XXXXXXXXX"
                required
              />
            </div>
            <div>
              <label className="label">Initial Password *</label>
              <input
                type="password"
                className="input w-full"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters"
                required
              />
              <FieldHint>Share this password with the guardian to let them log in.</FieldHint>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={form.isPrimary}
              onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-brand-600"
            />
            <label htmlFor="isPrimary" className="text-sm text-slate-700">
              Set as primary guardian <span className="text-slate-400">(receives notifications)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Adding…" : "Add Guardian"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetId} onClose={() => setResetId(null)} title="Reset Guardian Password">
        <form onSubmit={handleResetPwd} className="space-y-3" noValidate>
          {resetErr && <FormError message={resetErr} />}
          <p className="text-sm text-slate-600">
            Enter a new password for this guardian. Share it with them securely.
          </p>
          <div>
            <label className="label">New Password *</label>
            <input
              type="password"
              className="input w-full"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setResetId(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={resetting || newPwd.length < 6} className="btn-primary flex-1">
              {resetting ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
