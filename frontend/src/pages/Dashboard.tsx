import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { SectionLoader } from "../components/ui";
import { money, formatDate } from "../lib/format";
import { useConfig } from "../context/ConfigContext";
import { useAuth } from "../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SparkDay { date: string; present: number; absent: number }

interface RecentPayment {
  id: string; amount: number; mode: string;
  paidAt: string; studentName: string; admissionNo: string;
}

interface UpcomingExam {
  id: string; title: string; className: string; startDate: string;
}

interface Stats {
  students: number; newStudentsThisMonth: number;
  staff: number; classes: number; sections: number; exams: number;
  outstandingFees: number; collectedThisMonth: number;
  presentToday: number; absentToday: number; attendanceTrend: number;
  attendanceSparkline: SparkDay[];
  recentPayments: RecentPayment[];
  upcomingExams: UpcomingExam[];
}

// ─── Tiny SVG icons (inline, zero imports) ────────────────────────────────────

const Icons = {
  Students: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7a4 4 0 01-4-4v-1a7 7 0 0114 0v1a4 4 0 01-4 4z"/>
      <circle cx="12" cy="8" r="4"/>
    </svg>
  ),
  Staff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <circle cx="9" cy="10" r="2"/>
      <path strokeLinecap="round" d="M5 20v-1a4 4 0 018 0v1"/>
      <path strokeLinecap="round" d="M15 8h4M15 12h4"/>
    </svg>
  ),
  Attendance: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M8 2v4M16 2v4M9 15l2 2 4-4"/>
    </svg>
  ),
  Fees: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <circle cx="12" cy="12" r="9"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v1m0 8v1M9.5 9.5A2.5 2.5 0 0112 8a2.5 2.5 0 010 5 2.5 2.5 0 000 5 2.5 2.5 0 002.5-1.5"/>
    </svg>
  ),
  Exams: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path strokeLinecap="round" d="M9 12h6M9 16h4"/>
    </svg>
  ),
  Collected: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
    </svg>
  ),
  TrendUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17l5-5 4 4 5-6"/>
    </svg>
  ),
  TrendDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7l5 5 4-4 5 6"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 7v5l3 3"/>
    </svg>
  ),
  Payment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path strokeLinecap="round" d="M2 10h20"/>
    </svg>
  ),
};

// ─── Sparkline bar chart (7 days attendance) ─────────────────────────────────

