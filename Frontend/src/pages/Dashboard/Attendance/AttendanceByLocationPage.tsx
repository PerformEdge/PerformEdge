"use client";

import { ChevronDown, Download } from "lucide-react";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import "@/utils/chartSetup";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
const API_BASE = "https://performedge.onrender.com";
import { useEffect, useState } from "react";
import FilterControls from "@/components/FilterControls";

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const getAxisColor = (dark: boolean) => (dark ? "#F8FAFC" : "#475569");
const getGridColor = (dark: boolean) => (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
const getAxisBorder = (dark: boolean) => (dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)");

// Base stacked options used for the horizontal stacked chart
const stackedOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
    tooltip: { enabled: true },
  },
  indexAxis: "y",
  scales: {
    x: {
      stacked: true,
      ticks: { color: getAxisColor(isDarkMode()), font: { size: 11 } },
      grid: { color: getGridColor(isDarkMode()) },
    },
    y: {
      stacked: true,
      ticks: { color: getAxisColor(isDarkMode()), font: { size: 11 } },
      grid: { display: false },
    },
  },
};

const kpiSchemes = {
  mint: { light: { bg: "#E8F6F3", text: "#1E5047" }, dark: { bg: "#0F3D38", text: "#A8D5D0" } },
  lav: { light: { bg: "#F4E4F7", text: "#552D6F" }, dark: { bg: "#2A1545", text: "#D4A5D4" } },
  sand: { light: { bg: "#FEF5E7", text: "#7D6608" }, dark: { bg: "#3E3410", text: "#F0D9A0" } },
  rose: { light: { bg: "#FCEAEA", text: "#7D2D2D" }, dark: { bg: "#3E2020", text: "#F0BABA" } },
};

const locationBarColors = (dark: boolean) => ({ present: dark ? "rgba(34,197,94,0.9)" : "rgba(16,185,129,0.9)", absent: dark ? "rgba(239,68,68,0.9)" : "rgba(239,68,68,0.9)" });

