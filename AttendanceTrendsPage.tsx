"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import FilterControls from "@/components/FilterControls";
import type { ChartOptions } from "chart.js";

import "@/utils/chartSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// Color schemes for KPI cards
const kpiColorScheme = {
  employees: {
    light: { bg: "#E8F6F3", text: "#1E5047", label: "#5A8A83" },
    dark: { bg: "#0F3D38", text: "#A8D5D0", label: "#7FC3BA" },
  },
  absentee: {
    light: { bg: "#F4E4F7", text: "#552D6F", label: "#8B5BA8" },
    dark: { bg: "#2A1545", text: "#D4A5D4", label: "#B896D1" },
  },
  highest: {
    light: { bg: "#FEF5E7", text: "#7D6608", label: "#B39E0D" },
    dark: { bg: "#3E3410", text: "#F0D9A0", label: "#D4B95F" },
  },
  concern: {
    light: { bg: "#FCEAEA", text: "#7D2D2D", label: "#B85555" },
    dark: { bg: "#3E2020", text: "#F0BABA", label: "#D48585" },
  },
};

// Chart color palettes
const chartColors = {
  trendBars: [
    { light: "#EF4444", dark: "#FF6B6B" },  // Red
    { light: "#F87171", dark: "#FF8A8A" },  // Light Red
    { light: "#FB923C", dark: "#FFB366" },  // Orange
    { light: "#DC2626", dark: "#FF5252" },  // Dark Red
    { light: "#EA580C", dark: "#FF7043" },  // Dark Orange
  ],
  departmentAvg: [
    { light: "#1B86BB", dark: "#64B5F6" },  // Blue
    { light: "#4BB05C", dark: "#81C784" },  // Green
    { light: "#E6E15F", dark: "#FFD54F" },  // Yellow
    { light: "#850D4B", dark: "#EC407A" },  // Pink
  ],
  lineChart1: {
    light: "#3B82F6",
    dark: "#64B5F6",
  },
  lineChart2: {
    light: "#8B5CF6",
    dark: "#BA68C8",
  },
};

const getAxisColor = (isDark: boolean) => isDark ? "#F8FAFC" : "#475569";
const getGridColor = (isDark: boolean) => isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

