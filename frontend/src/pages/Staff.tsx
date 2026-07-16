import { useEffect, useState, useRef } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  EmptyState, Modal, PageHeader, SectionLoader, FormError, FieldHint,
} from "../components/ui";
import {
  SearchIcon, EditIcon, TrashIcon, ChevronDownIcon, CloseIcon, CheckIcon,
} from "../components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: string; name: string; code: string }
interface Staff {
  id: string; employeeNo: string; firstName: string; lastName: string;
  email: string; phone: string; designation: string; subject?: string;
  gender: string; active: boolean;
}

const DEFAULT_DESIGNATIONS = [
  "Principal", "Vice Principal", "Teacher", "Senior Teacher",
  "HOD", "Coordinator", "Counsellor", "Librarian",
  "PE Teacher", "Lab Assistant", "Accountant", "Admin Staff",
];

const emptyForm = {
  employeeNo: "", firstName: "", lastName: "",
  gender: "MALE", email: "", phone: "",
  designation: "Teacher", subject: "",
  joiningDate: new Date().toISOString().split("T")[0],
};

// ─── Subject Lookup Dropdown ──────────────────────────────────────────────────

function SubjectLookup({ value, subjects, onChange }: {
  value: string; subjects: Subject[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.code.toLowerCase().includes(q.toLowerCase())
  );

  const selected = subjects.find((s) => s.id === value || s.name === value);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="input w-full flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? `${selected.name} (${selected.code})` : "Select subject…"}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search subject…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left text-slate-400 hover:bg-slate-50 flex items-center gap-2"
              onClick={() => { onChange(""); setOpen(false); setQ(""); }}
            >
              <CloseIcon className="w-3.5 h-3.5" /> Clear selection
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-400">No subjects found</p>
            ) : filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s.id); setOpen(false); setQ(""); }}
                className={`w-full px-3 py-2.5 text-sm text-left hover:bg-indigo-50 flex items-center justify-between gap-2 ${
                  (value === s.id || value === s.name) ? "bg-indigo-50" : ""
                }`}
              >
                <span>
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="ml-1.5 text-xs text-slate-400">{s.code}</span>
                </span>
                {(value === s.id || value === s.name) && (
                  <CheckIcon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Staff Page ──────────────────────────────────────────────────────────

export default function Staff() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [designations, setDesignations] = useState<string[]>(DEFAULT_DESIGNATIONS);
  const [open, setOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  function load() {
    api.get("/staff", { params: { q: q || undefined } })
      .then((r) => setStaff(r.data));
  }

  useEffect(() => {
    Promise.all([
      api.get("/timetable/subjects").then((r) => setSubjects(r.data)),
      api.get("/timetable/designations").then((r) => {
        const names = r.data.map((d: { name: string }) => d.name);
        if (names.length > 0) setDesignations(names);
      }).catch(() => {}),
    ]);
  }, []);

  useEffect(() => { load(); }, [q]);

  function openAdd() {
    setForm(emptyForm);
    setEditStaff(null);
    setError(""); setIssues([]);
    setOpen(true);
  }

  function openEdit(s: Staff) {
    setForm({
      employeeNo: s.employeeNo, firstName: s.firstName, lastName: s.lastName,
      gender: s.gender, email: s.email, phone: s.phone,
      designation: s.designation, subject: s.subject ?? "",
      joiningDate: new Date().toISOString().split("T")[0],
    });
    setEditStaff(s);
    setError(""); setIssues([]);
    setOpen(true);
  }

  // Resolve subject name or id → name for storing
  function resolveSubjectName(val: string): string {
    const sub = subjects.find((s) => s.id === val || s.name === val);
    return sub ? sub.name : val;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setIssues([]);
    setSaving(true);
    try {
      const payload = { ...form, subject: resolveSubjectName(form.subject) };
      if (editStaff) {
        await api.put(`/staff/${editStaff.id}`, payload);
      } else {
        await api.post("/staff", payload);
      }
      setOpen(false);
      setForm(emptyForm);
      setEditStaff(null);
      load();
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't save this staff member.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this staff member? This cannot be undone.")) return;
    await api.delete(`/staff/${id}`);
    load();
  }

  const subjectDisplay = (val?: string) => {
    if (!val) return "—";
    const sub = subjects.find((s) => s.name === val || s.id === val);
    return sub ? `${sub.name} (${sub.code})` : val;
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        action={
          isAdmin ? (
            <button className="btn-primary" onClick={openAdd}>
              + Add Staff
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search name, employee no…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!staff ? (
        <SectionLoader />
      ) : staff.length === 0 ? (
        <EmptyState text="No staff found." />
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
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-700">{s.employeeNo}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{s.firstName} {s.lastName}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                    }`}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {s.designation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{subjectDisplay(s.subject)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.email}
                    <span className="block text-xs text-slate-400">{s.phone}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)}
        title={editStaff ? "Edit Staff Member" : "Add Staff Member"}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Employee No */}
            <div>
              <label className="label">Employee No</label>
              <input className="input" value={form.employeeNo}
                onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
                placeholder="EMP001" required />
            </div>
            {/* Designation DROPDOWN */}
            <div>
              <label className="label">Designation</label>
              <select className="input" value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })} required>
                {designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* First Name */}
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            {/* Last Name */}
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            {/* Gender */}
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {/* Joining Date */}
            <div>
              <label className="label">Joining Date</label>
              <input type="date" className="input" value={form.joiningDate}
                onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
            </div>
            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            {/* Phone */}
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <FieldHint>6–15 digits</FieldHint>
            </div>
          </div>

          {/* Subject LOOKUP (full width) */}
          <div>
            <label className="label">Primary Subject</label>
            <SubjectLookup
              value={form.subject}
              subjects={subjects}
              onChange={(v) => setForm({ ...form, subject: v })}
            />
            <FieldHint>The main subject this staff member teaches</FieldHint>
          </div>

          <FormError message={error} issues={issues} />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : editStaff ? "Save Changes" : "Add Staff"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
