import { useEffect, useState } from "react";
import axios from "axios";
import { Pie, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { Users, UserPlus, UserX, Clock } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import "@/utils/chartSetup";
import { applyChartTheme } from "../../utils/chartTheme";
import { toast } from "@/components/ui/sonner";

/* ---------- TYPES ---------- */

interface ChartItem {
  label: string;
  value: number;
}

interface EmployeePerformance {
  name: string;
  role: string;
  score: number;
}

interface DashboardResponse {
  cards: {
    total_employee: number;
    new_employee: number;
    on_leave: number;
    over_time: number;
  };
  charts: {
    gender: ChartItem[];
    age: ChartItem[];
    employee_type: ChartItem[];
    attendance: {
      present: number;
      absent: number;
    };
  };
  employee_performance: EmployeePerformance[];
}

/* ---------- API ---------- */

const API_URL = "http://localhost:8000/dashboard/overview";

/* ---------- COMPONENT ---------- */

export default function Overview() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to the last 12 months so demo data (2024/2025) still appears
  // even when the current year is ahead of the seeded SQL.
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleStartDateChange = (value: string) => {
    if (value && endDate && value > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    if (value && startDate && value < startDate) {
      toast.error("End date cannot be before start date");
      return;
    }
    setEndDate(value);
  };

  /* ---------- DARK MODE (REACTIVE) ---------- */
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    applyChartTheme(isDark ? "dark" : "light");
  }, [isDark]);

  /* ---------- FETCH DATA ---------- */
  useEffect(() => {
    if (startDate > endDate) {
      setData(null);
      setLoading(false);
      toast.error("Start date cannot be after end date");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("access_token");
    axios
      .get<DashboardResponse>(API_URL, {
        params: { start: startDate, end: endDate },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then((res) => setData(res.data))
      .catch((error) => {
        console.error(error);
        setData(null);
        const message =
          error?.response?.data?.detail ||
          "Failed to load dashboard overview";
        toast.error(String(message));
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-red-500">No data available</div>;

  /* ---------- COLORS ---------- */
  const axisColor = isDark ? "#E5E7EB" : "#374151";
  const gridColor = isDark ? "#374151" : "#E5E7EB";

  /* ---------- CHART DATA ---------- */

  const genderColors: Record<string, string> = {
    Female: "#EC4899",
    Male: "#3B82F6",
    
  };

  const genderChart = {
    labels: data.charts.gender.map(g => g.label),
    datasets: [
      {
        data: data.charts.gender.map(g => g.value),
        backgroundColor: data.charts.gender.map(
          g => genderColors[g.label] ?? "#9CA3AF"
        ),
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const ageChart = {
    labels: data.charts.age.map(a => a.label),
    datasets: [
      {
        data: data.charts.age.map(a => a.value),
        backgroundColor: ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
        borderRadius: 12,
        barThickness: 56,
      },
    ],
  };

  const employeeTypeChart = {
    labels: data.charts.employee_type.map(e => e.label),
    datasets: [
      {
        data: data.charts.employee_type.map(e => e.value),
        backgroundColor: ["#4C7CF0", "#F39C12", "#D85AA6"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const attendanceChart = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [
          data.charts.attendance.present,
          data.charts.attendance.absent,
        ],
        backgroundColor: ["#22C55E", "#EF4444"],
        borderRadius: 12,
        barThickness: 56,
      },
    ],
  };

  /* ---------- OPTIONS ---------- */

  const donutOptions: ChartOptions<"pie"> = {
    responsive: true,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: axisColor,
          font: { weight: "bold" },
        },
      },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: axisColor, font: { weight: "bold" } },
      },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
    },
  };

  /* ---------- UI ---------- */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="rounded-full px-4 py-2 border bg-background dark:[color-scheme:dark]"

          />
          <span className="text-sm font-semibold text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="rounded-full px-4 py-2 border bg-background dark:[color-scheme:dark]"
          />
        </div>
      </div>

      {/* KPI */}
      <div className="grid md:grid-cols-4 gap-5">
        <Kpi tone="sand" icon={Users} value={data.cards.total_employee} label="Total Employee" />
        <Kpi tone="sky" icon={UserPlus} value={data.cards.new_employee} label="New Employee" />
        <Kpi tone="lemon" icon={UserX} value={data.cards.on_leave} label="On Leave" />
        <Kpi tone="rose" icon={Clock} value={data.cards.over_time} label="Over Time" />
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Gender Analysis">
          <Pie data={genderChart} options={donutOptions} />
        </Card>

        <Card title="Age Analysis">
          <div className="h-[260px]">
            <Bar data={ageChart} options={barOptions} />
          </div>
        </Card>

        <Card title="Employee Type">
          <Pie data={employeeTypeChart} options={donutOptions} />
        </Card>
      </div>

      {/* BOTTOM */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Calendar">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            fromYear={2015}
            toYear={2035}
          />
        </Card>

        <Card title="Attendance Rate">
          <div className="h-[260px]">
            <Bar data={attendanceChart} options={barOptions} />
          </div>
        </Card>

        <Card title="Employee Performance">
          {data.employee_performance.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data for the selected date range.</div>
          ) : (
            data.employee_performance.map((e, i) => {
              const parts = (e.name || "").trim().split(/\s+/).filter(Boolean);
              const initials = ((parts[0]?.[0] || "U") + (parts[1]?.[0] || "")).toUpperCase();

              return (
                <div key={i} className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.role}</div>
                    </div>
                  </div>
                  <ScoreRing value={e.score} />
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function Kpi({ icon: Icon, value, label, tone }: any) {
  const styles =
    tone === "sand"
      ? { wrapper: "bg-amber-50/70", icon: "bg-amber-500" }
      : tone === "sky"
      ? { wrapper: "bg-blue-50/70", icon: "bg-blue-500" }
      : tone === "lemon"
      ? { wrapper: "bg-yellow-50/70", icon: "bg-yellow-500" }
      : { wrapper: "bg-rose-50/70", icon: "bg-rose-500" };

  return (
    <div className={`rounded-2xl p-5 shadow-sm border border-border ${styles.wrapper}`}>
      <div className={`h-11 w-11 rounded-full grid place-items-center ${styles.icon}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="mt-3 text-3xl font-extrabold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const color = value >= 70 ? "#22C55E" : value >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div
      className="grid place-items-center rounded-full"
      style={{
        width: 44,
        height: 44,
        background: `conic-gradient(${color} ${value * 3.6}deg, #E5E7EB 0deg)`,
      }}
    >
      <div className="bg-background rounded-full w-8 h-8 grid place-items-center text-xs font-bold">
        {value}%
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
