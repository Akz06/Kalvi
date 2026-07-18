import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useParentAuth } from "../context/ParentAuthContext";
import { DashboardIcon, AttendanceIcon, FeesIcon, ExamsIcon, GuardiansIcon, LogoutIcon } from "./icons";

const links = [
  { to: "/parent/dashboard", label: "Overview", icon: DashboardIcon, end: true },
  { to: "/parent/attendance", label: "Attendance", icon: AttendanceIcon },
  { to: "/parent/fees", label: "Fees", icon: FeesIcon },
  { to: "/parent/exams", label: "Exams & Grades", icon: ExamsIcon },
];

export default function ParentLayout() {
  const { guardian, logout } = useParentAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/parent/login", { replace: true });
  }

  const student = guardian?.student;
  const classInfo = student?.section
    ? `${student.section.class.name} — ${student.section.name}`
    : "";

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-emerald-800 text-white flex flex-col h-full">
        {/* School + child header */}
        <div className="px-5 py-5 border-b border-emerald-700 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <GuardiansIcon className="w-6 h-6 text-emerald-100" />
            <div>
              <h1 className="text-sm font-bold leading-tight">
                {guardian?.school.name ?? "Parent Portal"}
              </h1>
              <p className="text-xs text-emerald-200">Parent Portal</p>
            </div>
          </div>

          {/* Child info card */}
          {student && (
            <div className="bg-emerald-700 rounded-lg px-3 py-2 text-xs">
              <p className="font-semibold text-white">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-emerald-200">{student.admissionNo}</p>
              {classInfo && (
                <p className="text-emerald-200 mt-0.5">{classInfo}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-emerald-800"
                      : "text-emerald-100 hover:bg-emerald-700"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Guardian footer */}
        <div className="p-3 border-t border-emerald-700 flex-shrink-0">
          <p className="text-sm font-medium truncate">{guardian?.name}</p>
          <p className="text-xs text-emerald-200 truncate">{guardian?.relationship}</p>
          <p className="text-xs text-emerald-300 truncate mb-3">{guardian?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-emerald-700 py-2 text-sm hover:bg-emerald-600 transition inline-flex items-center justify-center gap-2"
          >
            <LogoutIcon className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
