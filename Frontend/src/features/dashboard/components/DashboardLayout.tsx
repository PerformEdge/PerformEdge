import { Home, Users, Calendar, BarChart3, FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { NavLink } from "./NavLink";

export function DashboardLayout({ children }) {
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Employee Info", path: "/dashboard/employees" },
    { icon: Calendar, label: "Attendance", path: "/dashboard/attendance" },
    { icon: BarChart3, label: "Performance", path: "/dashboard/performance" },
    { icon: FileText, label: "Contracts", path: "/dashboard/contracts" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">PerformEdge</h1>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              title="Back to landing page"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">HR Dashboard MVP</p>
        </div>

        <nav className="px-3 pb-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/90 hover:bg-muted transition-colors"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
