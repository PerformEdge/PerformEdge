import { useEffect, useState } from "react";
import { Download, ChevronDown, AlertTriangle, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { cn } from "@/lib/utils";

import "@/utils/chartSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FilterControls from "@/components/FilterControls";
import { apiUrl } from "@/lib/api";

// Use explicit backend base to avoid Vite returning index.html in dev
const API_BASE = apiUrl("/latecomers");

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// KPI Color Schemes
const kpiColorSchemes = {
  today: {
    light: { bg: "#E8F6F3", text: "#1E5047", label: "#5A8A83" },
    dark: { bg: "#0F3D38", text: "#A8D5D0", label: "#7FC3BA" },
  },
  avgMinutes: {
    light: { bg: "#F4E4F7", text: "#552D6F", label: "#8B5BA8" },
    dark: { bg: "#2A1545", text: "#D4A5D4", label: "#B896D1" },
  },
  institution: {
    light: { bg: "#FEF5E7", text: "#7D6608", label: "#B39E0D" },
    dark: { bg: "#3E3410", text: "#F0D9A0", label: "#D4B95F" },
  },
  highest: {
    light: { bg: "#FCEAEA", text: "#7D2D2D", label: "#B85555" },
    dark: { bg: "#3E2020", text: "#F0BABA", label: "#D48585" },
  },
};

// Chart Colors
const chartColors = {
  doughnut: [
    { light: "#4CAF50", dark: "#66BB6A" },     // Green
    { light: "#F5A623", dark: "#FFB74D" },     // Orange
    { light: "#4A7AFF", dark: "#64B5F6" },     // Blue
    { light: "#8B5CF6", dark: "#BA68C8" },     // Purple
    { light: "#EC4899", dark: "#F48FB1" },     // Pink
    { light: "#22C55E", dark: "#81C784" },     // Green
  ],
  barDept: [
    { light: "#EC4899", dark: "#F48FB1" },     // Pink
    { light: "#22C55E", dark: "#81C784" },     // Green
    { light: "#6EE7B7", dark: "#80DEEA" },     // Teal
    { light: "#8B5CF6", dark: "#BA68C8" },     // Purple
    { light: "#F59E0B", dark: "#FFB74D" },     // Amber
    { light: "#4F46E5", dark: "#64B5F6" },     // Blue
  ],
};

const getAxisColor = (isDark: boolean) => isDark ? "#F8FAFC" : "#475569";
const getGridColor = (isDark: boolean) => isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

export default function LatecomersAnalysisPage() {
  /* ---------------- STATES ---------------- */
  const [summary, setSummary] = useState({ total_late: 0, avg_minutes: 0 });
  const [weekLate, setWeekLate] = useState<Array<{ day: string; value: number }>>([]);
  const [deptData, setDeptData] = useState<
    Array<{ department_name: string; late_count: number; total_staff: number; rate: number; avg_minutes: number }>
  >([]);
  const [errorMessage, setErrorMessage] = useState("");
  const dark = isDarkMode();
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        const res = await fetch(apiUrl("/attendance/latest-date?default_days=7"));
        const data = await res.json();
        if (data?.start && data?.end) {
          setStartDate(data.start);
          setEndDate(data.end);
          return;
        }
      } catch {
      }

      const d = new Date();
      const s = new Date(d);
      s.setDate(s.getDate() - 6);
      setStartDate(s.toISOString().split("T")[0]);
      setEndDate(d.toISOString().split("T")[0]);
    };
    initializeDateRange();
  }, []);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;
      if (startDate > endDate) {
        setErrorMessage("Start date must be before or equal to end date.");
        setSummary({ total_late: 0, avg_minutes: 0 });
        setWeekLate([]);
        setDeptData([]);
        return;
      }
      const end = endDate;
      const startStr = startDate;

      try {
        setErrorMessage("");
        // summary
        const summaryRes = await fetch(`${API_BASE}/summary?start=${startStr}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
        if (!summaryRes.ok) throw new Error(`Summary fetch failed: ${summaryRes.status}`);
        const summaryData = await summaryRes.json();
        setSummary({
          total_late: Number(summaryData.total_late || 0),
          avg_minutes: Number(summaryData.avg_minutes || 0),
        });

        // 7-day trend
        const trendRes = await fetch(`${API_BASE}/7day-trend?start=${startStr}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
        if (!trendRes.ok) throw new Error(`Trend fetch failed: ${trendRes.status}`);
        const trendData = await trendRes.json();
        setWeekLate(Array.isArray(trendData) ? trendData.map((d: any) => ({ day: d.day, value: Number(d.value || 0) })) : []);

        // department data
        const deptRes = await fetch(`${API_BASE}/by-department?start=${startStr}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
        if (!deptRes.ok) throw new Error(`Dept fetch failed: ${deptRes.status}`);
        const deptJson = await deptRes.json();
        if (Array.isArray(deptJson)) {
          // Deduplicate by department_name in case backend returns multiple rows
          const agg = new Map();
          for (const d of deptJson) {
            const name = (d.department_name || '').toString().trim() || '-';
            const late = Number(d.late_count || 0);
            const staff = Number(d.total_staff || 0);
            const avgMin = Number(d.avg_minutes || 0);
            if (!agg.has(name)) {
              agg.set(name, { department_name: name, late_count: late, total_staff: staff, avg_minutes: avgMin, rows: 1 });
            } else {
              const cur = agg.get(name);
              cur.late_count += late;
              cur.total_staff += staff;
              cur.avg_minutes += avgMin;
              cur.rows += 1;
              agg.set(name, cur);
            }
          }

          const normalized = [];
          for (const v of agg.values()) {
            const rate = v.total_staff ? (v.late_count / v.total_staff) * 100 : 0;
            const avg_minutes = v.rows ? Math.round(v.avg_minutes / v.rows) : 0;
            normalized.push({
              department_name: v.department_name,
              late_count: Number(v.late_count || 0),
              total_staff: Number(v.total_staff || 0),
              rate: Number(rate.toFixed(1)),
              avg_minutes: Number(avg_minutes || 0),
            });
          }

          // sort by rate desc to keep previous behavior
          normalized.sort((a, b) => b.rate - a.rate);
          setDeptData(normalized);
        } else {
          setDeptData([]);
        }
      } catch (err) {
        // log errors for debugging and keep UI stable
        // eslint-disable-next-line no-console
        console.error("Latecomers fetch error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Failed to fetch latecomers data.");
        setSummary({ total_late: 0, avg_minutes: 0 });
        setWeekLate([]);
        setDeptData([]);
      }
    };
    fetchData();
  }, [startDate, endDate, department, locationFilter]);

  /* ---------------- KPI DATA ---------------- */
  const kpis = [
    { 
      label: "Total Late Today", 
      value: summary.total_late, 
      colorScheme: kpiColorSchemes.today,
      icon: TrendingUp,
    },
    { 
      label: "Avg Minutes Late", 
      value: summary.avg_minutes, 
      colorScheme: kpiColorSchemes.avgMinutes,
      icon: Clock,
    },
    {
      label: "Institution Late %",
      value: deptData.length ? `${(deptData.reduce((a, d) => a + d.late_count, 0) / deptData.reduce((a, d) => a + d.total_staff, 1) * 100).toFixed(1)}%` : "0%",
      colorScheme: kpiColorSchemes.institution,
      icon: AlertCircle,
    },
    {
      label: "Highest Department",
      value: deptData.length
        ? deptData.reduce((prev, curr) => (curr.rate > prev.rate ? curr : prev)).department_name
        : "-",
      colorScheme: kpiColorSchemes.highest,
      icon: AlertTriangle,
    },
  ];

  /* ---------------- PIE ---------------- */
  const donutData = {
    labels: deptData.map((d) => d.department_name),
    datasets: [
      {
        data: deptData.map((d) => d.rate),
        backgroundColor: chartColors.doughnut.slice(0, deptData.length).map((c) => dark ? c.dark : c.light),
        borderWidth: 0,
      },
    ],
  };

  /* ---------------- BAR ---------------- */
  const lateByDeptData = {
    labels: deptData.map((d) => d.department_name),
    datasets: [
      {
        data: deptData.map((d) => d.rate),
        backgroundColor: chartColors.barDept.slice(0, deptData.length).map((c) => dark ? c.dark : c.light),
        borderRadius: 10,
        barThickness: 22,
      },
    ],
  };

  const AXIS_COLOR = getAxisColor(dark);
  const GRID_COLOR = getGridColor(dark);

  const barOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: {
          color: AXIS_COLOR,
          callback: (v) => `${v}%`,
        },
        grid: { color: GRID_COLOR, display: false },
      },
      y: {
        ticks: {
          color: AXIS_COLOR,
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6 p-6">
      {errorMessage ? (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/10">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-extrabold">Latecomers Analysis</h1>
        <div className="flex gap-3 items-center">
          <FilterControls
            start={startDate}
            end={endDate}
            setStart={setStartDate}
            setEnd={setEndDate}
            department={department}
            setDepartment={setDepartment}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
          />
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard 
            key={k.label}
            label={k.label}
            value={k.value.toString()}
            colorScheme={k.colorScheme}
            isDark={dark}
            Icon={k.icon}
          />
        ))}
      </div>

      {/* 7 DAY TREND */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Late Arrival Trends</CardTitle>
          <p className="text-xs text-muted-foreground">Track late arrivals across the week</p>
        </CardHeader>
        <CardContent className="grid grid-cols-7 gap-3">
          {weekLate.map((d, idx) => (
            <div 
              key={d.day}
              className={cn(
                "rounded-xl border p-4 text-center transition-all hover:shadow-md",
                dark 
                  ? "border-border/50 bg-muted/40 hover:bg-muted/60" 
                  : "border-border/30 bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "text-xs font-semibold",
                dark ? "text-muted-foreground" : "text-muted-foreground"
              )}>
                {d.day}
              </div>
              <div className={cn(
                "mt-1 text-lg font-bold",
                dark ? "text-foreground" : "text-foreground"
              )}>
                {d.value}
              </div>
              <div className="text-[10px] text-muted-foreground">late arrivals</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PIE + BAR */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Late Arrival Percentage (Department Wise)</CardTitle>
          </CardHeader>
          <CardContent className="relative flex items-center gap-6 min-h-[240px]">
            <div className="h-[220px] w-[220px]">
              <Doughnut data={donutData} />
            </div>
            <div className="space-y-2 text-sm">
              {donutData.labels.map((l, i) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: donutData.datasets[0].backgroundColor[i] as string }} />
                  <span className="flex-1">{l}</span>
                  <span>{donutData.datasets[0].data[i]}%</span>
                </div>
              ))}
            </div>
            <div className="absolute right-4 bottom-4">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/report`);
                    if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
                    const blob = await res.blob();
                    const cd = res.headers.get("content-disposition") || "";
                    const match = cd.match(/filename=([^;]+)/);
                    const filename = match ? match[1].replace(/\"/g, "") : "late_arrival_department_report.pdf";
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Download error:', err);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Late % by Department</CardTitle>
            <p className="text-xs text-muted-foreground">Departments ranked by late arrival</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            <Bar data={lateByDeptData} options={barOptions} />
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "overflow-x-auto rounded-2xl border border-border",
            dark ? "bg-muted/10" : "bg-muted/5"
          )}>
            <table className="w-full text-sm">
              <thead className={cn(
                "text-xs font-semibold sticky top-0",
                dark 
                  ? "bg-muted/30 text-muted-foreground border-b border-border" 
                  : "bg-muted/40 text-muted-foreground border-b border-border"
              )}>
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-center">Total Staff</th>
                  <th className="px-4 py-3 text-center">Late Count</th>
                  <th className="px-4 py-3 text-center">Late %</th>
                  <th className="px-4 py-3 text-center">Avg Minutes Late</th>
                </tr>
              </thead>
              <tbody>
                {deptData.map((r) => (
                  <tr 
                    key={r.department_name} 
                    className={cn(
                      "border-t border-border transition-colors hover:bg-muted/50",
                      dark ? "hover:bg-muted/40" : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{r.department_name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{r.total_staff}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.late_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold",
                        dark
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-orange-100 text-orange-700"
                      )}>
                        {r.rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{r.avg_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */
function KpiCard({ 
  label, 
  value, 
  colorScheme,
  isDark,
  Icon,
}: { 
  label: string; 
  value: string;
  colorScheme: { light: { bg: string; text: string; label: string }; dark: { bg: string; text: string; label: string } };
  isDark: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  const colors = isDark ? colorScheme.dark : colorScheme.light;
  return (
    <div 
      className="rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold" style={{ color: colors.label }}>{label}</div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>{value}</div>
        </div>
        {Icon && (
          <span style={{ color: colors.label, opacity: 0.4 }}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

function Filter({ label }: { label: string }) {
  return (
    <button className={cn(
      "flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold",
      "bg-background hover:bg-muted transition-colors"
    )}>
      {label}
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}