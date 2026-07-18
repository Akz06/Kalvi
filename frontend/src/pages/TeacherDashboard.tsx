import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { SectionLoader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import {
  ClockIcon, CalendarIcon, StudentsIcon, ExamsIcon,
  ChevronRightIcon, CheckCircleIcon, WarningIcon,
} from "../components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffInfo {
  id: string; firstName: string; lastName: string;
  designation: string; email: string;
}
interface Subject { id: string; name: string; code: string }
interface Section {
  id: string; name: string; class: { name: string; level: number }
}
interface Period {
  id: string; dayOfWeek: number; periodNo: number;
  startTime: string; endTime: string; isBreak: boolean; label?: string;
  subject?: Subject | null;
  timetable?: { section: { name: string; class: { name: string } } };
}
interface Exchange {
  id: string; status: string; reason?: string; exchangeDate: string;
  period: { startTime: string; endTime: string; subject?: Subject | null };
  originalStaff: { firstName: string; lastName: string };
  substitute: { firstName: string; lastName: string };
}
interface UpcomingExam {
  id: string; name: string; subject: string; className: string; examDate: string;
}
interface TeacherStats {
  periodsToday: number; subjectsTaught: number;
  classesMentored: number; pendingExchanges: number;
}
interface DashboardData {
  staff: StaffInfo;
  stats: TeacherStats;
  todaySchedule: Period[];
  nextClass: Period | null;
  weeklySchedule: Record<string, Period[]>;
  todayExchanges: Exchange[];
  upcomingExams: UpcomingExam[];
  mySubjects: Subject[];
  mySections: Section[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent, iconBg }: {
  label: string; value: number | string;
  icon: React.ReactNode; accent: string; iconBg: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-white shadow-sm border border-slate-100`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent} rounded-t-2xl`} />
      <div className="flex items-start justify-between mt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-3xl font-extrabold text-slate-800 leading-none">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Today's Schedule ─────────────────────────────────────────────────────────

function TodaySchedule({ periods, nextClassId }: { periods: Period[]; nextClassId?: string }) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
        <CalendarIcon className="w-10 h-10" />
        <p className="text-sm text-slate-400">No classes scheduled today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {periods.map((p) => {
        const isPast = p.endTime < currentTime;
        const isCurrent = p.startTime <= currentTime && currentTime < p.endTime;
        const isNext = p.id === nextClassId;
        return (
          <div key={p.id} className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition ${
            isCurrent ? "bg-indigo-50 border-indigo-200 shadow-sm"
            : isNext ? "bg-emerald-50 border-emerald-200"
            : isPast ? "bg-slate-50 border-slate-100 opacity-60"
            : p.isBreak ? "bg-amber-50 border-amber-100"
            : "bg-white border-slate-100"
          }`}>
            {/* Time */}
            <div className="text-center w-20 flex-shrink-0">
              <p className={`text-sm font-bold ${isCurrent ? "text-indigo-700" : "text-slate-700"}`}>
                {p.startTime}
              </p>
              <p className="text-xs text-slate-400">{p.endTime}</p>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              {p.isBreak ? (
                <p className="text-sm font-semibold text-amber-700">{p.label ?? "Break"}</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {p.subject?.name ?? "Free Period"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.timetable?.section?.class?.name} – {p.timetable?.section?.name}
                    {" · "}Period {p.periodNo}
                  </p>
                </>
              )}
            </div>
            {/* Status badge */}
            <div className="flex-shrink-0">
              {isCurrent && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                  Now
                </span>
              )}
              {isNext && !isCurrent && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Next
                </span>
              )}
              {isPast && !isCurrent && (
                <CheckCircleIcon className="w-4 h-4 text-slate-300" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Weekly Grid (compact) ────────────────────────────────────────────────────

function WeeklyGrid({ schedule }: { schedule: Record<string, Period[]> }) {
  const today = new Date().getDay(); // 0=Sun
  const todayDow = today === 0 ? -1 : today;

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-2 min-w-[500px]"
        style={{ gridTemplateColumns: `repeat(${Object.keys(schedule).length}, 1fr)` }}>
        {Object.entries(schedule).map(([dow, periods]) => {
          const d = Number(dow);
          const isToday = d === todayDow;
          return (
            <div key={dow}>
              <div className={`text-center py-1.5 rounded-lg text-xs font-bold mb-1 ${
                isToday ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {DAYS[d - 1]}
              </div>
              <div className="space-y-1">
                {periods.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-300">—</div>
                ) : periods.map((p) => (
                  <div key={p.id} className={`rounded-lg px-2 py-1.5 text-xs ${
                    p.isBreak ? "bg-amber-50 text-amber-700"
                    : !p.subject ? "bg-slate-50 text-slate-400"
                    : "bg-indigo-50 text-indigo-700"
                  }`}>
                    <p className="font-semibold truncate">{p.isBreak ? (p.label ?? "Break") : (p.subject?.name ?? "Free")}</p>
                    <p className="text-slate-400">{p.startTime}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Teacher Dashboard ────────────────────────────────────────────────────────

export default function TeacherDashboard({ staffId }: { staffId?: string }) {
  const { user } = useAuth();
  const { config } = useConfig();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [allStaff, setAllStaff] = useState<StaffInfo[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffId ?? "");
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  // Load all staff for admin dropdown
  useEffect(() => {
    if (isAdmin) {
      api.get("/staff").then((r) => {
        setAllStaff(r.data);
        if (!selectedStaffId && r.data.length > 0) setSelectedStaffId(r.data[0].id);
      });
    }
  }, [isAdmin]);

  // Load dashboard for selected staff
  useEffect(() => {
    if (!selectedStaffId) return;
    setData(null); setError(false);
    api.get(`/timetable/teacher-dashboard/${selectedStaffId}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [selectedStaffId]);

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
      <WarningIcon className="w-10 h-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">Could not load teacher dashboard.</p>
      <button className="btn-primary text-xs mt-2"
        onClick={() => { setError(false); setData(null); }}>Retry</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {isAdmin ? "Teacher Dashboard" : greeting(user?.name?.split(" ")[0] ?? "Teacher")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {config?.name} · {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
        {/* Admin: teacher picker */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Viewing:</label>
            <select
              className="input text-sm py-1.5 pr-8 w-56"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">Select teacher…</option>
              {allStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} — {s.designation}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!data ? (
        selectedStaffId ? <SectionLoader /> :
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
          <StudentsIcon className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-500">Select a teacher to view their dashboard</p>
        </div>
      ) : (
        <>
          {/* Staff info banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl px-6 py-5 text-white flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-extrabold">
              {data.staff.firstName[0]}{data.staff.lastName[0]}
            </div>
            <div>
              <p className="text-lg font-extrabold">{data.staff.firstName} {data.staff.lastName}</p>
              <p className="text-sm opacity-80">{data.staff.designation}</p>
              <p className="text-xs opacity-60 mt-0.5">{data.staff.email}</p>
            </div>
            <div className="ml-auto flex gap-4 text-center">
              {data.mySubjects.map((s) => (
                <div key={s.id} className="bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-sm font-bold">{s.code}</p>
                  <p className="text-[10px] opacity-70">{s.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Periods Today" value={data.stats.periodsToday}
              icon={<ClockIcon className="w-5 h-5" />}
              accent="bg-indigo-500" iconBg="bg-indigo-50 text-indigo-600" />
            <StatCard label="Subjects Taught" value={data.stats.subjectsTaught}
              icon={<ExamsIcon className="w-5 h-5" />}
              accent="bg-violet-500" iconBg="bg-violet-50 text-violet-600" />
            <StatCard label="Class Teacher Of" value={data.stats.classesMentored}
              icon={<StudentsIcon className="w-5 h-5" />}
              accent="bg-teal-500" iconBg="bg-teal-50 text-teal-600" />
            <StatCard label="Pending Exchanges" value={data.stats.pendingExchanges}
              icon={<WarningIcon className="w-5 h-5" />}
              accent={data.stats.pendingExchanges > 0 ? "bg-amber-500" : "bg-slate-300"}
              iconBg={data.stats.pendingExchanges > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"} />
          </div>

          {/* Next class + today's schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Next class card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Next Class</h2>
              {data.nextClass ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-extrabold text-indigo-700">{data.nextClass.startTime}</p>
                    <p className="text-sm font-semibold text-indigo-600 mt-1">
                      {data.nextClass.subject?.name ?? "Free Period"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {data.nextClass.timetable?.section?.class?.name} – {data.nextClass.timetable?.section?.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Period {data.nextClass.periodNo}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {data.nextClass.startTime} – {data.nextClass.endTime}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-28 text-slate-300 gap-2">
                  <CheckCircleIcon className="w-8 h-8 text-emerald-300" />
                  <p className="text-sm text-slate-400">All classes done for today</p>
                </div>
              )}

              {/* Today's exchanges */}
              {data.todayExchanges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Today's Exchanges</p>
                  {data.todayExchanges.map((ex) => (
                    <div key={ex.id} className="text-xs bg-amber-50 rounded-lg px-3 py-2 mb-1">
                      <p>{ex.period.startTime} · {ex.period.subject?.name}</p>
                      <p className="text-slate-500">
                        {ex.originalStaff.firstName} to {ex.substitute.firstName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's full schedule */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Today's Schedule</h2>
              <TodaySchedule periods={data.todaySchedule} nextClassId={data.nextClass?.id} />
            </div>
          </div>

          {/* Weekly timetable */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Weekly Schedule</h2>
              <Link to="/app/timetable" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                Full view <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
            <WeeklyGrid schedule={data.weeklySchedule as Record<string, Period[]>} />
          </div>

          {/* Upcoming exams */}
          {data.upcomingExams.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Upcoming Exams</h2>
              <div className="space-y-2">
                {data.upcomingExams.map((e) => {
                  const days = Math.ceil((new Date(e.examDate).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{e.name}</p>
                        <p className="text-xs text-slate-400">{e.className} · {e.subject}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        days <= 2 ? "bg-red-50 text-red-600"
                        : days <= 7 ? "bg-amber-50 text-amber-600"
                        : "bg-slate-50 text-slate-500"
                      }`}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
