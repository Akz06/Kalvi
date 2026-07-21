import { useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  DashboardIcon, SchoolIcon, LogoutIcon, ActivityIcon,
  AnnouncementIcon, KeyIcon, FlagIcon,
} from "../../components/icons";

function usePlatformAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("platform_token");

  useEffect(() => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    // Verify token is still valid by decoding expiry locally
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired — clear and redirect
        localStorage.removeItem("platform_token");
        navigate("/admin/login", { replace: true });
      }
    } catch {
      // Malformed token — clear and redirect
      localStorage.removeItem("platform_token");
      navigate("/admin/login", { replace: true });
    }
  }, [token, navigate]);

  return !!token;
}

const NAV = [
  { label: "Dashboard",    path: "/admin/dashboard",      icon: DashboardIcon },
  { label: "Schools",      path: "/admin/schools",        icon: SchoolIcon },
  { label: "Announcements",path: "/admin/announcements",  icon: AnnouncementIcon },
  { label: "Activity Log", path: "/admin/logs",           icon: ActivityIcon },
];

export default function PlatformLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const authed    = usePlatformAuth();

  if (!authed) return null;

  function logout() {
    localStorage.removeItem("platform_token");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <SchoolIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight tracking-tight">Kalvi</p>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-medium">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + "/");
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-slate-500 font-medium">Logged in as</p>
            <p className="text-xs text-slate-300 font-semibold truncate">Platform Admin</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogoutIcon className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