function Sparkline({ data }: { data: SparkDay[] }) {
  const max = Math.max(...data.map((d) => d.present + d.absent), 1);
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => {
        const total = d.present + d.absent || 0;
        const presentH = total ? Math.round((d.present / max) * 44) : 0;
        const absentH = total ? Math.round((d.absent / max) * 44) : 2;
        const dayLabel = days[new Date(d.date).getUTCDay()];
        return (
          <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1">
            <div className="flex flex-col-reverse items-center gap-px w-full">
              <div
                title={`${d.present} present`}
                className="w-full bg-emerald-400 rounded-sm transition-all duration-500"
                style={{ height: presentH }}
              />
              <div
                title={`${d.absent} absent`}
                className="w-full bg-red-300 rounded-sm transition-all duration-500"
                style={{ height: absentH }}
              />
            </div>
            <span className="text-[9px] text-slate-400">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon: React.ReactNode;
  accent: string;      // tailwind bg class
  iconBg: string;      // tailwind bg+text class
  to?: string;
}

function StatCard({ label, value, sub, trend, icon, accent, iconBg, to }: StatCardProps) {
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow group`}>
      {/* accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent} rounded-t-2xl`} />
      <div className="flex items-start justify-between mt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-3xl font-extrabold text-slate-800 leading-none">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          {trend !== undefined && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {trend >= 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              {Math.abs(trend)}% vs yesterday
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${iconBg}`}>
          {icon}
        </div>
      </div>
      {to && (
        <div className="mt-4 flex items-center gap-1 text-xs text-slate-400 group-hover:text-indigo-600 transition-colors">
          <span>View details</span>
          <Icons.ArrowRight />
        </div>
      )}
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ to, icon, label, desc, color }: { to: string; icon: React.ReactNode; label: string; desc: string; color: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3.5 rounded-xl border border-slate-100 bg-white p-4 hover:border-indigo-200 hover:shadow-md transition-all">
      <div className={`rounded-lg p-2.5 ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </Link>
  );
}

// ─── Greeting based on time of day ───────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name} 👋`;
  if (h < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
}

// ─── Today's date banner ──────────────────────────────────────────────────────

function todayBanner() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { config } = useConfig();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [loadedFromFallback, setLoadedFromFallback] = useState(false);

  const emptyStats: Stats = {
    students: 0, newStudentsThisMonth: 0,
    staff: 0, classes: 0, sections: 0, exams: 0,
    outstandingFees: 0, collectedThisMonth: 0,
    presentToday: 0, absentToday: 0, attendanceTrend: 0,
    attendanceSparkline: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().split("T")[0], present: 0, absent: 0 };
    }),
    recentPayments: [],
    upcomingExams: [],
  };

  const loadStats = () => {
    setRetrying(true);
    api.get("/dashboard/stats")
      .then((r) => { setStats(r.data); setLoadedFromFallback(false); setRetrying(false); })
      .catch(() => { setStats(emptyStats); setLoadedFromFallback(true); setRetrying(false); });
  };

  useEffect(() => { loadStats(); }, []);

  const currency = config?.settings?.currency ?? "INR";
  const locale   = config?.settings?.locale   ?? "en-IN";
  const firstName = user?.name?.split(" ")[0] ?? "Admin";
  const schoolName = config?.name ?? "Your School";

  if (!stats) return <SectionLoader />;

  const totalPresent = stats.presentToday;
  const totalAbsent  = stats.absentToday;
  const totalMarked  = totalPresent + totalAbsent;
  const attendancePct = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  return (
    <div className="space-y-8 pb-10">

      {/* ── Fallback notice ── */}
      {loadedFromFallback && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5 text-amber-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <span className="text-sm font-medium">Could not load live stats — showing empty dashboard. Check your connection or try again.</span>
          </div>
          <button
            onClick={loadStats}
            disabled={retrying}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{greeting(firstName)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{schoolName} &nbsp;·&nbsp; {todayBanner()}</p>
        </div>
        <div className="flex gap-2.5 flex-shrink-0">
          <Link to="/app/students" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" d="M12 4v16M4 12h16"/>
            </svg>
            Add Student
          </Link>
          <Link to="/app/attendance" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
            <Icons.Attendance />
            Mark Attendance
          </Link>
        </div>
      </div>

      {/* ── Primary stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Students"
          value={stats.students.toLocaleString()}
          sub={stats.newStudentsThisMonth > 0 ? `+${stats.newStudentsThisMonth} admitted this month` : "No new admissions this month"}
          icon={<Icons.Students />}
          accent="bg-indigo-500"
          iconBg="bg-indigo-50 text-indigo-600"
          to="/app/students"
        />
        <StatCard
          label="Staff Members"
          value={stats.staff.toLocaleString()}
          sub={`Across ${stats.classes} classes, ${stats.sections} sections`}
          icon={<Icons.Staff />}
          accent="bg-violet-500"
          iconBg="bg-violet-50 text-violet-600"
          to="/app/staff"
        />
        <StatCard
          label="Present Today"
          value={totalMarked > 0 ? `${attendancePct}%` : "—"}
          sub={totalMarked > 0 ? `${totalPresent} present · ${totalAbsent} absent` : "Attendance not yet marked"}
          trend={totalMarked > 0 ? stats.attendanceTrend : undefined}
          icon={<Icons.Attendance />}
          accent="bg-emerald-500"
          iconBg="bg-emerald-50 text-emerald-600"
          to="/app/attendance"
        />
        <StatCard
          label="Outstanding Fees"
          value={money(stats.outstandingFees, currency, locale)}
          sub="Total unpaid / partially paid"
          icon={<Icons.Fees />}
          accent="bg-red-500"
          iconBg="bg-red-50 text-red-600"
          to="/app/fees"
        />
        <StatCard
          label="Collected This Month"
          value={money(stats.collectedThisMonth, currency, locale)}
          sub="Total fee receipts this month"
          icon={<Icons.Collected />}
          accent="bg-teal-500"
          iconBg="bg-teal-50 text-teal-600"
          to="/app/fees"
        />
        <StatCard
          label="Upcoming Exams"
          value={stats.exams.toLocaleString()}
          sub={stats.upcomingExams.length > 0 ? `Next: ${stats.upcomingExams[0].title}` : "No exams scheduled"}
          icon={<Icons.Exams />}
          accent="bg-amber-500"
          iconBg="bg-amber-50 text-amber-600"
          to="/app/exams"
        />
      </div>

      {/* ── Attendance sparkline + Quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Attendance 7-day chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Attendance — Last 7 Days</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily present vs absent count</p>
            </div>
            <Link to="/app/attendance" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              View all <Icons.ArrowRight />
            </Link>
          </div>
          <Sparkline data={stats.attendanceSparkline} />
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Present
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Absent
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            <QuickAction to="/app/students" icon={<Icons.Students />} label="Manage Students" desc="Add, edit or search students" color="bg-indigo-50 text-indigo-600" />
            <QuickAction to="/app/attendance" icon={<Icons.Attendance />} label="Mark Attendance" desc="Record today's attendance" color="bg-emerald-50 text-emerald-600" />
            <QuickAction to="/app/fees" icon={<Icons.Fees />} label="Collect Fees" desc="Record a fee payment" color="bg-amber-50 text-amber-600" />
            <QuickAction to="/app/exams" icon={<Icons.Exams />} label="Manage Exams" desc="Schedule or view exams" color="bg-violet-50 text-violet-600" />
          </div>
        </div>
      </div>

      {/* ── Recent Payments + Upcoming Exams ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Payments</h2>
            <Link to="/app/fees" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              View all <Icons.ArrowRight />
            </Link>
          </div>
          {stats.recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-2">
              <Icons.Payment />
              <p className="text-sm text-slate-400">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Icons.Payment />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{p.studentName}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Icons.Clock /> {formatDate(p.paidAt)} &nbsp;·&nbsp; {p.mode}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-teal-600 flex-shrink-0">
                    +{money(p.amount, currency, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Upcoming Exams</h2>
            <Link to="/app/exams" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              View all <Icons.ArrowRight />
            </Link>
          </div>
          {stats.upcomingExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-2">
              <Icons.Exams />
              <p className="text-sm text-slate-400">No upcoming exams scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingExams.map((e) => {
                const daysLeft = Math.ceil(
                  (new Date(e.startDate).getTime() - Date.now()) / 86_400_000
                );
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-600">
                        <Icons.Exams />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{e.title}</p>
                        <p className="text-xs text-slate-400">{e.className} &nbsp;·&nbsp; {formatDate(e.startDate)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      daysLeft <= 2 ? "bg-red-50 text-red-600"
                      : daysLeft <= 7 ? "bg-amber-50 text-amber-600"
                      : "bg-slate-50 text-slate-500"
                    }`}>
                      {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── School at a glance ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-base font-bold mb-4 opacity-90">School at a Glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Classes",  value: stats.classes,  icon: "🏫" },
            { label: "Sections", value: stats.sections, icon: <Icons.Staff /> },
            { label: "Students", value: stats.students, icon: "👨‍🎓" },
            { label: "Staff",    value: stats.staff,    icon: "👩‍🏫" },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-2xl font-extrabold">{item.value}</div>
              <div className="text-xs opacity-70 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
