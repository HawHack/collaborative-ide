import { Code2, LogOut, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { initials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
              <Code2 size={20} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-300">Collaborative IDE</div>
              <div className="text-xs text-slate-500">
                {location.pathname.startsWith("/projects/") ? "Project room" : "Workspace dashboard"}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 md:inline-flex">
            <Sparkles size={14} className="text-indigo-300" />
            AI review ready
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:flex">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: user.avatar_color }}
              >
                {initials(user.full_name)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{user.full_name}</div>
                <div className="text-xs text-slate-400">{user.email}</div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}