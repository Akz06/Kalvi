import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConfig, type Features } from "../context/ConfigContext";
import { Spinner } from "./ui";

interface LinkDef {
  to: string;
  label: string;
  end?: boolean;
  feature?: keyof Features; // if set, only shown when the flag is on
}

interface LinkGroup {
  group?: string;
  links: LinkDef[];
}

const NAV: LinkGroup[] = [
  {
    links: [
      { to: "/app", label: "🏠 Dashboard", end: true },
    ],
  },
  {
    group: "Academic",
    links: [
      { to: "/app/students",       label: "👨‍🎓 Students",       feature: "students" },
      { to: "/app/staff",          label: "👩‍🏫 Staff",           feature: "staff" },
      { to: "/app/classes",        label: "🏫 Classes",          feature: "classes" },
      { to: "/app/attendance",     label: "📅 Attendance",       feature: "attendance" },
      { to: "/app/academic-years", label: "🗓 Academic Years",   feature: "academicYears" },
    ],
  },
  {
    group: "Finance",
    links: [
      { to: "/app/fees",           label: "💰 Fees",             feature: "fees" },
      { to: "/app/payment-settings", label: "💳 Online Payments", feature: "fees" },
    ],
  },
  {
    group: "Exams",
    links: [
      { to: "/app/exams",          label: "📝 Exams",            feature: "exams" },
      { to: "/app/report-cards",   label: "📄 Report Cards",     feature: "exams" },
    ],
  },
  {
    group: "Portal",
    links: [
      { to: "/app/guardians",      label: "👨‍👩‍👧 Guardians",      feature: "parentPortal" },
    ],
  },
  {
    group: "Admin",
    links: [
      { to: "/app/settings",       label: "⚙️ Preferences" },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { config, loading } = useConfig();

  if (loading) return <Spinner />;

  const features = config?.features;

  const schoolName = config?.name ?? "Kalvi";
  const subtitle = config?.settings
    ? [config.settings.city, config.settings.board].filter(Boolean).join(" • ")
    : "";

  return (
    /* Outer shell — full viewport height, no overflow on the shell itself */
    <div className="h-screen flex overflow-hidden">

      {/* ── Sidebar ── fixed height, never scrolls as a whole */}
      <aside className="w-60 flex-shrink-0 bg-brand-800 text-white flex flex-col h-full">

        {/* School identity — always visible at top */}
        <div className="px-5 py-5 border-b border-brand-700 flex-shrink-0">
          <h1 className="text-lg font-bold truncate">🎓 {schoolName}</h1>
          {subtitle && <p className="text-xs text-brand-100 mt-1">{subtitle}</p>}
        </div>

        {/* Nav links — scrollable only if there are too many links to fit */}
        <nav className="flex-1 overflow-y-auto p-3 min-h-0 space-y-4">
          {NAV.map((group) => {
            const visibleLinks = group.links.filter(
              (l) => !l.feature || features?.[l.feature]
            );
            if (visibleLinks.length === 0) return null;
            return (
              <div key={group.group ?? "_root"}>
                {group.group && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-300 px-3 mb-1">
                    {group.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleLinks.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        `block rounded-md px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-white text-brand-800"
                            : "text-brand-100 hover:bg-brand-700"
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer — always visible at bottom */}
        <div className="p-3 border-t border-brand-700 text-sm flex-shrink-0">
          <p className="font-medium truncate">{user?.name}</p>
          <p className="text-xs text-brand-200 truncate">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-md bg-brand-700 py-2 text-sm hover:bg-brand-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content — only this pane scrolls ── */}
      <main className="flex-1 overflow-y-auto bg-slate-100">
        <div className="p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
