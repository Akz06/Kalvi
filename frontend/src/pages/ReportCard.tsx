/**
 * Report Card Page
 *
 * Lets an admin:
 *   1. Select a student
 *   2. Preview their full report card (live results pulled from the API)
 *   3. Download it as a PDF
 *
 * Route: /report-cards
 * Feature flag: exams (re-uses the exams flag)
 */
import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import {
  EmptyState,
  PageHeader,
  Spinner,
  FormError,
} from "../components/ui";
import { formatDate } from "../lib/format";
import { useConfig } from "../context/ConfigContext";
import { DownloadPDFButton } from "../components/pdf/DownloadPDFButton";
import { ReportCardPDF } from "../components/pdf/ReportCardPDF";

// ── Types (mirror backend response shape) ──────────────────
interface StudentOpt {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  section?: {
    name: string;
    class?: { name: string };
  };
}

interface ReportResult {
  exam: string;
  subject: string;
  examDate: string;
  marksObtained: number;
  maxMarks: number;
  grade: string | null;
  remark?: string | null;
}

interface ReportSummary {
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
}

interface Report {
  student: {
    id: string;
    admissionNo: string;
    name: string;
    class: string;
    section: string;
  };
  results: ReportResult[];
  summary: ReportSummary;
}

// ── Grade colour helpers ───────────────────────────────────
const gradeColor: Record<string, string> = {
  "A+": "bg-green-100 text-green-700",
  A: "bg-green-100 text-green-700",
  "B+": "bg-emerald-100 text-emerald-700",
  B: "bg-emerald-100 text-emerald-700",
  "C+": "bg-amber-100 text-amber-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  F: "bg-red-100 text-red-700",
};

export default function ReportCard() {
  const { config } = useConfig();
  const passPercent = config?.settings?.passPercentage ?? 33;

  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Remark fields (optional, printed on the PDF)
  const [teacherRemark, setTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");

  useEffect(() => {
    api.get("/students").then((r) => setStudents(r.data));
  }, []);

  async function loadReport(studentId: string) {
    if (!studentId) {
      setReport(null);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.get(`/exams/student/${studentId}/report`);
      setReport(res.data);
    } catch (err) {
      setReport(null);
      setError(parseApiError(err, "Could not load the report card.").message);
    } finally {
      setLoading(false);
    }
  }

  function onSelect(id: string) {
    setSelectedId(id);
    setReport(null);
    setTeacherRemark("");
    setPrincipalRemark("");
    loadReport(id);
  }

  // Build the PDF props from current state
  function buildPdfProps() {
    if (!report) return null;
    const student = students.find((s) => s.id === selectedId);
    const settings = config?.settings;
    return {
      school: {
        name: config?.name ?? "School ERP",
        addressLine: settings?.addressLine,
        city: settings?.city,
        state: settings?.state,
        phone: settings?.phone,
        email: settings?.email,
        board: settings?.board,
        academicYear: settings?.academicYear,
        passPercentage: settings?.passPercentage ?? 33,
        currency: settings?.currency,
        locale: settings?.locale,
      },
      student: {
        admissionNo: report.student.admissionNo,
        name: report.student.name,
        class: report.student.class,
        section: report.student.section,
        guardianName: undefined,
        dob: undefined,
      },
      results: report.results,
      summary: report.summary,
      teacherRemark: teacherRemark || undefined,
      principalRemark: principalRemark || undefined,
    };
  }

  const pdfProps = buildPdfProps();
  const passed = report ? report.summary.percentage >= passPercent : false;

  return (
    <div>
      <PageHeader title="Report Cards" />

      {/* Student selector */}
      <div className="card p-5 mb-6 max-w-xl">
        <label className="label">Select Student</label>
        <select
          className="input"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">— choose a student —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.admissionNo} — {s.firstName} {s.lastName}
              {s.section ? ` (${s.section.class?.name} ${s.section.name})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Report cards are generated from all recorded exam results for the student.
        </p>
      </div>

      <FormError message={error} />

      {loading && <Spinner />}

      {report && !loading && (
        <>
          {/* ── Result summary card ── */}
          <div className="card p-5 mb-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {report.student.name}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {report.student.admissionNo} · {report.student.class} ·{" "}
                  Section {report.student.section}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Overall Grade</p>
                  <span
                    className={`badge text-sm font-bold px-3 py-1 ${
                      gradeColor[report.summary.overallGrade] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {report.summary.overallGrade}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Percentage</p>
                  <span className="text-2xl font-bold text-slate-800">
                    {report.summary.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Result</p>
                  <span
                    className={`badge text-sm font-semibold px-3 py-1 ${
                      passed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Total: {report.summary.totalObtained} / {report.summary.totalMax} · Pass
              threshold: {passPercent}%
            </p>
          </div>

          {/* ── Results table ── */}
          {report.results.length === 0 ? (
            <EmptyState text="No exam results recorded for this student yet." />
          ) : (
            <div className="card overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Marks</th>
                    <th className="px-4 py-3 text-right">Max</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.results.map((r, idx) => {
                    const pct =
                      r.maxMarks > 0
                        ? ((r.marksObtained / r.maxMarks) * 100).toFixed(1)
                        : "—";
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">{r.exam}</td>
                        <td className="px-4 py-2.5">{r.subject}</td>
                        <td className="px-4 py-2.5">{formatDate(r.examDate)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {r.marksObtained}
                        </td>
                        <td className="px-4 py-2.5 text-right">{r.maxMarks}</td>
                        <td className="px-4 py-2.5 text-right">{pct}%</td>
                        <td className="px-4 py-2.5 text-center">
                          {r.grade ? (
                            <span
                              className={`badge ${
                                gradeColor[r.grade] ??
                                "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {r.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Remarks (optional, printed on PDF) ── */}
          <div className="card p-5 mb-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Remarks{" "}
              <span className="font-normal text-slate-400">(optional — printed on the PDF)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Class Teacher's Remark</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="e.g. Excellent effort, keep it up!"
                  value={teacherRemark}
                  onChange={(e) => setTeacherRemark(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Principal's Remark</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="e.g. A dedicated and focused student."
                  value={principalRemark}
                  onChange={(e) => setPrincipalRemark(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Download ── */}
          {pdfProps && report.results.length > 0 && (
            <div className="flex items-center gap-3">
              <DownloadPDFButton
                document={<ReportCardPDF {...pdfProps} />}
                fileName={`report-card-${report.student.admissionNo}.pdf`}
                label="Download Report Card (PDF)"
                className="!text-sm !px-5 !py-2.5"
              />
              <p className="text-xs text-slate-400">
                The PDF includes the grade legend, signature lines, and all
                entered remarks.
              </p>
            </div>
          )}
        </>
      )}

      {!selectedId && !loading && (
        <EmptyState text="Select a student above to view and download their report card." />
      )}
    </div>
  );
}
