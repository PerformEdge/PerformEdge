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

type AppraisalRow = {
  name: string;
  department: string;
  status: string;
  score: number | null;
  completionPct: number;
};

type AppraisalsResponse = {
  stats: {
    totalEmployees: number;
    appraisalsCompleted: number;
    pendingAppraisals: number;
    completionRate: number;
  };
  chart: PieItem[];
  rows: AppraisalRow[];
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function PerformanceAppraisals() {
  const [dateRange, setDateRange] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [location, setLocation] = React.useState("");

  const [data, setData] = React.useState<AppraisalsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [downloading, setDownloading] = React.useState(false);

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
        const res = await fetch(`${API_BASE}/performance/appraisals?${qs.toString()}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const json = (await res.json()) as AppraisalsResponse;
        if (!res.ok) throw new Error((json as any)?.detail || "Failed to load appraisal data");
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

      const url = `${API_BASE}/performance/appraisals/report${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to download report");
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "appraisals_completion_report.pdf";
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-2xl font-extrabold">Appraisals Completion Status</div>

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
          {/* Stats */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Employees" value={`${data.stats.totalEmployees}`} tone="blue" />
            <StatCard title="Appraisals Completed" value={`${data.stats.appraisalsCompleted}`} tone="green" />
            <StatCard title="Pending Appraisals" value={`${data.stats.pendingAppraisals}`} tone="yellow" />
            <StatCard title="Completion Rate" value={`${data.stats.completionRate}%`} tone="orange" />
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div className="mx-auto h-[360px] w-full max-w-[520px]">
                  <Doughnut data={makeChart(data.chart)} options={doughnutOptions} />
                </div>

                <div className="space-y-4">
                  {data.chart.map((it) => (
                    <div key={it.name} className="flex items-center gap-3 text-lg">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                      <span>
                        {it.name} — {it.value}%
                      </span>
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
              <div className="mt-8 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.name} className="border-t border-border">
                        <td className="px-4 py-3">{r.name}</td>
                        <td className="px-4 py-3">{r.department}</td>
                        <td className="px-4 py-3">{r.status}</td>
                        <td className="px-4 py-3">{r.score ?? "-"}</td>
                        <td className="px-4 py-3">
                          <CompletionBar value={r.completionPct} />
                        </td>
                      </tr>
                    ))}

                    {data.rows.length === 0 && (
                      <tr className="border-t border-border">
                        <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                          No appraisal rows found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CompletionBar({ value }: { value: number }) {
  const tone = value >= 80 ? "#3C9A5F" : "#E0A84B";
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="h-3 w-[160px] rounded-full bg-muted">
        <div className="h-3 rounded-full" style={{ width: `${value}%`, background: tone }} />
      </div>
      <span className="text-xs font-bold" style={{ color: tone }}>
        {value}%
      </span>
    </div>
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

