import { ChevronDown, Clock, Timer, UserCheck, UserX } from "lucide-react";
import type { ComponentType } from "react";
import React, { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import "@/utils/chartSetup";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
const API_BASE = "http://localhost:8000";
import FilterControls from "@/components/FilterControls";

const kpiIcons = { present: UserCheck, late: Clock, on_leave: UserX, overtime: Timer };

// Color scheme for KPI cards and charts
const colorScheme = {
  present: {
    light: { bg: "#E8F6F3", text: "#1E5047", icon: "#27AE60" },
    dark: { bg: "#0F3D38", text: "#A8D5D0", icon: "#27AE60" },
  },
  late: {
    light: { bg: "#F4E4F7", text: "#552D6F", icon: "#9B59B6" },
    dark: { bg: "#2A1545", text: "#D4A5D4", icon: "#BB86FC" },
  },
  on_leave: {
    light: { bg: "#FEF5E7", text: "#7D6608", icon: "#F39C12" },
    dark: { bg: "#3E3410", text: "#F0D9A0", icon: "#FDB750" },
  },
  overtime: {
    light: { bg: "#FADBD8", text: "#78281F", icon: "#E74C3C" },
    dark: { bg: "#3E2420", text: "#F5B7B1", icon: "#FF6B6B" },
  },
};

// Chart colors for doughnut and bar charts
const chartColors = [
  { light: "#27AE60", dark: "#27AE60" },     // Green
  { light: "#9B59B6", dark: "#BB86FC" },     // Purple
  { light: "#3498DB", dark: "#64B5F6" },     // Blue
  { light: "#F39C12", dark: "#FDB750" },     // Orange
  { light: "#E74C3C", dark: "#FF6B6B" },     // Red
];

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export default function AttendancePage() {
  const [kpis, setKpis] = useState({ present: 0, late: 0, on_leave: 0, overtime: 0 });
  const [lateArrival, setLateArrival] = useState([]);
  const [noPay, setNoPay] = useState([]);
  const [absenteeByDay, setAbsenteeByDay] = useState([]);
  const [locations, setLocations] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [downloading, setDownloading] = useState(false);
  const dark = isDarkMode();

  const resetData = () => {
    setKpis({ present: 0, late: 0, on_leave: 0, overtime: 0 });
    setLateArrival([]);
    setNoPay([]);
    setAbsenteeByDay([]);
    setLocations([]);
  };

  useEffect(() => {
    async function initializeDateRange() {
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
      s.setDate(s.getDate() - 5);
      setStart(s.toISOString().split("T")[0]);
      setEnd(today.toISOString().split("T")[0]);
    }
    initializeDateRange();
  }, []);

  // refetch when filters change
  useEffect(() => {
    async function refetch() {
      if (!start || !end) return;
      if (start > end) {
        setErrorMessage("Start date must be before or equal to end date.");
        resetData();
        return;
      }

      try {
        setErrorMessage("");
        const res = await fetch(`${API_BASE}/attendance/summary?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load attendance data.");
        }

        const kpiData = data?.kpis || {};
        setKpis({
          present: Number(kpiData.present || 0),
          late: Number(kpiData.late || 0),
          on_leave: Number(kpiData.on_leave || 0),
          overtime: Number(kpiData.overtime || 0),
        });

        const lateRows = Array.isArray(data?.late) ? data.late : [];
        setLateArrival(lateRows.map((d, i) => ({ name: d.department_name, value: d.late_count, color: dark ? chartColors[i % chartColors.length].dark : chartColors[i % chartColors.length].light })));

        const noPayRows = Array.isArray(data?.no_pay) ? data.no_pay : [];
        setNoPay(noPayRows.map((d, i) => ({ name: d.department_name, value: d.no_pay_count, color: dark ? chartColors[i % chartColors.length].dark : chartColors[i % chartColors.length].light })));

        const absenteeRows = Array.isArray(data?.absentee) ? data.absentee : [];
        setAbsenteeByDay(absenteeRows.map((d, i) => {
          const parsedDate = new Date(d.day);
          const day = Number.isNaN(parsedDate.getTime())
            ? String(d.day || "-")
            : parsedDate.toLocaleDateString("en-US", { weekday: "short" });
          return { day, value: d.absent_count, color: dark ? chartColors[i % chartColors.length].dark : chartColors[i % chartColors.length].light };
        }));

        const locationRows = Array.isArray(data?.locations) ? data.locations : [];
        setLocations(locationRows.map((l) => ({ name: l.location_name, present: l.present, absent: l.absent })));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load attendance data.");
        resetData();
      }
    }
    refetch();
  }, [start, end, department, locationFilter, dark]);

  const doughnutOptions: ChartOptions<"doughnut"> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, cutout: "65%" };
  const barOptions: ChartOptions<"bar"> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } };

  const lateChart = { labels: lateArrival.map((d) => d.name), datasets: [{ label: "% Late Comers", data: lateArrival.map((d) => d.value), backgroundColor: lateArrival.map((d) => d.color), borderWidth: 0 }] };
  const noPayChart = { labels: noPay.map((d) => d.name), datasets: [{ label: "% No Pay", data: noPay.map((d) => d.value), backgroundColor: noPay.map((d) => d.color), borderWidth: 0 }] };
  const absenteeChart = { labels: absenteeByDay.map((d) => d.day), datasets: [{ label: "Absentee Count", data: absenteeByDay.map((d) => d.value), backgroundColor: absenteeByDay.map((d) => d.color), borderRadius: 10 }] };

  const downloadReport = async () => {
    if (!start || !end) return;
    if (start > end) {
      setErrorMessage("Start date must be before or equal to end date.");
      return;
    }

    try {
      setDownloading(true);
      const params = new URLSearchParams();
      params.set("start", start);
      params.set("end", end);
      if (department) params.set("department", department);
      if (locationFilter) params.set("location", locationFilter);

      const res = await fetch(`${API_BASE}/attendance/report?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance_summary_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to download report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-3xl font-extrabold">Attendance Wise</div>
          <div className="text-sm text-muted-foreground">Attendance trends, latecomers, no-pay, and location counts.</div>
        </div>
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

      {/* KPI */}
      {errorMessage ? (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/10">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(kpis).map(([key, value]) => (
          <KpiCard 
            key={key} 
            icon={kpiIcons[key]} 
            value={value.toString()} 
            label={key.replace("_", " ")}
            colorScheme={colorScheme[key]}
            isDark={dark}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>% of Late Comers (Department Wise)</CardTitle></CardHeader>
          <CardContent><div className="h-[320px]"><Doughnut data={lateChart} options={doughnutOptions} /></div></CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle>No Pay % (Department Wise)</CardTitle></CardHeader>
          <CardContent><div className="h-[320px]"><Doughnut data={noPayChart} options={doughnutOptions} /></div></CardContent>
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader><CardTitle>Absentees Over Last Five Days</CardTitle></CardHeader>
          <CardContent><div className="h-[320px]"><Bar data={absenteeChart} options={barOptions} /></div></CardContent>
        </Card>
      </div>

      {/* Locations */}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Attendance by Location</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">{locations.slice(0,3).map((loc) => <LocationCard key={loc.name} {...loc} />)}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{locations.slice(3,5).map((loc) => <LocationCard key={loc.name} {...loc} />)}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{locations.slice(5).map((loc) => <LocationCard key={loc.name} {...loc} />)}</div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" className="rounded-xl" onClick={downloadReport} disabled={downloading}>
              {downloading ? "Preparing..." : "Download Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Components remain the same
function KpiCard({ 
  icon: Icon, 
  value, 
  label,
  colorScheme,
  isDark
}: { 
  icon: ComponentType<{ className?: string }>; 
  value: string; 
  label: string;
  colorScheme: { light: { bg: string; text: string; icon: string }; dark: { bg: string; text: string; icon: string } };
  isDark: boolean;
}) { 
  const colors = isDark ? colorScheme.dark : colorScheme.light;
  return (
    <div 
      className="rounded-2xl border border-border p-6 shadow-sm transition-all hover:shadow-md"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-extrabold" style={{ color: colors.text }}>{value}</div>
          <div className="text-sm font-semibold" style={{ color: colors.text, opacity: 0.7 }}>{label}</div>
        </div>
        <span style={{ color: colors.icon }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function LocationCard({ name, present, absent }: { name: string; present: number; absent: number }) { 
  const dark = isDarkMode();
  return (
    <div className={cn(
      "rounded-2xl border border-border p-4 transition-all hover:shadow-md",
      dark ? "bg-muted/30" : "bg-muted/20"
    )}>
      <div className={cn("font-bold text-base", dark ? "text-foreground" : "text-foreground")}>{name}</div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Present</span>
        <span className="font-extrabold text-green-600 dark:text-green-400">{present}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Absent</span>
        <span className="font-extrabold text-red-600 dark:text-red-400">{absent}</span>
      </div>
    </div>
  ); 
}

function FilterPill({ label }: { label: string }) { 
  return (
    <button 
      type="button" 
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2",
        "text-sm font-semibold text-foreground hover:bg-muted transition"
      )}
    >
      {label}
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </button>
  ); 
}