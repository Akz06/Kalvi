import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { SchoolIcon, DashboardIcon, StudentsIcon, LogoutIcon } from "../../components/icons";

function usePlatformAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("platform_token");
  useEffect(() => {
    if (!token) navigate("/admin/login", { replace: true });
  }, [token, navigate]);
  return !!token;
}

function logout(navigate: ReturnType<typeof useNavigate>) {
  localStorage.removeItem("platform_token");
  navigate("/admin/login", { replace: true });
}

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = usePlatformAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!authed) return null;

  const nav = [
    { label: "Dashboard", path: "/admin/dashboard", icon: <DashboardIcon className="w-5 h-5" /> },
    { label: "Schools",   path: "/admin/schools",   icon: <StudentsIcon   className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex flex-col bg-slate-900 text-white transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <SchoolIcon className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">Kalvi</p>
              <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Platform Admin</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/40 hover:text-white/80"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {collapsed
                ? <path d="M9 18l6-6-6-6" />
                : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => logout(navigate)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogoutIcon className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
