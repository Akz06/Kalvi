import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { EmptyState, PageHeader, Spinner, FormError } from "../components/ui";

interface SectionOpt {
  id: string;
  label: string;
}
type Status = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
interface Row {
  student: {
    id: string;
    admissionNo: string;
    firstName: string;
    lastName: string;
  };
  status: Status | null;
}

const statusColors: Record<Status, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-amber-100 text-amber-700",
  LEAVE: "bg-slate-200 text-slate-600",
};

export default function Attendance() {
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/classes/sections").then((r) => {
      setSections(r.data);
      if (r.data[0]) setSectionId(r.data[0].id);
    });
  }, []);

  function load() {
    if (!sectionId) return;
    setRows(null);
    api
      .get("/attendance", { params: { sectionId, date } })
      .then((r) => setRows(r.data));
  }

  useEffect(load, [sectionId, date]);

  function setStatus(studentId: string, status: Status) {
    setRows((prev) =>
      prev!.map((r) =>
        r.student.id === studentId ? { ...r, status } : r
      )
    );
    setSaved(false);
  }

  function markAll(status: Status) {
    setRows((prev) => prev!.map((r) => ({ ...r, status })));
    setSaved(false);
  }

  async function save() {
    if (!rows) return;
    setSaved(false);
    setError("");
    const records = rows
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.student.id, status: r.status }));
    if (records.length === 0) {
      setError("Please mark at least one student before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/attendance", { date, sectionId, records });
      setSaved(true);
    } catch (err) {
      setError(parseApiError(err, "We couldn't save attendance.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" />
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="label">Class - Section</label>
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {rows && rows.length > 0 && (
          <>
            <button className="btn-ghost" onClick={() => markAll("PRESENT")}>
              Mark all Present
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 self-center">
                ✓ Saved
              </span>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState text="No students in this section." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Adm. No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.student.id}>
                  <td className="px-4 py-3 font-medium">
                    {r.student.admissionNo}
                  </td>
                  <td className="px-4 py-3">
                    {r.student.firstName} {r.student.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(["PRESENT", "ABSENT", "LATE", "LEAVE"] as Status[]).map(
                        (st) => (
                          <button
                            key={st}
                            onClick={() => setStatus(r.student.id, st)}
                            className={`badge cursor-pointer ${
                              r.status === st
                                ? statusColors[st]
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {st[0] + st.slice(1).toLowerCase()}
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
