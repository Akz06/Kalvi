import { useEffect, useState } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import {
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  FormError,
} from "../components/ui";
import { formatDate } from "../lib/format";

interface ExamRow {
  id: string;
  name: string;
  subject: string;
  maxMarks: number;
  examDate: string;
  class: { name: string; level: number };
  _count: { results: number };
}
interface ClassOpt { id: string; name: string; level: number }
interface RosterRow {
  student: { id: string; admissionNo: string; firstName: string; lastName: string };
  marksObtained: number | null;
  grade: string | null;
}

const gradeColor: Record<string, string> = {
  "A+": "bg-green-100 text-green-700", A: "bg-green-100 text-green-700",
  "B+": "bg-emerald-100 text-emerald-700", B: "bg-emerald-100 text-emerald-700",
  "C+": "bg-amber-100 text-amber-700", C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700", F: "bg-red-100 text-red-700",
};

export default function Exams() {
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", classId: "", subject: "", maxMarks: "100", examDate: "" });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);

  // Marks entry
  const [activeExam, setActiveExam] = useState<ExamRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [marksError, setMarksError] = useState("");

  function load() {
    api.get("/exams").then((r) => setExams(r.data));
  }
  useEffect(() => {
    load();
    api.get("/classes").then((r) => setClasses(r.data));
  }, []);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);
    try {
      await api.post("/exams", {
        name: form.name, classId: form.classId, subject: form.subject,
        maxMarks: Number(form.maxMarks), examDate: form.examDate,
      });
      setOpen(false);
      setForm({ name: "", classId: "", subject: "", maxMarks: "100", examDate: "" });
      load();
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't create this exam.");
      setError(parsed.message);
      setIssues(parsed.issues);
    }
  }

  async function openMarks(exam: ExamRow) {
    setActiveExam(exam);
    setRoster(null);
    setMarksError("");
    const res = await api.get(`/exams/${exam.id}`);
    setRoster(res.data.roster);
    const initial: Record<string, string> = {};
    res.data.roster.forEach((r: RosterRow) => {
      initial[r.student.id] = r.marksObtained != null ? String(r.marksObtained) : "";
    });
    setMarks(initial);
  }

  async function saveMarks() {
    if (!activeExam || !roster) return;
    setMarksError("");
    const entered = roster.filter((r) => marks[r.student.id] !== "");
    // Clear, upfront validation so the teacher fixes issues before submitting.
    const overMax = entered.find(
      (r) => Number(marks[r.student.id]) > activeExam.maxMarks
    );
    if (overMax) {
      setMarksError(
        `Marks cannot be more than the maximum of ${activeExam.maxMarks}. Please check ${overMax.student.firstName} ${overMax.student.lastName}.`
      );
      return;
    }
    const negative = entered.find((r) => Number(marks[r.student.id]) < 0);
    if (negative) {
      setMarksError("Marks cannot be negative.");
      return;
    }
    const results = entered.map((r) => ({
      studentId: r.student.id,
      marksObtained: Number(marks[r.student.id]),
    }));
    if (results.length === 0) {
      setMarksError("Please enter marks for at least one student.");
      return;
    }
    try {
      await api.post(`/exams/${activeExam.id}/results`, { results });
      setActiveExam(null);
      load();
    } catch (err) {
      setMarksError(parseApiError(err, "We couldn't save these marks.").message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Exams & Report Cards"
        action={<button className="btn-primary" onClick={() => setOpen(true)}>+ New Exam</button>}
      />

      {!exams ? <Spinner /> : exams.length === 0 ? (
        <EmptyState text="No exams yet. Create one to start recording marks." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Recorded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3">{e.class.name}</td>
                  <td className="px-4 py-3">{e.subject}</td>
                  <td className="px-4 py-3">{e.maxMarks}</td>
                  <td className="px-4 py-3">{formatDate(e.examDate)}</td>
                  <td className="px-4 py-3">{e._count.results}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                      onClick={() => openMarks(e)}>
                      Enter Marks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create exam */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Exam">
        <form onSubmit={createExam} className="space-y-3">
          <div>
            <label className="label">Exam Name</label>
            <input className="input" placeholder="Term 1 Examination" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Class</label>
              <select className="input" value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                <option value="">Select…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input className="input" type="number" min={1} value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} required />
            </div>
            <div>
              <label className="label">Exam Date</label>
              <input className="input" type="date" value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })} required />
            </div>
          </div>
          <FormError message={error} issues={issues} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      {/* Marks entry */}
      <Modal open={!!activeExam} onClose={() => setActiveExam(null)}
        title={activeExam ? `Marks — ${activeExam.name} (${activeExam.subject})` : ""}>
        {!roster ? <Spinner /> : roster.length === 0 ? (
          <EmptyState text="No students in this class yet." />
        ) : (
          <div className="space-y-3">
            <div className="max-h-80 overflow-auto divide-y divide-slate-100">
              {roster.map((r) => (
                <div key={r.student.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 text-sm">
                    {r.student.firstName} {r.student.lastName}
                    <span className="block text-xs text-slate-400">{r.student.admissionNo}</span>
                  </div>
                  {r.grade && (
                    <span className={`badge ${gradeColor[r.grade] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.grade}
                    </span>
                  )}
                  <input
                    className="input w-24"
                    type="number"
                    min={0}
                    max={activeExam?.maxMarks}
                    placeholder="Marks"
                    value={marks[r.student.id] ?? ""}
                    onChange={(e) => setMarks({ ...marks, [r.student.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <FormError message={marksError} />
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setActiveExam(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveMarks}>Save Marks</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
