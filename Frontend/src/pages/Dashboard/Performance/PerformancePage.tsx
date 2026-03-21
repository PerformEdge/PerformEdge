import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE = "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type ChartItem = { name: string; value: number; color: string };

type OverviewResponse = {
  ranking_chart: ChartItem[];
  training_bars: ChartItem[];
  appraisals_chart: ChartItem[];
  stats: {
    averageScore: number;
    excellenceRate: number;
    needsImprovement: number;
    topPerformers: number;

    totalEmployees: number;
    employeesNeedTraining: number;
    topTrainingCategory: string;
    avgTrainingCompletion: number;

    appraisalsCompleted: number;
    pendingAppraisals: number;
    completionRate: number;
  };
};

export default function PerformancePage() {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [location, setLocation] = React.useState<string>("");

  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const url = `${API_BASE}/performance/overview${qs.toString() ? `?${qs.toString()}` : ""}`;

        const res = await fetch(url, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as any)?.detail || "Failed to load performance overview");
        }

        if (mounted) {
          setData(json as OverviewResponse);
        }
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.message || "Failed to load performance overview";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [dateRange, department, location]);

  // Support both the older nested API shape (ranking/training/appraisals)
  // and the flattened API shape (ranking_chart/training_bars/appraisals_chart).
  const rankingChart = data?.ranking_chart || (data as any)?.ranking?.chart || [];
  const trainingBars = data?.training_bars || (data as any)?.training?.bars || [];
  const appraisalsChart =
    data?.appraisals_chart || (data as any)?.appraisals?.chart || [];
  const stats = data?.stats;

  const rankingDoughnutData = React.useMemo(() => {
    return {
      labels: rankingChart.map((d) => d.name),
      datasets: [
        {
          label: "%",
          data: rankingChart.map((d) => d.value),
          backgroundColor: rankingChart.map((d) => d.color),
          borderWidth: 0,
        },
      ],
    };
  }, [rankingChart]);

  const appraisalsDoughnutData = React.useMemo(() => {
    return {
      labels: appraisalsChart.map((d) => d.name),
      datasets: [
        {
          label: "%",
          data: appraisalsChart.map((d) => d.value),
          backgroundColor: appraisalsChart.map((d) => d.color),
          borderWidth: 0,
        },
      ],
    };
  }, [appraisalsChart]);

  const onDownloadReport = async () => {
    setDownloading(true);
    try {
      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const url = `${API_BASE}/performance/overview/report${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to download report");
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "performance_overview_report.pdf";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Performance</h1>
          <p className="text-sm text-muted-foreground">
            Overview of performance, training needs, and appraisal completion.
          </p>
        </div>

        <PerformanceFilters
          dateRange={dateRange}
          department={department}
          location={location}
          onDateRangeChange={setDateRange}
          onDepartmentChange={setDepartment}
          onLocationChange={setLocation}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          Loading performance overview...
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ranking Distribution */}
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold">
                      Performance Ranking Distribution
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Grouped by appraisal results
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr] items-center">
                  <div className="mx-auto w-full max-w-[260px]">
                    <Doughnut
                      data={rankingDoughnutData}
                      options={{ plugins: { legend: { display: false } } }}
                    />
                  </div>

                  <div className="space-y-3">
                    {rankingChart.map((it) => (
                      <div
                        key={it.name}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: it.color }}
                          />
                          <span className="text-sm font-semibold">{it.name}</span>
                        </div>
                        <div className="text-sm font-bold">{it.value}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Training Needs */}
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold">
                      Training Needs Distribution
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Percentage of employees recommended/requested training
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={onDownloadReport}
                    disabled={downloading}
                  >
                    {downloading ? "Preparing..." : "Download Report"}
                  </Button>
                </div>

                <div className="mt-6 space-y-5">
                  {trainingBars.map((row) => (
                    <div key={row.name} className="flex items-center gap-4">
                      <div className="w-32 shrink-0 text-base font-bold">
                        {row.name}
                      </div>
                      <div className="h-4 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${row.value}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-bold">
                        {row.value}%
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-xs text-muted-foreground">
                  Tip: use this to plan monthly training sessions focused on the largest needs.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appraisal Completion */}
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">Appraisal Completion Status</h2>
                  <p className="text-sm text-muted-foreground">
                    Track completion of performance appraisals
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => navigate("/dashboard/performance/appraisal-completion-status")}
                >
                  View Details
                </Button>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr] items-center">
                <div className="mx-auto w-full max-w-[260px]">
                  <Doughnut
                    data={appraisalsDoughnutData}
                    options={{ plugins: { legend: { display: false } } }}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: "#10B981" }}
                      />
                      <span className="text-sm font-semibold">Completed</span>
                    </div>
                    <div className="text-sm font-bold">
                      {appraisalsChart.find((x) => x.name === "Completed")?.value ?? 0}% (
                      {stats?.appraisalsCompleted ?? 0})
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: "#F59E0B" }}
                      />
                      <span className="text-sm font-semibold">Pending</span>
                    </div>
                    <div className="text-sm font-bold">
                      {appraisalsChart.find((x) => x.name === "Pending")?.value ?? 0}% (
                      {stats?.pendingAppraisals ?? 0})
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    Action: send reminders to pending employees and managers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
