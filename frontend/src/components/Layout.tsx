import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConfig, type Features } from "../context/ConfigContext";
import { Spinner } from "./ui";
import {
  DashboardIcon,
  StudentsIcon,
  StaffIcon,
  ClassesIcon,
  AttendanceIcon,
  AcademicYearIcon,
  FeesIcon,
  PaymentsIcon,
  ExamsIcon,
  ReportCardIcon,
  GuardiansIcon,
  SettingsIcon,
  LogoutIcon,
  AddSchoolIcon,
  SwitchSchoolIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  CheckIcon,
} from "./icons";

interface LinkDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  feature?: keyof Features;
}

interface LinkGroup {
  group?: string;
  links: LinkDef[];
}

const NAV: LinkGroup[] = [
  {
    links: [
      { to: "/app", label: "Dashboard", icon: DashboardIcon, end: true },
    ],
  },
  {
    group: "Academic",
    links: [
      { to: "/app/students",       label: "Students",       icon: StudentsIcon,      feature: "students" },
      { to: "/app/staff",          label: "Staff",           icon: StaffIcon,         feature: "staff" },
      { to: "/app/classes",        label: "Classes",          icon: ClassesIcon,       feature: "classes" },
      { to: "/app/attendance",     label: "Attendance",       icon: AttendanceIcon,    feature: "attendance" },
      { to: "/app/academic-years", label: "Academic Years",   icon: AcademicYearIcon,  feature: "academicYears" },
    ],
  },
  {
    group: "Finance",
    links: [
      { to: "/app/fees",              label: "Fees",             icon: FeesIcon,     feature: "fees" },
      { to: "/app/payment-settings",  label: "Online Payments",  icon: PaymentsIcon, feature: "fees" },
    ],
  },
  {
    group: "Exams",
    links: [
      { to: "/app/exams",        label: "Exams",        icon: ExamsIcon,      feature: "exams" },
      { to: "/app/report-cards", label: "Report Cards", icon: ReportCardIcon, feature: "exams" },
    ],
  },
  {
    group: "Portal",
    links: [
      { to: "/app/guardians", label: "Guardians", icon: GuardiansIcon, feature: "parentPortal" },
    ],
  },
  {
    group: "Admin",
    links: [
      { to: "/app/settings", label: "Preferences", icon: SettingsIcon },
    ],
  },
];

export default function Layout() {
  const { user, logout, switchSchool } = useAuth();
  const { config, loading } = useConfig();
  const navigate = useNavigate();

  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  if (loading) return <Spinner />;

  const features = config?.features;
  const schoolName = config?.name ?? "Kalvi";
  const subtitle = config?.settings
    ? [config.settings.city, config.settings.board].filter(Boolean).join(" • ")
    : "";

  // All schools this user can access
  const schools = user?.schools ?? [];
  const currentSlug = user?.school?.slug ?? "";

  async function handleSwitchSchool(slug: string) {
    if (slug === currentSlug) {
      setSchoolMenuOpen(false);
      return;
    }
    setSwitching(slug);
    try {
      await switchSchool(slug);
      setSchoolMenuOpen(false);
      // Full reload so ConfigContext re-fetches for the new school
      window.location.href = "/app";
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 text-white flex flex-col h-full">

        {/* School identity + switcher */}
        <div className="px-4 py-4 border-b border-slate-700/60 flex-shrink-0">
          <button
            className="w-full text-left group"
            onClick={() => schools.length > 1 && setSchoolMenuOpen((o) => !o)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                  Your School
                </p>
                <h1 className="text-sm font-bold truncate text-white leading-tight">
                  {schoolName}
                </h1>
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              {schools.length > 1 && (
                <div className="flex-shrink-0 mt-1 text-slate-400 group-hover:text-slate-200 transition">
                  {schoolMenuOpen ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          </button>

          {/* School switcher dropdown */}
          {schoolMenuOpen && schools.length > 1 && (
            <div className="mt-3 bg-slate-800 rounded-lg overflow-hidden border border-slate-700/60">
              {schools.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSwitchSchool(s.slug)}
                  disabled={switching === s.slug}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-slate-700 transition disabled:opacity-50"
                >
                  <SwitchSchoolIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate flex-1 text-slate-200">{s.name}</span>
                  {s.slug === currentSlug && (
                    <CheckIcon className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-700/60">
                <button
                  onClick={() => { setSchoolMenuOpen(false); navigate("/create-school"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-slate-700 transition text-slate-300"
                >
                  <AddSchoolIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>Add Another School</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 min-h-0 space-y-5">
          {NAV.map((group) => {
            const visibleLinks = group.links.filter(
              (l) => !l.feature || features?.[l.feature]
            );
            if (visibleLinks.length === 0) return null;
            return (
              <div key={group.group ?? "_root"}>
                {group.group && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">
                    {group.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleLinks.map((l) => {
                    const Icon = l.icon;
                    return (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        end={l.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? "bg-brand-600 text-white shadow-sm"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                            <span>{l.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700/60 flex-shrink-0">
          {/* Add school — single school users see this always */}
          {schools.length <= 1 && (
            <div className="px-3 pt-3">
              <button
                onClick={() => navigate("/create-school")}
                className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                <AddSchoolIcon className="w-4 h-4 flex-shrink-0" />
                <span>Add Another School</span>
              </button>
            </div>
          )}

          {/* User info + logout */}
          <div className="p-3">
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
            >
              <LogoutIcon className="w-4 h-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-100">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
