import { useEffect, useState, useCallback } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SectionLoader, Modal, FormError } from "../components/ui";
import {
  ClockIcon, CalendarIcon, ChevronDownIcon, CheckIcon,
  CloseIcon, EditIcon, PlusIcon, RefreshIcon, WarningIcon,
} from "../components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string; name: string;
  class: { id: string; name: string; level: number };
}
interface Subject { id: string; name: string; code: string }
interface Staff { id: string; firstName: string; lastName: string; designation: string }
interface Period {
  id: string; dayOfWeek: number; periodNo: number;
  startTime: string; endTime: string; isBreak: boolean; label?: string;
  subject?: Subject | null; staff?: Staff | null;
}
interface Timetable {
  id: string; name: string; sectionId: string;
  section: { name: string; class: { name: string } };
  periods: Period[];
}
interface Exchange {
  id: string; status: string; reason?: string; exchangeDate: string;
  period: { startTime: string; endTime: string; dayOfWeek: number; subject?: Subject | null; timetable: { section: { name: string; class: { name: string } } } };
  originalStaff: { firstName: string; lastName: string };
  substitute: { firstName: string; lastName: string };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodBg(p: Period) {
  if (p.isBreak) return "bg-amber-50 border-amber-200";
  if (!p.subject) return "bg-slate-50 border-slate-200";
  const colors = [
    "bg-indigo-50 border-indigo-200",
    "bg-violet-50 border-violet-200",
    "bg-teal-50 border-teal-200",
    "bg-emerald-50 border-emerald-200",
    "bg-sky-50 border-sky-200",
    "bg-pink-50 border-pink-200",
    "bg-orange-50 border-orange-200",
  ];
  let hash = 0;
  for (const c of p.subject.code) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

// ─── Generate Modal ───────────────────────────────────────────────────────────

function GenerateModal({ sections, onGenerated, onClose }: {
  sections: Section[]; onGenerated: () => void; onClose: () => void;
}) {
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [startTime, setStartTime] = useState("09:00");
  const [periodDuration, setPeriodDuration] = useState(45);
  const [breakAfterPeriod, setBreakAfterPeriod] = useState(4);
  const [breakDuration, setBreakDuration] = useState(30);
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleDay(d: number) {
    setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  async function generate() {
    setSaving(true); setError("");
    try {
      await api.post("/timetable/generate", {
        sectionId, periodsPerDay, startTime, periodDuration,
        breakAfterPeriod, breakDuration, workingDays,
      });
      onGenerated(); onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not generate timetable.").message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Section</label>
        <select className="input" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.class.name} — {s.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Time</label>
          <input type="time" className="input" value={startTime}
            onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="label">Periods Per Day</label>
          <input type="number" className="input" min={4} max={12} value={periodsPerDay}
            onChange={(e) => setPeriodsPerDay(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Period Duration (min)</label>
          <input type="number" className="input" min={30} max={90} value={periodDuration}
            onChange={(e) => setPeriodDuration(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Break After Period</label>
          <input type="number" className="input" min={1} max={periodsPerDay - 1}
            value={breakAfterPeriod} onChange={(e) => setBreakAfterPeriod(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Break Duration (min)</label>
          <input type="number" className="input" min={5} max={60} value={breakDuration}
            onChange={(e) => setBreakDuration(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label">Working Days</label>
        <div className="flex gap-2 mt-1">
          {DAYS.map((d, i) => (
            <button key={d} type="button"
              onClick={() => toggleDay(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm font-semibold border transition ${
                workingDays.includes(i + 1)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
              }`}
            >{d}</button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={generate} disabled={saving}>
          {saving ? "Generating…" : "Generate Timetable"}
        </button>
      </div>
    </div>
  );
}

// ─── Period Edit Modal ────────────────────────────────────────────────────────

function EditPeriodModal({ period, subjects, staffList, onSave, onClose }: {
  period: Period; subjects: Subject[]; staffList: Staff[];
  onSave: (p: Period) => void; onClose: () => void;
}) {
  const [subjectId, setSubjectId] = useState(period.subject?.id ?? "");
  const [staffId, setStaffId] = useState(period.staff?.id ?? "");
  const [startTime, setStartTime] = useState(period.startTime);
  const [endTime, setEndTime] = useState(period.endTime);
  const [label, setLabel] = useState(period.label ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await api.put(`/timetable/period/${period.id}`, {
        subjectId: subjectId || null,
        staffId: staffId || null,
        startTime, endTime,
        label: label || null,
      });
      onSave(res.data); onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not update period.").message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600">
        {DAY_FULL[period.dayOfWeek - 1]} · Period {period.periodNo}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Time</label>
          <input type="time" className="input" value={startTime}
            onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="label">End Time</label>
          <input type="time" className="input" value={endTime}
            onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      {!period.isBreak && (
        <>
          <div>
            <label className="label">Subject</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— Free Period —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Teacher</label>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">— Unassigned —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {period.isBreak && (
        <div>
          <label className="label">Break Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Lunch Break, Assembly" />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Timetable Grid ───────────────────────────────────────────────────────────

function TimetableGrid({ timetable, subjects, staffList, onRefresh, isAdmin }: {
  timetable: Timetable; subjects: Subject[]; staffList: Staff[];
  onRefresh: () => void; isAdmin: boolean;
}) {
  const [editPeriod, setEditPeriod] = useState<Period | null>(null);

  // Group periods by day
  const days = [...new Set(timetable.periods.map((p) => p.dayOfWeek))].sort();
  const byDay = (dow: number) => timetable.periods.filter((p) => p.dayOfWeek === dow)
    .sort((a, b) => a.periodNo - b.periodNo);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid gap-px" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
          <div className="bg-slate-100 rounded-tl-xl" />
          {days.map((d) => (
            <div key={d} className="bg-indigo-600 text-white text-center py-2.5 text-sm font-bold
              first:rounded-tl-xl last:rounded-tr-xl">
              {DAY_FULL[d - 1]}
            </div>
          ))}
        </div>

        {/* Find max periods */}
        {(() => {
          const maxPeriods = Math.max(...days.map((d) => byDay(d).length), 0);
          return Array.from({ length: maxPeriods }, (_, i) => (
            <div key={i} className="grid gap-px mt-px"
              style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
              {/* Period label */}
              <div className="bg-slate-100 flex flex-col items-center justify-center py-3 text-xs font-semibold text-slate-500">
                <span>P{i + 1}</span>
              </div>
              {days.map((d) => {
                const p = byDay(d)[i];
                if (!p) return <div key={d} className="bg-slate-50 h-20" />;
                return (
                  <div key={d}
                    className={`relative border rounded-sm p-2 h-20 flex flex-col justify-between group transition ${periodBg(p)}`}
                  >
                    {p.isBreak ? (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs font-semibold text-amber-700">
                          {p.label ?? "Break"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {p.subject?.name ?? <span className="text-slate-400">Free</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {p.staff ? `${p.staff.firstName} ${p.staff.lastName}` : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <ClockIcon className="w-2.5 h-2.5" />
                          {p.startTime}–{p.endTime}
                        </div>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setEditPeriod(p)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition
                          w-5 h-5 rounded bg-white/80 flex items-center justify-center shadow-sm
                          hover:bg-indigo-100"
                      >
                        <EditIcon className="w-3 h-3 text-indigo-600" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Edit modal */}
      {editPeriod && (
        <Modal open onClose={() => setEditPeriod(null)}
          title={`Edit Period — ${DAY_FULL[editPeriod.dayOfWeek - 1]}`}>
          <EditPeriodModal
            period={editPeriod} subjects={subjects} staffList={staffList}
            onSave={() => { setEditPeriod(null); onRefresh(); }}
            onClose={() => setEditPeriod(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Exchange Panel ───────────────────────────────────────────────────────────

function ExchangePanel({ schoolId, staffList, timetablePeriods, onClose }: {
  schoolId: string; staffList: Staff[]; timetablePeriods: Period[]; onClose: () => void;
}) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periodId: "", exchangeDate: "", substituteId: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  function loadExchanges() {
    setLoading(true);
    api.get("/timetable/exchanges").then((r) => setExchanges(r.data)).finally(() => setLoading(false));
  }
  useEffect(loadExchanges, []);

  async function submitExchange() {
    setSaving(true); setError("");
    try {
      // find original staff for the selected period
      const period = timetablePeriods.find((p) => p.id === form.periodId);
      await api.post("/timetable/exchanges", {
        periodId: form.periodId,
        exchangeDate: form.exchangeDate,
        originalStaffId: period?.staff?.id ?? "",
        substituteId: form.substituteId,
        reason: form.reason,
      });
      setShowForm(false);
      loadExchanges();
    } catch (err) {
      setError(parseApiError(err, "Could not submit request.").message);
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    await api.put(`/timetable/exchanges/${id}/status`, { status });
    loadExchanges();
  }

  const statusColor = (s: string) =>
    s === "APPROVED" ? "bg-emerald-50 text-emerald-700"
    : s === "REJECTED" ? "bg-red-50 text-red-600"
    : "bg-amber-50 text-amber-700";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">Period Exchange Requests</h3>
        <button className="btn-primary text-xs" onClick={() => setShowForm(true)}>
          + New Request
        </button>
      </div>

      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-indigo-800">Request Period Exchange</h4>
          <div>
            <label className="label">Period</label>
            <select className="input" value={form.periodId}
              onChange={(e) => setForm({ ...form, periodId: e.target.value })}>
              <option value="">Select period…</option>
              {timetablePeriods.filter((p) => !p.isBreak && p.staff).map((p) => (
                <option key={p.id} value={p.id}>
                  {DAY_FULL[p.dayOfWeek - 1]} P{p.periodNo} · {p.startTime} · {p.subject?.name ?? "Free"} · {p.staff?.firstName} {p.staff?.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date of Exchange</label>
              <input type="date" className="input" value={form.exchangeDate}
                onChange={(e) => setForm({ ...form, exchangeDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Substitute Teacher</label>
              <select className="input" value={form.substituteId}
                onChange={(e) => setForm({ ...form, substituteId: e.target.value })}>
                <option value="">Select teacher…</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input className="input" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Leave, Training…" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={submitExchange} disabled={saving}>
              {saving ? "Submitting…" : "Submit Request"}
            </button>
            <button className="btn-ghost text-xs" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <SectionLoader /> : exchanges.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No exchange requests yet.</p>
      ) : (
        <div className="space-y-2">
          {exchanges.map((ex) => (
            <div key={ex.id} className="bg-white border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {DAY_FULL[(ex.period.dayOfWeek ?? 1) - 1]} · {ex.period.startTime}–{ex.period.endTime}
                    {ex.period.subject && <span className="ml-1 text-slate-500">· {ex.period.subject.name}</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ex.period.timetable?.section?.class?.name} {ex.period.timetable?.section?.name}
                    <span className="mx-1">·</span>
                    {new Date(ex.exchangeDate).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-medium">{ex.originalStaff.firstName} {ex.originalStaff.lastName}</span>
                    <span className="mx-1 text-slate-300">→</span>
                    <span className="font-medium text-indigo-600">{ex.substitute.firstName} {ex.substitute.lastName}</span>
                  </p>
                  {ex.reason && <p className="text-xs text-slate-400 mt-0.5 italic">"{ex.reason}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(ex.status)}`}>
                    {ex.status}
                  </span>
                  {ex.status === "PENDING" && user?.role === "ADMIN" && (
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(ex.id, "APPROVED")}
                        className="w-6 h-6 rounded bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                      <button onClick={() => updateStatus(ex.id, "REJECTED")}
                        className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center">
                        <CloseIcon className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Timetable Page ──────────────────────────────────────────────────────

export default function TimetablePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [timetable, setTimetable] = useState<Timetable | null | "empty">(null);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showExchanges, setShowExchanges] = useState(false);
  const [tab, setTab] = useState<"section" | "exchange">("section");

  useEffect(() => {
    Promise.all([
      api.get("/classes").then((r) => {
        const secs: Section[] = [];
        for (const cls of r.data) for (const sec of cls.sections ?? [])
          secs.push({ ...sec, class: cls });
        setSections(secs);
        if (secs.length > 0) setSelectedSection(secs[0].id);
      }),
      api.get("/timetable/subjects").then((r) => setSubjects(r.data)),
      api.get("/staff").then((r) => setStaffList(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const loadTimetable = useCallback(async (sectionId: string) => {
    if (!sectionId) return;
    setTimetable(null);
    try {
      const r = await api.get(`/timetable/section/${sectionId}`);
      setTimetable(r.data ?? "empty");
    } catch {
      setTimetable("empty");
    }
  }, []);

  useEffect(() => { if (selectedSection) loadTimetable(selectedSection); }, [selectedSection, loadTimetable]);

  if (loading) return <SectionLoader />;

  const currentSection = sections.find((s) => s.id === selectedSection);
  const allPeriods = timetable && timetable !== "empty" ? timetable.periods : [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Timetable</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage class schedules, assign teachers and handle period exchanges
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("exchange")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === "exchange"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Exchanges
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowGenerate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <RefreshIcon className="w-4 h-4" />
              Generate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("section")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            tab === "section" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          Class Timetable
        </button>
        <button onClick={() => setTab("exchange")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            tab === "exchange" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          Period Exchanges
        </button>
      </div>

      {tab === "section" && (
        <>
          {/* Section selector */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-slate-600">Section:</span>
            {sections.map((s) => (
              <button key={s.id} onClick={() => setSelectedSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                  selectedSection === s.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}>
                {s.class.name} – {s.name}
              </button>
            ))}
          </div>

          {/* Timetable grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            {!timetable ? (
              <SectionLoader />
            ) : timetable === "empty" ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <CalendarIcon className="w-12 h-12 text-slate-300" />
                <p className="text-base font-semibold text-slate-500">No timetable yet for this section</p>
                <p className="text-sm text-slate-400">Click "Generate" to auto-create a timetable structure</p>
                {isAdmin && (
                  <button className="btn-primary mt-2" onClick={() => setShowGenerate(true)}>
                    Generate Timetable
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      {timetable.section?.class?.name} – {timetable.section?.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {timetable.periods.filter((p) => !p.isBreak).length} teaching periods ·{" "}
                      {[...new Set(timetable.periods.map((p) => p.dayOfWeek))].length} days/week
                    </p>
                  </div>
                  {isAdmin && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <EditIcon className="w-3 h-3" /> Hover a cell to edit
                    </span>
                  )}
                </div>
                <TimetableGrid
                  timetable={timetable}
                  subjects={subjects}
                  staffList={staffList}
                  onRefresh={() => loadTimetable(selectedSection)}
                  isAdmin={isAdmin}
                />
              </>
            )}
          </div>
        </>
      )}

      {tab === "exchange" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <ExchangePanel
            schoolId="" staffList={staffList} timetablePeriods={allPeriods}
            onClose={() => setTab("section")}
          />
        </div>
      )}

      {/* Generate Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Timetable">
        <GenerateModal
          sections={sections}
          onGenerated={() => loadTimetable(selectedSection)}
          onClose={() => setShowGenerate(false)}
        />
      </Modal>
    </div>
  );
}