export default function AttendanceByLocationPage() {
  // ----------------- State -----------------
  const [kpis, setKpis] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    remoteWorkers: 0,
  });

  const [locations, setLocations] = useState<
    { name: string; present: number; absent: number }[]
  >([]);

  const [trend7Days, setTrend7Days] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const resetData = () => {
    setKpis({ totalEmployees: 0, presentToday: 0, absentToday: 0, remoteWorkers: 0 });
    setLocations([]);
    setTrend7Days({ labels: [], datasets: [] });
  };

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

  // ----------------- Fetch Data -----------------
  useEffect(() => {
    if (!start || !end) return;
    if (start > end) {
      setErrorMessage("Start date must be before or equal to end date.");
      resetData();
      return;
    }
    const dateRange = `${start} to ${end}`;

    setErrorMessage("");

    // KPIs
    fetch(`${API_BASE}/attendance-location/kpis?dateRange=${encodeURIComponent(dateRange)}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to load KPI data.");
        return data;
      })
      .then((data) => {
        setKpis({
          totalEmployees: Number(data?.totalEmployees || 0),
          presentToday: Number(data?.presentToday || 0),
          absentToday: Number(data?.absentToday || 0),
          remoteWorkers: Number(data?.remoteWorkers || 0),
        });
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load KPI data.");
        setKpis({ totalEmployees: 0, presentToday: 0, absentToday: 0, remoteWorkers: 0 });
      });

    // Location summary
    fetch(`${API_BASE}/attendance-location/summary?dateRange=${encodeURIComponent(dateRange)}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error(data?.detail || "Failed to load location summary.");
        return Array.isArray(data) ? data : [];
      })
      .then((data) => setLocations(data))
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load location summary.");
        setLocations([]);
      });

    // 7-day trend
    fetch(`${API_BASE}/attendance-location/trend7days?dateRange=${encodeURIComponent(dateRange)}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to load trend data.");
        return {
          labels: Array.isArray(data?.labels) ? data.labels : [],
          datasets: Array.isArray(data?.datasets) ? data.datasets : [],
        };
      })
      .then((data) => setTrend7Days(data))
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load trend data.");
        setTrend7Days({ labels: [], datasets: [] });
      });
  }, [start, end, department, locationFilter]);
  // ----------------- Download Report -----------------
  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({ start, end, department, location: locationFilter });
      const url = `${API_BASE}/attendance-location/report/branchwise?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: "application/pdf" } });
      if (!res.ok) throw new Error("Failed to download report");
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      let filename = "report.pdf";
      const match = contentDisposition.match(/filename=([^;]+)/);
      if (match && match[1]) filename = match[1].replace(/\"/g, "");

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
    }
  };
  const kpiCards = [
    { label: "Total Employees", value: kpis.totalEmployees.toString(), tone: "mint" as const },
    { label: "Present Today", value: kpis.presentToday.toString(), tone: "lav" as const },
    { label: "Absent Today", value: kpis.absentToday.toString(), tone: "sand" as const },
    { label: "Remote Workers", value: kpis.remoteWorkers.toString(), tone: "rose" as const },
  ];

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-extrabold">Attendance by Location</div>
          <div className="text-sm text-muted-foreground">Filter by date range, department and location.</div>
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

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/10">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {kpiCards.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="rounded-xl border border-border bg-card dark:bg-black/70 p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              {locations.slice(0, 3).map((loc) => (
                <LocationCard key={loc.name} {...loc} />
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {locations.slice(3).map((loc) => (
                <LocationCard key={loc.name} {...loc} />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" className="rounded-xl" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Present vs Absent by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.map((l) => (
              <PresentAbsentRow key={l.name} name={l.name} present={l.present} absent={l.absent} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">7 Days Attendance Trend (By Location)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            {Array.isArray(trend7Days?.labels) && trend7Days.labels.length > 0 ? (
              (() => {
                // map certain location labels to desired colors; others get deterministic palette colors
                const explicitMap: Record<string, string> = {
                  Spencer: "#3F8CF4",
                  Java: "#67DF9D",
                  "GP Square": "#F3B443",
                  Ramakrishna: "#EF5564",
                  Dialog: "#7363C9",
                };
                const palette = [
                  "#3F8CF4",
                  "#67DF9D",
                  "#F3B443",
                  "#8b5cf6",
                  "#e11d48",
                  "#EF5564",
                  "#bc53a0",
                  "#2EC4B6",
                  "#84cc16",
                ];
                const pickColor = (label: string) => {
                  if (!label) return "rgba(99,102,241,0.9)";
                  if (explicitMap[label]) return explicitMap[label];
                  // deterministic pick based on label string
                  let h = 0;
                  for (let i = 0; i < label.length; i++) h = (h << 5) - h + label.charCodeAt(i);
                  const idx = Math.abs(h) % palette.length;
                  return palette[idx];
                };

                const colored = {
                  ...trend7Days,
                  datasets: (trend7Days.datasets || []).map((ds: any) => ({
                    ...ds,
                    backgroundColor: pickColor(ds.label),
                    borderColor: pickColor(ds.label),
                    borderRadius: 12,
                    borderSkipped: false,
                    borderWidth: 0,
                    barThickness: 20,
                    maxBarThickness: 28,
                  })),
                };

                const trendOptions: ChartOptions<"bar"> = {
                  ...stackedOptions,
                  maintainAspectRatio: false,
                  responsive: true,
                  elements: { bar: { borderRadius: 12, borderSkipped: false, borderWidth: 0 } },
                  scales: {
                    x: {
                      stacked: true,
                      ticks: { color: getAxisColor(isDarkMode()), font: { size: 11 } },
                      grid: { color: getGridColor(isDarkMode()) },
                    },
                    y: {
                      stacked: true,
                      ticks: { color: getAxisColor(isDarkMode()), font: { size: 13 } },
                      grid: { display: false },
                    },
                  },
                  plugins: {
                    legend: {
                      position: "top" as const,
                      align: "center",
                      labels: { usePointStyle: true, pointStyle: "rectRounded", boxWidth: 12, boxHeight: 12, padding: 18, font: { size: 13 } },
                    },
                    tooltip: {
                      enabled: true,
                      callbacks: {
                        label: (context: any) => `${context.dataset.label}: ${context.parsed.x}`,
                      },
                    },
                  },
                  layout: { padding: { left: 12, right: 12, top: 8, bottom: 8 } },
                };

                return (
                  <Bar
                    data={colored}
                    options={trendOptions}
                    plugins={[
                      {
                        id: "stackedDataLabels",
                        afterDatasetsDraw: (chart: any) => {
                          try {
                            const ctx = chart.ctx;
                            ctx.save();

                            const getTextColor = (bg: string) => {
                              try {
                                if (!bg) return "#fff";
                                let r = 255, g = 255, b = 255;
                                if (bg.startsWith("rgba") || bg.startsWith("rgb")) {
                                  const nums = bg.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",") || [];
                                  r = parseFloat(nums[0]) || r; g = parseFloat(nums[1]) || g; b = parseFloat(nums[2]) || b;
                                } else if (bg.startsWith("#")) {
                                  const bigint = parseInt(bg.slice(1), 16);
                                  r = (bigint >> 16) & 255; g = (bigint >> 8) & 255; b = bigint & 255;
                                }
                                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                return brightness > 140 ? "#000" : "#fff";
                              } catch (e) {
                                return "#fff";
                              }
                            };

                            chart.data.datasets.forEach((dataset: any, dsIndex: number) => {
                              const meta = chart.getDatasetMeta(dsIndex);
                              if (!meta || !meta.data) return;
                              meta.data.forEach((bar: any, idx: number) => {
                                try {
                                  const val = dataset.data?.[idx];
                                  if (val === null || val === undefined) return;

                                  const start = typeof bar.base === "number" ? bar.base : (bar._model && bar._model.base) || 0;
                                  const end = typeof bar.x === "number" ? bar.x : (bar._model && bar._model.x) || 0;
                                  const centerX = (start + end) / 2;
                                  const centerY = bar.y;

                                  const segWidth = Math.abs(end - start);
                                  if (segWidth < 18) return;

                                  const bg = (bar.options && (bar.options.backgroundColor as string)) || dataset.backgroundColor;
                                  ctx.fillStyle = getTextColor(typeof bg === "string" ? bg : "");
                                  ctx.font = "600 12px Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'";
                                  ctx.textAlign = "center";
                                  ctx.textBaseline = "middle";
                                  ctx.fillText(String(val), centerX, centerY);
                                } catch (e) {
                                  // ignore text drawing errors for individual bars
                                }
                              });
                            });

                            ctx.restore();
                          } catch (e) {
                            // swallow plugin errors
                          }
                        },
                      },
                    ]}
                  />
                );
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No trend data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Components ----------------

// theme-aware KpiCard with tone
function KpiCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const dark = isDarkMode();
  const scheme = tone && (kpiSchemes as any)[tone] ? (kpiSchemes as any)[tone] : kpiSchemes.mint;
  const colors = dark ? scheme.dark : scheme.light;
  return (
    <div className="rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: colors.bg }}>
      <div className="text-xs font-semibold" style={{ color: colors.text }}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold" style={{ color: colors.text }}>{value}</div>
    </div>
  );
}

function LocationCard({ name, present, absent }: { name: string; present: number; absent: number }) {
  const dark = isDarkMode();
  return (
    <div className={cn(
      "rounded-2xl border border-border shadow-sm p-4 transition-colors",
      dark ? "bg-muted/30" : "bg-white"
    )}>
      <div className="flex items-stretch gap-3">
        <div className="w-1.5 rounded-full bg-red-500 dark:bg-red-600" />
        <div className="flex-1">
          <div className={cn("text-center text-sm font-semibold", dark ? "text-foreground" : "text-foreground")}>{name}</div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">👤 Present {present}</span>
            <span className="font-semibold text-red-600 dark:text-red-400">Absent {absent}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresentAbsentRow({ name, present, absent }: { name: string; present: number; absent: number }) {
  const total = Math.max(0, present + absent);
  const presentPct = total > 0 ? (present / total) * 100 : 0;
  const absentPct = total > 0 ? 100 - presentPct : 0;
  const dark = isDarkMode();

  // UX: don't place labels inside a 0%-width segment (it gets clipped).
  // Instead, show the counts above the bar and keep the bar purely visual.
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-muted-foreground">{name}</div>
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Present {present}</span>
          <span className="font-semibold text-red-600 dark:text-red-400">Absent {absent}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <div className="flex h-3 w-full">
          <div style={{ width: `${presentPct}%`, background: locationBarColors(dark).present }} />
          <div style={{ width: `${absentPct}%`, background: locationBarColors(dark).absent }} />
        </div>
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
        "text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition"
      )}
    >
      {label}
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}