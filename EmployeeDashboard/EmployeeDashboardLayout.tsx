import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Mail,
  LayoutDashboard,
  CalendarCheck,
  TrendingUp,
  Users,
  Cake,
  User,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildAuthHeaders,
  clearAuthSession,
  getAccessToken,
  getStoredRole,
  getStoredUser,
} from "@/lib/security";

const API_BASE = "http://127.0.0.1:8000";

type SuggestionEmployee = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  department_name?: string | null;
  location_name?: string | null;
};

export default function EmployeeDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = useMemo(() => getAccessToken() || "", []);
  const role = useMemo(() => getStoredRole(), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionEmployee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (role && role !== "employee") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, role, token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!token) return;

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/search?query=${encodeURIComponent(q)}&limit=6`,
          {
            headers: buildAuthHeaders(),
            signal: controller.signal,
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions((data?.employees || []) as SuggestionEmployee[]);
        setShowSuggestions(true);
      } catch {
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchQuery, token]);

  useEffect(() => {
    if (!token) return;

    const fetchCounts = async () => {
      try {
        const [nRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/notifications/unread-count`, {
            headers: buildAuthHeaders(),
          }),
          fetch(`${API_BASE}/messages/unread-count`, {
            headers: buildAuthHeaders(),
          }),
        ]);

        if (nRes.ok) {
          const n = await nRes.json();
          setUnreadNotif(Number(n?.unread || 0));
        }
        if (mRes.ok) {
          const m = await mRes.json();
          setUnreadMsgs(Number(m?.unread || 0));
        }
      } catch {
        // ignore
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setShowSuggestions(false);
    navigate(`/employee/search?q=${encodeURIComponent(q)}`);
  };

  const onPickSuggestion = (emp: SuggestionEmployee) => {
    setShowSuggestions(false);
    setSearchQuery(emp.employee_code || emp.full_name);
    navigate(`/employee/search?q=${encodeURIComponent(emp.employee_code || emp.full_name)}`);
  };

  const onLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const user = getStoredUser<{ full_name?: string; user_name?: string }>();
  const initials = (user?.full_name || user?.user_name || "E")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  const navItems = [
    { to: "/employee", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/my-leave", label: "My Leave", icon: CalendarCheck },
    { to: "/employee/my-performance", label: "My Performance", icon: TrendingUp },
    { to: "/employee/new-joiners", label: "New Joiners", icon: Users },
    { to: "/employee/birthdays", label: "Birthdays", icon: Cake },
    { to: "/employee/profile", label: "My Profile", icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col text-white bg-gradient-to-b from-[#C94A46] to-[#8C1007] dark:from-[#7f1d1d] dark:to-[#450a0a]">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold tracking-wide">PERFORM EDGE</div>
            <div className="text-xs opacity-80">Employee Portal</div>
          </div>
        </div>

        <nav className="px-3 py-2 space-y-1">
          {navItems.map((it) => {
            const active =
              location.pathname === it.to ||
              (it.to === "/employee" && location.pathname === "/employee/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-white/15"
                    : "hover:bg-white/10 text-white/90 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/10 text-white hover:bg-white/15"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 md:px-8 py-3">
            <div ref={searchBoxRef} className="relative w-full max-w-xl">
              <form onSubmit={onSearchSubmit}>
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length && setShowSuggestions(true)}
                  className="w-full rounded-xl border bg-card px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="Search employees (name, code, department...)"
                />
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s.employee_id}
                      onClick={() => onPickSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {s.full_name} <span className="text-muted-foreground">({s.employee_code})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(s.department_name || "—") + " · " + (s.location_name || "—")}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/employee/notifications")}
                className="relative h-10 w-10 rounded-xl border bg-card flex items-center justify-center hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotif > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                    {unreadNotif > 99 ? "99+" : unreadNotif}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate("/employee/messages")}
                className="relative h-10 w-10 rounded-xl border bg-card flex items-center justify-center hover:bg-muted"
                aria-label="Messages"
              >
                <Mail className="h-5 w-5" />
                {unreadMsgs > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                    {unreadMsgs > 99 ? "99+" : unreadMsgs}
                  </span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-3 pl-1">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {initials}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold">
                    {user?.full_name || user?.user_name || "Employee"}
                  </div>
                  <div className="text-xs text-muted-foreground">Employee</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6">
          <Outlet />
        </main>

        <footer className="border-t px-4 md:px-8 py-3 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Perform Edge.
        </footer>
      </div>
    </div>
  );
}
