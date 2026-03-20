import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  TrendingUp,
  Search,
  Bell,
  Mail,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { buildAuthHeaders, getAccessToken, getStoredRole, getStoredUser } from "@/lib/security";

const API_BASE = "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  return buildAuthHeaders({ "Content-Type": "application/json" });
}

type SubNavItem = {
  label: string;
  to: string;
};

const EIM_SUBNAV: SubNavItem[] = [
  { label: "Service Year Analysis", to: "/dashboard/eim/service-year-analysis" },
  { label: "Gender Analysis", to: "/dashboard/eim/gender-analysis" },
  { label: "Age Analysis", to: "/dashboard/eim/age-analysis" },
  { label: "Staff Analysis", to: "/dashboard/eim/staff-analysis" },
  { label: "Upcoming Birthdays", to: "/dashboard/eim/upcoming-birthdays" },
  { label: "Contract Type Distribution", to: "/dashboard/eim/contract-type-distribution" },
  { label: "Category Distribution", to: "/dashboard/eim/category-distribution" },
  { label: "Location-Wise Staff Distribution", to: "/dashboard/eim/location-wise-staff-distribution" },
];

const ATTENDANCE_SUBNAV: SubNavItem[] = [
  { label: "Attendance Trends", to: "/dashboard/attendance/trends" },
  { label: "Latecomers Analysis", to: "/dashboard/attendance/latecomers-analysis" },
  { label: "No-Pay Leave Percentage", to: "/dashboard/attendance/no-pay-leave-percentage" },
  { label: "Attendance by Location", to: "/dashboard/attendance/by-location" },
];

