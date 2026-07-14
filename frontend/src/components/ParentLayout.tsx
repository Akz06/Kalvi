import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useParentAuth } from "../context/ParentAuthContext";

const links = [
  { to: "/parent/dashboard", label: "🏠 Overview", end: true },
  { to: "/parent/attendance", label: "📅 Attendance" },
  { to: "/parent/fees", label: "💰 Fees" },
  { to: "/parent/exams", label: "📝 Exams & Grades" },
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
            <span className="text-2xl">👨‍👩‍👧</span>
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
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-emerald-800"
                    : "text-emerald-100 hover:bg-emerald-700"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Guardian footer */}
        <div className="p-3 border-t border-emerald-700 flex-shrink-0">
          <p className="text-sm font-medium truncate">{guardian?.name}</p>
          <p className="text-xs text-emerald-200 truncate">{guardian?.relationship}</p>
          <p className="text-xs text-emerald-300 truncate mb-3">{guardian?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-emerald-700 py-2 text-sm hover:bg-emerald-600 transition"
          >
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
