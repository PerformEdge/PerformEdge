import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";

const API_BASE = "https://performedge.onrender.com";

type TrainingBar = { name: string; value: number; color: string };

type TrainingRow = {
  name: string;
  department: string;
  technical: number;
  softSkills: number;
  leadership: number;
  compliance: number;
};

type TrainingResponse = {
  stats: {
    totalEmployees: number;
    employeesNeedTraining: number;
    topTrainingCategory: string;
    avgTrainingCompletion: number;
  };
  bars: TrainingBar[];
  table: TrainingRow[];
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function PerformanceTraining() {
  const [dateRange, setDateRange] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [location, setLocation] = React.useState("");

  const [data, setData] = React.useState<TrainingResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ dateRange, department, location });
        const res = await fetch(`${API_BASE}/performance/training?${qs.toString()}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const json = (await res.json()) as TrainingResponse;
        if (!res.ok) throw new Error((json as any)?.detail || "Failed to load training data");
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

      const url = `${API_BASE}/performance/training/report${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to download report");
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "training_needs_report.pdf";
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-2xl font-extrabold">Training Needs Distribution</div>

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
            <StatCard title="Employees Need Training" value={`${data.stats.employeesNeedTraining}`} tone="green" />
            <StatCard title="Top Training Category" value={data.stats.topTrainingCategory} tone="yellow" />
            <StatCard title="Average Training Completion" value={`${data.stats.avgTrainingCompletion}%`} tone="orange" />
          </div>

          {/* Bars + Download */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-5">
                {data.bars.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[160px_1fr_60px] items-center gap-6"
                  >
                    <div className="text-lg font-bold">{row.name}</div>
                    <div className="h-4 w-full rounded-full bg-muted">
                      <div
                        className="h-4 rounded-full"
                        style={{ width: `${row.value}%`, background: row.color }}
                      />
                    </div>
                    <div className="text-sm font-semibold">{row.value}%</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl shadow-sm"
                  onClick={onDownloadReport}
                  disabled={downloading}
                >
                  {downloading ? "Preparing..." : "Download Report"}
                </Button>
              </div>

              {/* Table */}
              <div className="mt-8 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Technical</th>
                      <th className="px-4 py-3 font-semibold">Soft Skills</th>
                      <th className="px-4 py-3 font-semibold">Leadership</th>
                      <th className="px-4 py-3 font-semibold">Compliance</th>
                      <th className="px-4 py-3 font-semibold">Total %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.table.map((r) => {
                      const total = r.technical + r.softSkills + r.leadership + r.compliance;
                      return (
                        <tr key={r.name} className="border-t border-border">
                          <td className="px-4 py-3">{r.name}</td>
                          <td className="px-4 py-3">{r.department}</td>
                          <td className="px-4 py-3"><MiniBar value={r.technical} color="#4A7BD8" /></td>
                          <td className="px-4 py-3"><MiniBar value={r.softSkills} color="#7C5CF5" /></td>
                          <td className="px-4 py-3"><MiniBar value={r.leadership} color="#E0A84B" /></td>
                          <td className="px-4 py-3"><MiniBar value={r.compliance} color="#3C9A5F" /></td>
                          <td className="px-4 py-3">{total}%</td>
                        </tr>
                      );
                    })}

                    {data.table.length === 0 && (
                      <tr className="border-t border-border">
                        <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                          No training table data found.
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

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-[90px] rounded-full bg-muted">
        <div className="h-3 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
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