const PERFORMANCE_SUBNAV: SubNavItem[] = [
  { label: "Performance Ranking Distribution", to: "/dashboard/performance/ranking-distribution" },
  { label: "Training Needs Distribution", to: "/dashboard/performance/training-needs-distribution" },
  { label: "Appraisal Completion Status", to: "/dashboard/performance/appraisal-completion-status" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [userName, setUserName] = React.useState<string>("User");
  const [roleLabel, setRoleLabel] = React.useState<string>("Manager");

  const initials = React.useMemo(() => {
    const parts = (userName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts.length > 1 ? parts[1]?.[0] : "";
    return (first + second).toUpperCase();
  }, [userName]);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Basic auth guard (keeps dashboard from opening without login)
    const token = getAccessToken();
    if (!token) {
      navigate("/login");
      return;
    }

    // Optional role guard (prevents employees opening HR dashboard)
    const role = getStoredRole();
    if (role === "employee") {
      toast.error("Access denied: this account is not a Manager. Redirecting to the Employee dashboard.");
      navigate("/employee");
    }
  }, [navigate]);

  React.useEffect(() => {
    const parsed = getStoredUser<{ user_name?: string }>();
    if (parsed?.user_name) setUserName(parsed.user_name);
    const r = getStoredRole() || "manager";
    setRoleLabel(r === "employee" ? "Employee" : "Manager");
  }, []);

  // Keep the top search bar in sync with the search page query param
  React.useEffect(() => {
    if (!location.pathname.startsWith("/dashboard/search")) return;
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location.pathname, location.search]);

  // Fetch unread counts for notification + message icons
  React.useEffect(() => {
    const controller = new AbortController();

    async function loadCounts() {
      try {
        const [nRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/notifications/unread-count`, {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/messages/unread-count`, {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }),
        ]);

        if (nRes.ok) {
          const j = await nRes.json();
          setUnreadNotifications(Number(j.count || 0));
        }
        if (mRes.ok) {
          const j = await mRes.json();
          setUnreadMessages(Number(j.count || 0));
        }
      } catch {
        // Silent (UI still works)
      }
    }

    loadCounts();
    return () => controller.abort();
  }, []);

  // Search suggestions (debounced)
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(q)}&limit=5`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const j = await res.json();
        setSuggestions(j.employees || []);
      } catch {
        // Silent
      }
    }, 250);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [searchQuery]);

  const path = location.pathname;
  const isEim = path.startsWith("/dashboard/eim");
  const isAttendance = path.startsWith("/dashboard/attendance");
  const isPerformance = path.startsWith("/dashboard/performance");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "sticky top-0 h-screen shrink-0 border-r border-border",
            // A slightly more polished sidebar in both themes
            "bg-gradient-to-b from-[#C94A46] to-[#8C1007] text-white",
            "dark:from-[#7f1d1d] dark:to-[#450a0a]",
            sidebarOpen ? "w-64" : "w-[76px]"
          )}
        >
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/15">
            <div
              className={cn(
                "font-extrabold tracking-tight",
                !sidebarOpen && "hidden"
              )}
            >
              PERFORM EDGE
            </div>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="h-10 w-10 rounded-xl hover:bg-white/10 grid place-items-center"
              aria-label="Toggle sidebar"
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 py-4">
            <SideLink
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              sidebarOpen={sidebarOpen}
              end
            />

            {/* Main sections */}
            <div
              className={cn(
                "mt-6 px-3 text-xs font-bold uppercase tracking-wide text-white/75",
                !sidebarOpen && "hidden"
              )}
            >
              Modules
            </div>

            <div className="mt-2 space-y-1">
              <SideLink
                to="/dashboard/eim"
                icon={Users}
                label="EIM"
                sidebarOpen={sidebarOpen}
              />
              {isEim ? (
                <SubNav items={EIM_SUBNAV} sidebarOpen={sidebarOpen} />
              ) : null}

              <SideLink
                to="/dashboard/attendance"
                icon={CalendarDays}
                label="Attendance"
                sidebarOpen={sidebarOpen}
              />
              {isAttendance ? (
                <SubNav items={ATTENDANCE_SUBNAV} sidebarOpen={sidebarOpen} />
              ) : null}

              <SideLink
                to="/dashboard/performance"
                icon={TrendingUp}
                label="Performance"
                sidebarOpen={sidebarOpen}
              />
              {isPerformance ? (
                <SubNav items={PERFORMANCE_SUBNAV} sidebarOpen={sidebarOpen} />
              ) : null}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* TOP BAR */}
          <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur">
            <div className="h-full px-5 flex items-center gap-4">
              <div className="flex-1">
                <form
                  className="relative max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = searchQuery.trim();
                    if (!q) return;
                    navigate(`/dashboard/search?q=${encodeURIComponent(q)}`);
                    setShowSuggestions(false);
                  }}
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Search anything..."
                    className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[46px] z-50 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
                      <div className="max-h-[260px] overflow-auto py-2">
                        {suggestions.map((s: any) => (
                          <button
                            key={s.employee_id || s.email || s.name}
                            type="button"
                            onMouseDown={() => {
                              // Use mouse down to beat the input blur
                              const q = (s.name || s.email || "").toString();
                              setSearchQuery(q);
                              navigate(`/dashboard/search?q=${encodeURIComponent(q)}`);
                              setShowSuggestions(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2 text-left text-sm hover:bg-muted",
                              "flex items-center justify-between gap-3",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{s.name || "-"}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {s.department || "-"}{s.location ? ` • ${s.location}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs text-muted-foreground">{s.employee_code || ""}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <button
                className="relative h-10 w-10 rounded-full border border-border grid place-items-center hover:bg-muted"
                type="button"
                onClick={() => navigate("/dashboard/notifications")}
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>
              <button
                className="relative h-10 w-10 rounded-full border border-border grid place-items-center hover:bg-muted"
                type="button"
                onClick={() => navigate("/dashboard/messages")}
              >
                <Mail className="h-5 w-5 text-muted-foreground" />
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/profile")}
                className="flex items-center gap-3 pl-2 hover:opacity-90"
                aria-label="Open profile"
              >
                <div className="h-10 w-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <div className="text-sm font-bold">{userName}</div>
                  <div className="text-xs text-muted-foreground">{roleLabel}</div>
                </div>
              </button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="p-6 flex-1">
            <Outlet />
          </main>

          {/* FOOTER */}
          <footer className="px-6 py-4 text-xs text-muted-foreground border-t border-border">
            © {new Date().getFullYear()} Perform Edge.
          </footer>
        </div>
      </div>
    </div>
  );
}

type SideLinkProps = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sidebarOpen: boolean;
  end?: boolean;
};

function SideLink({ to, icon: Icon, label, sidebarOpen, end }: SideLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
          "hover:bg-white/10",
          isActive ? "bg-white/15 ring-1 ring-white/20" : "",
          !sidebarOpen ? "justify-center" : ""
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className={cn(!sidebarOpen && "hidden")}>{label}</span>
    </NavLink>
  );
}

type SubNavProps = {
  items: SubNavItem[];
  sidebarOpen: boolean;
};

function SubNav({ items, sidebarOpen }: SubNavProps) {
  return (
    <div
      className={cn(
        "ml-1 mt-1 space-y-1 border-l border-white/20 pl-3",
        !sidebarOpen && "hidden"
      )}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "block rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10",
              isActive ? "bg-white/15" : ""
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
