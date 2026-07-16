/**
 * Academic Years — Phase 3, Step 2
 *
 * Manages the school's academic year calendar and drives student
 * enrollment + promotion:
 *
 *   Tab 1 — Years        Create / activate / delete academic years.
 *   Tab 2 — Enroll       Enroll students in the active year (bulk or one-by-one).
 *   Tab 3 — Promote      Promote (or transfer/exit) students from one year to the next.
 *   Tab 4 — History      View any student's full enrollment history across years.
 */

import { useEffect, useState, useCallback } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import {
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  FormError,
  FieldHint,
} from "../components/ui";
import { formatDate } from "../lib/format";
import { CheckCircleIcon, CheckIcon, SuccessIcon, WarningIcon, SkipIcon, ArrowRightIcon } from "../components/icons";

// ── Types ────────────────────────────────────────────────────
interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  _count: { enrollments: number; exams: number; fees: number };
}

interface SectionOpt {
  id: string;
  label: string;
}
interface StudentOpt {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  section: { name: string; class: { name: string } };
}

interface EnrollmentRow {
  id: string;
  status: string;
  student: { id: string; admissionNo: string; firstName: string; lastName: string };
  section: { name: string; class: { name: string; level: number } };
  academicYear: { id: string; name: string };
}

interface HistoryEntry {
  id: string;
  status: string;
  promotedAt: string | null;
  createdAt: string;
  section: { name: string; class: { name: string; level: number } };
  academicYear: { name: string; startDate: string; endDate: string };
}

// ── Status helpers ────────────────────────────────────────────
const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PROMOTED: "bg-blue-100 text-blue-700",
  TRANSFERRED: "bg-amber-100 text-amber-700",
  LEFT: "bg-slate-100 text-slate-500",
};

// ── Tabs ─────────────────────────────────────────────────────
type Tab = "years" | "enroll" | "promote" | "history";

