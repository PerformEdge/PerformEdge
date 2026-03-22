import * as React from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/utils/chartSetup";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";

const API_BASE = "https://performedge.onrender.com";

type PieItem = { name: string; value: number; color: string };
type EmployeeRow = { name: string; department: string; percentage: number; rating: string };

type RankingResponse = {
  stats: {
    averageScore: number;
    excellenceRate: number;
    needsImprovement: number;
    topPerformers: number;
  };
  chart: PieItem[];
  employees: EmployeeRow[];
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function PerformanceRanking() {
  const [dateRange, setDateRange] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [location, setLocation] = React.useState("");

  const [downloading, setDownloading] = React.useState(false);

  const [data, setData] = React.useState<RankingResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const doughnutOptions: ChartOptions<"doughnut"> = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: "62%",
    }),
    [],
  );

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ dateRange, department, location });
        const res = await fetch(`${API_BASE}/performance/ranking?${qs.toString()}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const json = (await res.json()) as RankingResponse;
        if (!res.ok) throw new Error((json as any)?.detail || "Failed to load ranking data");
        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [dateRange, department, location]);

  const onDownloadReport = async () => {
    setDownloading(true);
    try {
      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const url = `${API_BASE}/performance/ranking/report${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to download report");
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "performance_ranking_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      toast.error(e?.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const makeChart = (arr: PieItem[]) => ({
    labels: arr.map((d) => d.name),
    datasets: [
      {
        data: arr.map((d) => d.value),
        backgroundColor: arr.map((d) => d.color),
        borderWidth: 0,
      },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-2xl font-extrabold">Performance Ranking Distribution</div>

        <PerformanceFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          department={department}
          onDepartmentChange={setDepartment}
          location={location}
          onLocationChange={setLocation}
        />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && (
        <div className="rounded-xl border border-border bg-background p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Stat cards row (4) */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Average Score" value={`${data.stats.averageScore}%`} tone="blue" />
            <StatCard title="Excellence Rate" value={`${data.stats.excellenceRate}%`} tone="green" />
            <StatCard title="Needs Improvement" value={`${data.stats.needsImprovement}`} tone="yellow" />
            <StatCard title="Top Performers" value={`${data.stats.topPerformers}`} tone="orange" />
          </div>

          {/* Chart area */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div className="mx-auto h-[320px] w-full max-w-[520px]">
                  <Doughnut data={makeChart(data.chart)} options={doughnutOptions} />
                </div>

                <div className="space-y-4">
                  {data.chart.map((it) => (
                    <div key={it.name} className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-sm" style={{ background: it.color }} />
                        <span className="text-lg font-medium">{it.name}</span>
                      </div>
                      <span className="text-lg">{it.value}%</span>
                    </div>
                  ))}

                  <div className="pt-6">
                    <Button
                      variant="outline"
                      className="rounded-xl shadow-sm"
                      onClick={onDownloadReport}
                      disabled={downloading}
                    >
                      {downloading ? "Preparing..." : "Download Report"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="mt-8">
                <div className="mb-3 text-lg font-extrabold">Employee Performance Breakdown</div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Department</th>
                        <th className="px-4 py-3 font-semibold">Percentage</th>
                        <th className="px-4 py-3 font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.employees.map((r) => (
                        <tr key={r.name} className="border-t border-border">
                          <td className="px-4 py-3 text-muted-foreground">{r.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.percentage}%</td>
                          <td className="px-4 py-3">
                            <RatingPill rating={r.rating} />
                          </td>
                        </tr>
                      ))}
                      {data.employees.length === 0 && (
                        <tr className="border-t border-border">
                          <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                            No employee data found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RatingPill({ rating }: { rating: string }) {
  const key = rating.toLowerCase();
  const tone =
    key.includes("excellent") || key.includes("outstanding")
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
      : key.includes("unsatisfactory")
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
      : key.includes("need improvement") || key.includes("needs improvement")
      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200"
      : key.includes("very good")
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
      : key.includes("good")
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
      : key.includes("satisfactory") || key.includes("average")
      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200"
      : "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-200";

  return (
    <span className={cn("inline-flex min-w-[180px] justify-center rounded-lg px-3 py-1 text-xs font-bold", tone)}>
      {rating}
    </span>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "blue" | "green" | "yellow" | "orange";
}) {
  const cls =
    tone === "blue" ? "bg-blue-100/60 dark:bg-blue-500/10" :
    tone === "green" ? "bg-emerald-100/60 dark:bg-emerald-500/10" :
    tone === "yellow" ? "bg-yellow-100/60 dark:bg-yellow-500/10" :
    "bg-orange-100/60 dark:bg-orange-500/10";

  return (
    <div className={cn("rounded-2xl p-6 text-center shadow-sm border border-border/60", cls)}>
      <div className="text-sm font-semibold text-foreground/70">{title}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

