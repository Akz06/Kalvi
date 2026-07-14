import { useEffect, useState } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import {
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  FormError,
  FieldHint,
} from "../components/ui";

interface Staff {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  subject?: string;
}

const emptyForm = {
  employeeNo: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  email: "",
  phone: "",
  designation: "Teacher",
  subject: "",
};

export default function Staff() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get("/staff").then((r) => setStaff(r.data));
  }
  useEffect(load, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);
    setSaving(true);
    try {
      await api.post("/staff", form);
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't save this staff member.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this staff member?")) return;
    await api.delete(`/staff/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            + Add Staff
          </button>
        }
      />
      {!staff ? (
        <Spinner />
      ) : staff.length === 0 ? (
        <EmptyState text="No staff yet." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Emp. No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.employeeNo}</td>
                  <td className="px-4 py-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3">{s.designation}</td>
                  <td className="px-4 py-3">{s.subject ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.email}
                    <span className="block text-xs text-slate-400">
                      {s.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Staff">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employee No</label>
              <input
                className="input"
                value={form.employeeNo}
                onChange={(e) =>
                  setForm({ ...form, employeeNo: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Designation</label>
              <input
                className="input"
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">First Name</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <FieldHint>6–15 digits.</FieldHint>
            </div>
          </div>
          <FormError message={error} issues={issues} />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