export default function AcademicYears() {
  const [tab, setTab] = useState<Tab>("years");

  return (
    <div>
      <PageHeader title="Academic Years & Enrollment" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(
          [
            { id: "years", label: "📅 Years" },
            { id: "enroll", label: "✏️ Enroll Students" },
            { id: "promote", label: "⬆️ Promote / Transfer" },
            { id: "history", label: "📋 Enrollment History" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "years" && <YearsTab />}
      {tab === "enroll" && <EnrollTab />}
      {tab === "promote" && <PromoteTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

// ── Tab 1: Years ─────────────────────────────────────────────
function YearsTab() {
  const [years, setYears] = useState<AcademicYear[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", active: false });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState("");

  const load = useCallback(() => {
    api.get("/academic-years").then((r) => setYears(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setIssues([]); setSaving(true);
    try {
      await api.post("/academic-years", {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        active: form.active,
      });
      setOpen(false);
      setForm({ name: "", startDate: "", endDate: "", active: false });
      load();
    } catch (err) {
      const p = parseApiError(err, "Could not create the academic year.");
      setError(p.message); setIssues(p.issues);
    } finally { setSaving(false); }
  }

  async function activate(id: string) {
    setActivating(id);
    try {
      await api.post(`/academic-years/${id}/activate`);
      load();
    } finally { setActivating(""); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete academic year "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/academic-years/${id}`);
      load();
    } catch (err) {
      alert(parseApiError(err, "Could not delete this academic year.").message);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + New Academic Year
        </button>
      </div>

      {!years ? (
        <Spinner />
      ) : years.length === 0 ? (
        <EmptyState text="No academic years yet. Create one to start enrolling students." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Enrollments</th>
                <th className="px-4 py-3">Exams</th>
                <th className="px-4 py-3">Fee Records</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{y.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(y.startDate)} <ArrowRightIcon className="w-3 h-3 inline mx-1" /> {formatDate(y.endDate)}
                  </td>
                  <td className="px-4 py-3">{y._count.enrollments}</td>
                  <td className="px-4 py-3">{y._count.exams}</td>
                  <td className="px-4 py-3">{y._count.fees}</td>
                  <td className="px-4 py-3">
                    {y.active ? (
                      <span className="badge bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {!y.active && (
                      <button
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                        onClick={() => activate(y.id)}
                        disabled={activating === y.id}
                      >
                        {activating === y.id ? "Activating…" : "Set Active"}
                      </button>
                    )}
                    {!y.active && y._count.enrollments === 0 && (
                      <button
                        className="text-red-500 hover:text-red-700 text-xs"
                        onClick={() => remove(y.id, y.name)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Academic Year">
        <form onSubmit={create} className="space-y-3">
          <div>
            <label className="label">Year Name</label>
            <input
              className="input"
              placeholder="e.g. 2025-2026"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <FieldHint>Use the format YYYY-YYYY (e.g. 2025-2026).</FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                className="input"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded"
            />
            Set as active year (deactivates any current active year)
          </label>
          <FormError message={error} issues={issues} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Tab 2: Enroll ────────────────────────────────────────────
function EnrollTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[] | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [form, setForm] = useState({ studentId: "", sectionId: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/academic-years").then((r) => {
      setYears(r.data);
      const active = r.data.find((y: AcademicYear) => y.active);
      if (active) setSelectedYear(active.id);
    });
    api.get("/students").then((r) => setStudents(r.data));
    api.get("/classes/sections").then((r) => setSections(r.data));
  }, []);

  useEffect(() => {
    if (!selectedYear) { setEnrollments(null); return; }
    api.get(`/academic-years/${selectedYear}/enrollments`).then((r) => setEnrollments(r.data));
  }, [selectedYear]);

  const enrolledIds = new Set(enrollments?.map((e) => e.student.id) ?? []);
  const unenrolled = students.filter((s) => !enrolledIds.has(s.id));

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedYear) return;
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.post(`/academic-years/${selectedYear}/enroll`, form);
      setSuccess("Student enrolled successfully.");
      setForm({ studentId: "", sectionId: "" });
      api.get(`/academic-years/${selectedYear}/enrollments`).then((r) => setEnrollments(r.data));
    } catch (err) {
      setError(parseApiError(err, "Could not enroll this student.").message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="card p-4">
        <label className="label">Academic Year</label>
        <select
          className="input max-w-xs"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">Select academic year…</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} {y.active ? "(Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedYear && (
        <>
          {/* Enroll individual student */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Enroll a Student</h3>
            <form onSubmit={enroll} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="label">Student</label>
                <select
                  className="input"
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  required
                >
                  <option value="">Select student…</option>
                  {unenrolled.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.admissionNo} — {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
                {unenrolled.length === 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    <CheckCircleIcon className="w-3.5 h-3.5 inline mr-1" />All students are enrolled in this year.
                  </p>
                )}
              </div>
              <div className="flex-1 min-w-48">
                <label className="label">Assign to Section</label>
                <select
                  className="input"
                  value={form.sectionId}
                  onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                  required
                >
                  <option value="">Select section…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" disabled={saving || unenrolled.length === 0}>
                {saving ? "Enrolling…" : "Enroll"}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
          </div>

          {/* Current enrollment list */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                Enrolled Students ({enrollments?.length ?? 0})
              </h3>
            </div>
            {!enrollments ? (
              <div className="p-4"><Spinner /></div>
            ) : enrollments.length === 0 ? (
              <div className="p-4">
                <EmptyState text="No students enrolled yet for this year." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Adm. No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Class — Section</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{e.student.admissionNo}</td>
                      <td className="px-4 py-3">
                        {e.student.firstName} {e.student.lastName}
                      </td>
                      <td className="px-4 py-3">
                        {e.section.class.name} — {e.section.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusColor[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 3: Promote ────────────────────────────────────────────
type PromoteAction = "PROMOTED" | "TRANSFERRED" | "LEFT" | string;

interface PromotionRow {
  studentId: string;
  name: string;
  admissionNo: string;
  currentSection: string;
  toSectionId: string;
  action: PromoteAction;
  include: boolean;
}

function PromoteTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ promoted: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/academic-years").then((r) => {
      setYears(r.data);
      // Default: from active year
      const active = r.data.find((y: AcademicYear) => y.active);
      if (active) setFromYearId(active.id);
    });
    api.get("/classes/sections").then((r) => setSections(r.data));
  }, []);

  async function loadStudents() {
    if (!fromYearId) return;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await api.get(`/academic-years/${fromYearId}/enrollments?status=ACTIVE`);
      setEnrollments(res.data);
      setRows(
        res.data.map((e: EnrollmentRow) => ({
          studentId: e.student.id,
          name: `${e.student.firstName} ${e.student.lastName}`,
          admissionNo: e.student.admissionNo,
          currentSection: `${e.section.class.name} — ${e.section.name}`,
          toSectionId: "",
          action: "PROMOTED" as PromoteAction,
          include: true,
        }))
      );
    } finally { setLoading(false); }
  }

  async function promote() {
    const included = rows.filter((r) => r.include);
    if (included.length === 0) { setError("Please select at least one student."); return; }
    const missing = included.filter((r) => r.action !== "LEFT" && !r.toSectionId);
    if (missing.length > 0) {
      setError(`Please select a destination section for: ${missing.map((r) => r.name).join(", ")}.`);
      return;
    }
    if (!toYearId) { setError("Please select a destination academic year."); return; }
    if (fromYearId === toYearId) { setError("Source and destination years must be different."); return; }

    setSaving(true); setError(""); setResult(null);
    try {
      const res = await api.post("/academic-years/promote", {
        fromYearId,
        toYearId,
        promotions: included.map((r) => ({
          studentId: r.studentId,
          toSectionId: r.action === "LEFT" ? r.toSectionId || sections[0]?.id || "" : r.toSectionId,
          action: r.action,
        })),
      });
      setResult(res.data);
      setRows([]);
    } catch (err) {
      setError(parseApiError(err, "Promotion failed.").message);
    } finally { setSaving(false); }
  }

  function updateRow(idx: number, patch: Partial<PromotionRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      {/* Year selectors */}
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Promote FROM</label>
            <select
              className="input"
              value={fromYearId}
              onChange={(e) => { setFromYearId(e.target.value); setRows([]); }}
            >
              <option value="">Select source year…</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name} {y.active ? "(Active)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Promote TO</label>
            <select
              className="input"
              value={toYearId}
              onChange={(e) => setToYearId(e.target.value)}
            >
              <option value="">Select destination year…</option>
              {years.filter((y) => y.id !== fromYearId).map((y) => (
                <option key={y.id} value={y.id}>{y.name} {y.active ? "(Active)" : ""}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="btn-primary mt-4"
          onClick={loadStudents}
          disabled={!fromYearId || loading}
        >
          {loading ? "Loading…" : "Load Students"}
        </button>
      </div>

      {/* Promotion batch */}
      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">
              {rows.filter((r) => r.include).length} / {rows.length} students selected
            </h3>
            <div className="flex gap-2">
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => setRows((p) => p.map((r) => ({ ...r, include: true })))}
              >
                Select all
              </button>
              <button
                className="text-xs text-slate-500 hover:underline"
                onClick={() => setRows((p) => p.map((r) => ({ ...r, include: false })))}
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={rows.every((r) => r.include)}
                      onChange={(e) =>
                        setRows((p) => p.map((r) => ({ ...r, include: e.target.checked })))
                      }
                    />
                  </th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Current Section</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Destination Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={r.studentId} className={r.include ? "" : "opacity-40"}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => updateRow(idx, { include: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{r.name}</span>
                      <span className="block text-xs text-slate-400">{r.admissionNo}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.currentSection}</td>
                    <td className="px-3 py-2">
                      <select
                        className="input text-xs py-1"
                        value={r.action}
                        onChange={(e) => updateRow(idx, { action: e.target.value as PromoteAction })}
                        disabled={!r.include}
                      >
                        <option value="PROMOTED">Promoted</option>
                        <option value="TRANSFERRED">Transferred</option>
                        <option value="LEFT">Left school</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {(r.action as string) !== "LEFT" ? (
                        <select
                          className="input text-xs py-1"
                          value={r.toSectionId}
                          onChange={(e) => updateRow(idx, { toSectionId: e.target.value })}
                          disabled={!r.include}
                          required={r.include && (r.action as string) !== "LEFT"}
                        >
                          <option value="">Select…</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">— leaving school</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
            <button className="btn-primary" onClick={promote} disabled={saving}>
              {saving ? "Promoting…" : "Confirm Promotion"}
            </button>
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="card p-5 border-l-4 border-green-500">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><SuccessIcon className="w-5 h-5" /> Promotion Complete</h3>
          <ul className="text-sm text-slate-700 space-y-1">
            <li className="flex items-center gap-1.5"><CheckIcon className="w-3.5 h-3.5 text-green-600" /> Promoted / transferred: <strong>{result.promoted}</strong></li>
            <li className="flex items-center gap-1.5"><SkipIcon className="w-3.5 h-3.5 text-amber-500" /> Skipped (already enrolled): <strong>{result.skipped}</strong></li>
            {result.errors.length > 0 && (
              <li className="text-red-600 flex items-center gap-1.5">
                <WarningIcon className="w-3.5 h-3.5" /> Errors: {result.errors.join("; ")}
              </li>
            )}
          </ul>
        </div>
      )}

      {enrollments.length === 0 && rows.length === 0 && !loading && fromYearId && (
        <EmptyState text="No active enrollments found for this year. Enroll students first." />
      )}
    </div>
  );
}

// ── Tab 4: History ────────────────────────────────────────────
function HistoryTab() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/students").then((r) => setStudents(r.data));
  }, []);

  async function load(id: string) {
    if (!id) { setHistory(null); return; }
    setLoading(true);
    try {
      const res = await api.get(`/academic-years/students/${id}/history`);
      setHistory(res.data);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <label className="label">Select Student</label>
        <select
          className="input max-w-sm"
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); load(e.target.value); }}
        >
          <option value="">Choose a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.admissionNo} — {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}

      {!loading && history !== null && (
        history.length === 0 ? (
          <EmptyState text="This student has no enrollment records yet." />
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                Enrollment History — {history.length} record{history.length !== 1 ? "s" : ""}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Class — Section</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Enrolled On</th>
                  <th className="px-4 py-3">Promoted On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{h.academicYear.name}</td>
                    <td className="px-4 py-3">{h.section.class.name} — {h.section.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColor[h.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(h.createdAt)}</td>
                    <td className="px-4 py-3">
                      {h.promotedAt ? formatDate(h.promotedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