export default function AttendanceTrendsPage() {
  const API_BASE = "http://localhost:8000";
  const [kpis, setKpis] = useState({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
  const [last5Days, setLast5Days] = useState<{ day: string; absent: number }[]>([]);
  const [avgByDept, setAvgByDept] = useState<{ dept: string; rate: number }[]>([]);
  const [dailyByDept, setDailyByDept] = useState<any>({ labels: [], datasets: [] });
  const [deptBreakdown, setDeptBreakdown] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const dark = isDarkMode();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        const res = await fetch(`${API_BASE}/attendance/latest-date`);
        const data = await res.json();
        if (data?.start && data?.end) {
          setStart(data.start);
          setEnd(data.end);
          return;
        }
      } catch {
      }

      const today = new Date();
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setStart(s.toISOString().split("T")[0]);
      setEnd(today.toISOString().split("T")[0]);
    };
    initializeDateRange();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!start || !end) return;
      if (start > end) {
        setErrorMessage("Start date must be before or equal to end date.");
        setLast5Days([]);
        setAvgByDept([]);
        setDailyByDept({ labels: [], datasets: [] });
        setDeptBreakdown([]);
        setKpis({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
        return;
      }
      try {
        setErrorMessage("");
        const qp = (path: string, includeDept = true, includeLoc = true) => {
          const params = new URLSearchParams();
          params.set('start', start);
          params.set('end', end);
          if (includeDept && department && department !== 'All') params.set('department', department);
          if (includeLoc && locationFilter && locationFilter !== 'All') params.set('location', locationFilter);
          return `${API_BASE}${path}?${params.toString()}`;
        };

        const [last5Res, avgRes, dailyRes, breakdownRes] = await Promise.all([
          fetch(qp('/attendance-trends/last-5-days', false, false)),
          fetch(qp('/attendance-trends/avg-by-department')),
          fetch(qp('/attendance-trends/daily-by-department')),
          fetch(qp('/attendance-trends/dept-breakdown')),
        ]);

        const [resLast5Raw, resAvgRaw, resDailyRaw, resBreakdownRaw] = await Promise.all([
          last5Res.json().catch(() => []),
          avgRes.json().catch(() => []),
          dailyRes.json().catch(() => ({ labels: [], datasets: [] })),
          breakdownRes.json().catch(() => []),
        ]);

        if (!last5Res.ok || !avgRes.ok || !dailyRes.ok || !breakdownRes.ok) {
          const detail = (resLast5Raw as any)?.detail || (resAvgRaw as any)?.detail || (resDailyRaw as any)?.detail || (resBreakdownRaw as any)?.detail;
          throw new Error(detail || "Failed to load attendance trends data.");
        }

        const resLast5 = Array.isArray(resLast5Raw) ? resLast5Raw : [];
        const resAvg = Array.isArray(resAvgRaw) ? resAvgRaw : [];
        const resDaily = (resDailyRaw && typeof resDailyRaw === "object") ? resDailyRaw : { labels: [], datasets: [] };
        const resBreakdown = Array.isArray(resBreakdownRaw) ? resBreakdownRaw : [];

        setLast5Days(resLast5 || []);
        setAvgByDept(resAvg || []);
        setDailyByDept(resDaily || { labels: [], datasets: [] });
        setDeptBreakdown(resBreakdown || []);

        // Calculate KPI values
        const totalEmps = resBreakdown.length ? resBreakdown.reduce((a, c) => a + (c.staff || 0), 0) : 0;
        const avgRate = resAvg.length ? (resAvg.reduce((a, c) => a + (c.rate || 0), 0) / resAvg.length).toFixed(1) : "0";
        const highDay = resLast5.length ? resLast5.reduce((a, c) => (c.absent > a.absent ? c : a), resLast5[0]) : null;
        const topD = resAvg.length ? resAvg.reduce((a, c) => (c.rate > a.rate ? c : a), resAvg[0]) : null;

        setKpis({
          employees: totalEmps,
          absenteeRate: parseFloat(avgRate),
          highestDay: highDay ? dayName(highDay.day) : "",
          topDept: topD?.dept || "",
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setErrorMessage(err instanceof Error ? err.message : "Failed to load attendance trends data.");
        setLast5Days([]);
        setAvgByDept([]);
        setDailyByDept({ labels: [], datasets: [] });
        setDeptBreakdown([]);
        setKpis({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
      }
    };
    fetchData();
  }, [start, end, department, locationFilter]);

  const barData = {
    labels: last5Days.map((d) => d.day),
    datasets: [
      {
        label: "Absentee %",
        data: last5Days.map((d) => d.absent),
        backgroundColor: chartColors.trendBars.map((c) => dark ? c.dark : c.light),
        borderRadius: 12,
        maxBarThickness: 56,
      },
    ],
  };

  const avgData = {
    labels: avgByDept.map((d) => d.dept),
    datasets: [
      {
        label: "Avg Absentee %",
        data: avgByDept.map((d) => d.rate),
        backgroundColor: chartColors.departmentAvg.slice(0, avgByDept.length).map((c) => dark ? c.dark : c.light),
        borderRadius: 14,
        maxBarThickness: 84,
      },
    ],
  };
  
  const AXIS_COLOR = getAxisColor(dark);
  const GRID_COLOR = getGridColor(dark);

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { grid: { display: false }, ticks: { color: AXIS_COLOR, font: { weight: "bold" } } },
      y: { beginAtZero: true, ticks: { color: AXIS_COLOR, callback: (v) => `${v}%` }, grid: { color: GRID_COLOR } },
    },
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { grid: { display: false }, ticks: { color: AXIS_COLOR } },
      y: { beginAtZero: true, ticks: { color: AXIS_COLOR }, grid: { color: GRID_COLOR } },
    },
  };

  const downloadReport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);
      if (department && department !== 'All') params.set('department', department);
      if (locationFilter && locationFilter !== 'All') params.set('location', locationFilter);
      const url = `${API_BASE}/attendance-trends/report?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to download report", res.statusText);
        return;
      }
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "attendance_trends_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Error downloading report:", err);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/10">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-2xl font-extrabold tracking-tight">Attendance Trends</div>
        <div className="flex flex-wrap gap-3 items-center">
          <FilterControls
            start={start}
            end={end}
            setStart={setStart}
            setEnd={setEnd}
            department={department}
            setDepartment={setDepartment}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Employees"
          value={kpis.employees.toString()}
          colorScheme={kpiColorScheme.employees}
          isDark={dark}
        />
        <KpiCard
          label="Avg Absentee Rate"
          value={`${kpis.absenteeRate.toFixed(1)}%`}
          colorScheme={kpiColorScheme.absentee}
          isDark={dark}
        />
        <KpiCard
          label="Highest Absentee Day"
          value={kpis.highestDay}
          colorScheme={kpiColorScheme.highest}
          isDark={dark}
        />
        <KpiCard
          label="Top Concern Dept"
          value={kpis.topDept}
          colorScheme={kpiColorScheme.concern}
          isDark={dark}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Department-wise Absentee Trend (Last 5 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
            <div className="h-[260px]">
              <Bar data={barData} options={barOptions} />
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mt-2 space-y-3">
                {last5Days.map((d, idx) => (
                  <div key={d.day} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: (barData.datasets[0].backgroundColor as string[])[idx] }} />
                      <span className="font-medium">{dayName(d.day)}</span>
                    </div>
                    <span className="text-muted-foreground">{d.absent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily Absentee Trends by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <Line data={dailyByDept} options={lineOptions} />
          </div>
            <div className="flex justify-end pt-4">
            <Button variant="outline" className="rounded-xl" onClick={downloadReport}>
              <FileText className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Average Absentee Rate by Dept</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[210px]">
            <Bar data={avgData} options={barOptions} />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Detailed Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Total Staff</th>
                  <th className="px-4 py-3 font-semibold">Mon</th>
                  <th className="px-4 py-3 font-semibold">Tue</th>
                  <th className="px-4 py-3 font-semibold">Wed</th>
                  <th className="px-4 py-3 font-semibold">Thu</th>
                  <th className="px-4 py-3 font-semibold">Fri</th>
                  <th className="px-4 py-3 font-semibold">5-Day Avg</th>
                </tr>
              </thead>
              <tbody>
                {deptBreakdown.map((r) => (
                  <tr key={r.dept} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{r.dept}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.staff || 0}</td>
                    <td className="px-4 py-3">{r.mon || 0}</td>
                    <td className="px-4 py-3">{r.tue || 0}</td>
                    <td className="px-4 py-3">{r.wed || 0}</td>
                    <td className="px-4 py-3">{r.thu || 0}</td>
                    <td className="px-4 py-3">{r.fri || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.avg || 0}</td>
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


// --- Components ---
function KpiCard({ 
  label, 
  value, 
  colorScheme,
  isDark
}: { 
  label: string; 
  value: string;
  colorScheme: { light: { bg: string; text: string; label: string }; dark: { bg: string; text: string; label: string } };
  isDark: boolean;
}) {
  const colors = isDark ? colorScheme.dark : colorScheme.light;
  return (
    <div 
      className="rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="text-xs font-semibold" style={{ color: colors.label }}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>{value}</div>
    </div>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-between rounded-full border border-border px-4 py-1 text-xs font-medium hover:bg-muted/50"
      )}
    >
      {label}
      <ChevronDown className="ml-2 h-3 w-3" />
    </button>
  );
}

function dayName(short: string) {
  const map: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };
  return map[short] || short;
}