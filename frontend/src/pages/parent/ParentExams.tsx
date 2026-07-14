import { useEffect, useState } from "react";
import { parentApi } from "../../api/parentClient";
import { Spinner } from "../../components/ui";

interface ExamResult {
  examName: string;
  subject: string;
  examDate: string;
  maxMarks: number;
  marksObtained: number;
  grade: string | null;
  remark: string | null;
}

interface ExamSummary {
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
}

export default function ParentExams() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi
      .get("/parent/portal/exams")
      .then((r) => {
        setResults(r.data.results);
        setSummary(r.data.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">📝 Exams & Grades</h2>

      {/* Overall summary */}
      {summary && summary.totalMax > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Overall Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total Marks" value={`${summary.totalObtained} / ${summary.totalMax}`} />
            <SummaryCard label="Percentage" value={`${summary.percentage.toFixed(1)}%`} />
            <SummaryCard label="Overall Grade" value={summary.overallGrade} highlight />
            <SummaryCard
              label="Result"
              value={summary.percentage >= 35 ? "PASS" : "FAIL"}
              highlight
              pass={summary.percentage >= 35}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>0%</span>
              <span>Pass (35%)</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 relative">
              {/* pass line */}
              <div className="absolute top-0 left-[35%] w-0.5 h-3 bg-slate-400" />
              <div
                className={`h-3 rounded-full transition-all ${
                  summary.percentage >= 35 ? "bg-green-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(summary.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          No exam results found yet. Check back after exams are marked.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Subject-wise Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Exam</th>
                  <th className="px-5 py-3 text-left font-medium">Subject</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-center font-medium">Marks</th>
                  <th className="px-5 py-3 text-center font-medium">%</th>
                  <th className="px-5 py-3 text-center font-medium">Grade</th>
                  <th className="px-5 py-3 text-left font-medium">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => {
                  const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.examName}</td>
                      <td className="px-5 py-3 text-slate-600">{r.subject}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {new Date(r.examDate).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-center font-semibold">
                        {r.marksObtained} / {r.maxMarks}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-5 py-3 text-center">
                        <GradeBadge grade={r.grade ?? "—"} />
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{r.remark ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
  pass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  pass?: boolean;
}) {
  const isPass = pass === true;
  const isFail = pass === false;
  return (
    <div
      className={`rounded-lg p-3 text-center ${
        highlight
          ? isPass
            ? "bg-green-100 text-green-700"
            : isFail
            ? "bg-red-100 text-red-700"
            : "bg-purple-100 text-purple-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      <p className="text-xs opacity-70 font-medium">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700",
  A: "bg-green-100 text-green-700",
  "B+": "bg-teal-100 text-teal-700",
  B: "bg-blue-100 text-blue-700",
  "C+": "bg-indigo-100 text-indigo-700",
  C: "bg-violet-100 text-violet-700",
  D: "bg-amber-100 text-amber-700",
  F: "bg-red-100 text-red-700",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`px-2 py-0.5 rounded font-bold text-xs ${GRADE_COLORS[grade] ?? "bg-slate-100 text-slate-600"}`}>
      {grade}
    </span>
  );
}
