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
import { ArrowRightIcon, ChevronRightIcon } from "../components/icons";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SectionOpt {
  id: string;
  label: string;
}

interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  guardianName: string;
  guardianPhone: string;
  active: boolean;
  section: { name: string; class: { name: string } };
}

interface AcademicYear {
  id: string;
  name: string;
  active: boolean;
}

interface PreviousEnrollment {
  id: string;
  status: string;
  student: Student;
  section: { name: string; class: { name: string; level: number } };
  academicYear: { id: string; name: string; active: boolean };
}

const emptyForm = {
  admissionNo: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  dob: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  sectionId: "",
};

// ── Status badge colours ──────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PROMOTED: "bg-blue-100 text-blue-700",
  TRANSFERRED: "bg-amber-100 text-amber-700",
  LEFT: "bg-slate-100 text-slate-500",
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "current" | "previous";

export default function Students() {
  const [tab, setTab] = useState<Tab>("current");

  return (
    <div>
      <PageHeader title="Students" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {(
          [
            { id: "current", label: "🎓 Current Students" },
            { id: "previous", label: "📂 Last Year Students" },
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

      {tab === "current" && <CurrentStudentsTab />}
      {tab === "previous" && <PreviousYearStudentsTab />}
    </div>
  );
}

// ── Tab 1 — Current Students ──────────────────────────────────────────────────
function CurrentStudentsTab() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get("/students", { params: { q: q || undefined } })
      .then((r) => setStudents(r.data));
  }, [q]);

  useEffect(() => {
    api.get("/classes/sections").then((r) => setSections(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);
    setSaving(true);
    try {
      await api.post("/students", form);
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't save this student.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    await api.delete(`/students/${id}`);
    load();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name or admission no…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn-primary ml-auto"
          onClick={() => {
            setForm(emptyForm);
            setError("");
            setIssues([]);
            setOpen(true);
          }}
        >
          + Add Student
        </button>
      </div>

      {!students ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState
          text={
            q
              ? `No students match "${q}".`
              : "No current students. Click '+ Add Student' to enroll one."
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Adm. No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class — Section</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.admissionNo}</td>
                  <td className="px-4 py-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3">
                    {s.section.class.name} — {s.section.name}
                  </td>
                  <td className="px-4 py-3">
                    {s.guardianName}
                    <span className="block text-xs text-slate-400">
                      {s.guardianPhone}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(s.dob)}</td>
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

      {/* Add Student modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Student">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Admission No</label>
              <input
                className="input"
                value={form.admissionNo}
                onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Class — Section</label>
              <select
                className="input"
                value={form.sectionId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">First Name</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
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
              <label className="label">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Guardian Name</label>
              <input
                className="input"
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Guardian Phone</label>
              <input
                className="input"
                value={form.guardianPhone}
                onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                required
              />
              <FieldHint>6–15 digits.</FieldHint>
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <FormError message={error} issues={issues} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
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

// ── Tab 2 — Last Year Students ────────────────────────────────────────────────
function PreviousYearStudentsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [q, setQ] = useState("");
  const [enrollments, setEnrollments] = useState<PreviousEnrollment[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-enroll modal state
  const [reEnrollTarget, setReEnrollTarget] = useState<PreviousEnrollment | null>(null);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [activeYears, setActiveYears] = useState<AcademicYear[]>([]);
  const [reEnrollForm, setReEnrollForm] = useState({ sectionId: "", academicYearId: "" });
  const [reEnrollError, setReEnrollError] = useState("");
  const [reEnrollSaving, setReEnrollSaving] = useState(false);
  const [reEnrollSuccess, setReEnrollSuccess] = useState("");

  // Load years + sections on mount
  useEffect(() => {
    api.get("/academic-years").then((r) => {
      const all: AcademicYear[] = r.data;
      const prev = all.filter((y) => !y.active);
      setYears(prev);
      // Auto-select the most recent non-active year
      if (prev.length > 0) setSelectedYear(prev[0].id);
      setActiveYears(all.filter((y) => y.active));
    });
    api.get("/classes/sections").then((r) => setSections(r.data));
  }, []);

  const load = useCallback(() => {
    if (!selectedYear) {
      setEnrollments([]);
      return;
    }
    setLoading(true);
    api
      .get("/students/previous-year", {
        params: { academicYearId: selectedYear, q: q || undefined },
      })
      .then((r) => setEnrollments(r.data))
      .finally(() => setLoading(false));
  }, [selectedYear, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openReEnroll(row: PreviousEnrollment) {
    setReEnrollTarget(row);
    setReEnrollError("");
    setReEnrollSuccess("");
    setReEnrollForm({
      sectionId: "",
      academicYearId: activeYears[0]?.id ?? "",
    });
  }

  async function submitReEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!reEnrollTarget) return;
    setReEnrollError("");
    setReEnrollSuccess("");
    setReEnrollSaving(true);
    try {
      await api.post(`/academic-years/${reEnrollForm.academicYearId}/enroll`, {
        studentId: reEnrollTarget.student.id,
        sectionId: reEnrollForm.sectionId,
      });
      setReEnrollSuccess(
        `${reEnrollTarget.student.firstName} ${reEnrollTarget.student.lastName} has been re-enrolled successfully.`
      );
      // Refresh list after a moment
      setTimeout(() => {
        setReEnrollTarget(null);
        load();
      }, 1500);
    } catch (err) {
      setReEnrollError(
        parseApiError(err, "Could not re-enroll this student.").message
      );
    } finally {
      setReEnrollSaving(false);
    }
  }

  const noYears = years.length === 0;

  return (
    <div>
      {/* Info banner */}
      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <span className="text-lg leading-none">ℹ️</span>
        <span>
          This view shows students enrolled in <strong>previous (inactive) academic years</strong>.
          You can re-enroll any student into the current active year directly from here.
        </span>
      </div>

      {noYears ? (
        <div className="card p-6 text-center text-slate-500 text-sm">
          <p className="text-2xl mb-2">📂</p>
          <p className="font-medium text-slate-700 mb-1">No previous academic years found.</p>
          <p>
            Create and activate a new academic year in{" "}
            <span className="font-medium text-brand-600">Academic Years</span> to start
            tracking year-over-year students.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="label">Academic Year</label>
              <select
                className="input"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">All previous years</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="label">Search</label>
              <input
                className="input"
                placeholder="Search by name or admission no…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <Spinner />
          ) : enrollments === null || enrollments.length === 0 ? (
            <EmptyState
              text={
                q
                  ? `No previous-year students match "${q}".`
                  : "No students found for the selected year."
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {enrollments.length} student{enrollments.length !== 1 ? "s" : ""} found
                </span>
                <span className="text-xs text-slate-400">
                  Showing last known enrollment per student
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Adm. No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Last Class — Section</th>
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Guardian</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{e.student.admissionNo}</td>
                      <td className="px-4 py-3">
                        {e.student.firstName} {e.student.lastName}
                      </td>
                      <td className="px-4 py-3">
                        {e.section.class.name} — {e.section.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.academicYear.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            statusColor[e.status] ?? "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {e.student.guardianName}
                        <span className="block text-xs text-slate-400">
                          {e.student.guardianPhone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {activeYears.length > 0 && e.status !== "LEFT" && (
                          <button
                            className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                            onClick={() => openReEnroll(e)}
                          >
                            Re-enroll <ChevronRightIcon className="w-3 h-3 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Re-enroll modal */}
      <Modal
        open={!!reEnrollTarget}
        onClose={() => setReEnrollTarget(null)}
        title="Re-enroll Student"
      >
        {reEnrollTarget && (
          <form onSubmit={submitReEnroll} className="space-y-4">
            {/* Student summary */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-800">
                {reEnrollTarget.student.firstName} {reEnrollTarget.student.lastName}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {reEnrollTarget.student.admissionNo} · Last year:{" "}
                {reEnrollTarget.section.class.name} — {reEnrollTarget.section.name} (
                {reEnrollTarget.academicYear.name})
              </p>
            </div>

            {activeYears.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                ⚠️ There is no active academic year. Please activate a year in{" "}
                <span className="font-medium">Academic Years</span> before re-enrolling.
              </p>
            ) : (
              <>
                <div>
                  <label className="label">Academic Year to Enroll Into</label>
                  <select
                    className="input"
                    value={reEnrollForm.academicYearId}
                    onChange={(e) =>
                      setReEnrollForm({ ...reEnrollForm, academicYearId: e.target.value })
                    }
                    required
                  >
                    {activeYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} (Active)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">New Class — Section</label>
                  <select
                    className="input"
                    value={reEnrollForm.sectionId}
                    onChange={(e) =>
                      setReEnrollForm({ ...reEnrollForm, sectionId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select section…</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {reEnrollError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                    {reEnrollError}
                  </p>
                )}
                {reEnrollSuccess && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                    ✅ {reEnrollSuccess}
                  </p>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setReEnrollTarget(null)}
              >
                Cancel
              </button>
              {activeYears.length > 0 && (
                <button
                  className="btn-primary"
                  disabled={reEnrollSaving || !!reEnrollSuccess}
                >
                  {reEnrollSaving ? "Enrolling…" : "Re-enroll"}
                </button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
