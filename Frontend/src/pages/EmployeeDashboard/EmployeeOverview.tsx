import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck2,
  TrendingUp,
  Users,
  Wallet,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";

import type { ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import "@/utils/chartSetup";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

type OverviewResponse = {
  employee: {
    employee_id: string;
    employee_code: string;
    full_name: string;
    department?: string | null;
    location?: string | null;
  };
  leave: {
    year: number;
    total_entitled: number;
    used: number;
    remaining: number;
    pending_requests: number;
    next_approved_leave?: string | null;
    by_type: { leave_type: string; total: number; used: number; remaining: number }[];
  };
  performance: {
    latest_score?: number | null;
    latest_rating?: string | null;
    latest_review_date?: string | null;
    trend: { cycle_name: string; score: number | null; rating?: string | null }[];
  };
  training: {
    total: number;
    recommended: number;
    requested: number;
  };
  new_joiners: {
    employee_id: string;
    employee_code: string;
    full_name: string;
    department?: string | null;
    join_date?: string | null;
  }[];
  birthdays: {
    employee_id: string;
    employee_code: string;
    full_name: string;
    department?: string | null;
    birth_date?: string | null;
    days_until?: number;
  }[];
};

export default function EmployeeOverview() {
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/employee/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.detail || "Failed to load employee dashboard");
        setData(j as OverviewResponse);
      } catch (e: any) {
        setData(null);
        setError(e?.message || "Failed to load employee dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (token) run();
  }, [token]);

  const leaveByType = data?.leave?.by_type || [];

  const leaveLabels = leaveByType.map((x) => x.leave_type);
  const leaveTotals = leaveByType.map((x) => Number(x.total) || 0);
  const leaveUsed = leaveByType.map((x) => Number(x.used) || 0);
  const leaveRemaining = leaveByType.map((x) => Number(x.remaining) || 0);

  const leaveTotalUsed = leaveUsed.reduce((a, b) => a + (Number(b) || 0), 0);
  const leaveTotalRemaining = leaveRemaining.reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  );

  const hasLeaveUsage = leaveTotalUsed > 0;
  const leaveMode: "used" | "remaining" = hasLeaveUsage ? "used" : "remaining";
  const leaveDisplayValues = leaveMode === "used" ? leaveUsed : leaveRemaining;

  const leaveChart = {
    labels: leaveLabels.length ? leaveLabels : ["No leave data"],
    datasets: [
      {
        data: leaveDisplayValues.some((v) => v > 0) ? leaveDisplayValues : [1],
        // pleasant palette
        backgroundColor: [
          "#ef4444",
          "#3b82f6",
          "#22c55e",
          "#f59e0b",
          "#a855f7",
        ],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (!leaveByType.length) return "No leave data";
            const idx = ctx.dataIndex;
            const row = leaveByType[idx];
            const label = row?.leave_type || ctx.label || "";
            const used = Number(row?.used) || 0;
            const total = Number(row?.total) || 0;
            const remaining = Math.max(total - used, 0);

            if (leaveMode === "used") {
              return `${label}: ${used} used of ${total}`;
            }
            return `${label}: ${remaining} remaining (used ${used}/${total})`;
          },
        },
      },
    },
    cutout: "68%",
  };

  const trend = data?.performance?.trend || [];

  const perfPoints = trend
    .filter((t) => t.score !== null && t.score !== undefined)
    .map((t) => ({ cycle_name: t.cycle_name, score: Number(t.score) }))
    .filter((t) => Number.isFinite(t.score));

  const perfLabels = perfPoints.map((t) => t.cycle_name);
  const perfScores = perfPoints.map((t) => t.score);

  const hasPerfData = perfScores.length > 0;
  const hasPerfTrend = perfScores.length >= 2;

  const perfChart = {
    labels: perfLabels,
    datasets: [
      {
        label: "Score",
        data: perfScores,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const perfBarChart = {
    labels: perfLabels,
    datasets: [
      {
        label: "Score",
        data: perfScores,
        backgroundColor: "rgba(239, 68, 68, 0.25)",
        borderColor: "#ef4444",
        borderWidth: 1,
        borderRadius: 10,
      },
    ],
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100 },
      x: { grid: { display: false } },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number((ctx.parsed as any)?.y ?? ctx.parsed);
            if (!Number.isFinite(v)) return "—";
            return `Score: ${Math.round(v)} / 100`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, max: 100 },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-red-600" />
          <div className="text-3xl font-extrabold tracking-tight">My Dashboard</div>
        </div>
        <div className="text-sm text-muted-foreground">
          Leave, performance, and HR highlights — all in one place.
        </div>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Leave Remaining"
          value={loading ? "—" : `${data?.leave?.remaining ?? 0}`}
          sub={
            loading
              ? ""
              : `out of ${data?.leave?.total_entitled ?? 0} days (${data?.leave?.year})`
          }
        />
        <KpiCard
          icon={CalendarCheck2}
          label="Leave Used"
          value={loading ? "—" : `${data?.leave?.used ?? 0}`}
          sub={
            loading
              ? ""
              : data?.leave?.next_approved_leave
                ? `Next approved: ${data.leave.next_approved_leave}`
                : "No upcoming approved leave"
          }
        />
        <KpiCard
          icon={Users}
          label="Pending Requests"
          value={loading ? "—" : `${data?.leave?.pending_requests ?? 0}`}
          sub="Waiting for approval"
        />
        <KpiCard
          icon={TrendingUp}
          label="Latest Rating"
          value={
            loading
              ? "—"
              : data?.performance?.latest_score != null
                ? `${Math.round(Number(data.performance.latest_score))}%`
                : "—"
          }
          sub={loading ? "" : data?.performance?.latest_rating || "No reviews yet"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leave Breakdown</CardTitle>
              <div className="text-xs text-muted-foreground">
                {leaveMode === "used" ? "Used" : "Remaining"} days by leave type ({
                  data?.leave?.year ?? "—"
                })
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/employee/my-leave")}
            >
              My Leave 🗓️
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[280px_1fr] items-center">
              <div className="relative h-[280px]">
                <Doughnut data={leaveChart} options={doughnutOptions} />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold tracking-tight">
                      {leaveMode === "used" ? leaveTotalUsed : leaveTotalRemaining}
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {leaveMode === "used"
                        ? leaveTotalUsed === 0
                          ? "used 🎉"
                          : "used"
                        : "remaining"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Summary</div>
                <div className="rounded-xl border p-4 bg-muted/20">
                  <div className="text-sm">
                    <span className="font-semibold">Used:</span> {leaveTotalUsed} day
                    {leaveTotalUsed === 1 ? "" : "s"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Remaining: {data?.leave?.remaining ?? 0} / {data?.leave?.total_entitled ?? 0}
                  </div>
                  {!hasLeaveUsage && leaveTotals.some((x) => x > 0) && (
                    <div className="mt-2 text-xs font-semibold text-muted-foreground">
                      🎉 No leave used yet — showing remaining days by type.
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  {leaveByType.slice(0, 4).map((lt) => (
                    <div
                      key={lt.leave_type}
                      className="flex items-center justify-between rounded-xl border px-4 py-3 bg-card"
                    >
                      <div>
                        <div className="text-sm font-semibold">{lt.leave_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {Number(lt.used) || 0} used · {Number(lt.remaining) || 0} remaining
                        </div>
                      </div>
                      <div className="text-sm font-bold">{Number(lt.total) || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Performance Trend</CardTitle>
              <div className="text-xs text-muted-foreground">
                Recent review cycles (score out of 100)
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/employee/my-performance")}
            >
              My Performance 📈
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              {hasPerfData ? (
                hasPerfTrend ? (
                  <Line data={perfChart} options={lineOptions} />
                ) : (
                  <Bar data={perfBarChart} options={barOptions} />
                )
              ) : (
                <div className="h-full rounded-2xl border border-dashed border-border grid place-items-center bg-muted/20">
                  <div className="text-center">
                    <div className="text-3xl">🧾</div>
                    <div className="mt-1 text-sm font-semibold">No performance reviews yet</div>
                    <div className="text-xs text-muted-foreground">
                      Once you have reviews, your trend will show here.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasPerfData && !hasPerfTrend && (
              <div className="mt-3 text-xs font-semibold text-muted-foreground">
                📌 Only one review cycle available so far — showing a snapshot bar.
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniStat
                label="Latest Score"
                value={
                  data?.performance?.latest_score != null
                    ? `${Math.round(Number(data.performance.latest_score))}%`
                    : "—"
                }
              />
              <MiniStat label="Latest Rating" value={data?.performance?.latest_rating || "—"} />
              <MiniStat label="Training Items" value={String(data?.training?.total ?? 0)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle>👋 New Joiners</CardTitle>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/employee/new-joiners")}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.new_joiners || []).slice(0, 5).map((j) => (
              <Row
                key={j.employee_id}
                title={j.full_name}
                meta={`🆕 ${j.department || "—"} • Joined ${j.join_date || "—"}`}
              />
            ))}
            {!loading && (data?.new_joiners || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No joiners found.</div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle>🎂 Upcoming Birthdays</CardTitle>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/employee/birthdays")}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(data?.birthdays || []).slice(0, 6).map((b) => (
                <BirthdayCard
                  key={b.employee_id}
                  name={b.full_name}
                  department={b.department || "—"}
                  daysUntil={b.days_until}
                  birthDate={b.birth_date}
                />
              ))}
            </div>

            {!loading && (data?.birthdays || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No birthdays in the next 30 days.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-500/10" />
      <div className="flex items-center justify-between">
        <div className="h-11 w-11 rounded-2xl bg-muted grid place-items-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-sm font-semibold text-foreground/70">{label}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  );
}

function Row({ title, meta }: { title: string; meta: string }) {
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3 hover:bg-muted/30 transition">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-200 grid place-items-center font-extrabold">
          {initials}
        </div>
        <div className="leading-tight">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{meta}</div>
        </div>
      </div>
    </div>
  );
}

function BirthdayCard({
  name,
  department,
  daysUntil,
  birthDate,
}: {
  name: string;
  department: string;
  daysUntil?: number;
  birthDate?: string | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const badge =
    daysUntil === 0
      ? "Today 🎉"
      : daysUntil != null
        ? `in ${daysUntil} day${daysUntil === 1 ? "" : "s"} 🎂`
        : "—";

  const md = formatMonthDay(birthDate);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-500/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-200 grid place-items-center font-extrabold">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{department}</div>
            {md && <div className="mt-1 text-xs text-muted-foreground">📅 {md}</div>}
          </div>
        </div>
        <div className="text-xs font-extrabold rounded-full border px-3 py-1 bg-muted/30">
          {badge}
        </div>
      </div>
    </div>
  );
}

function formatMonthDay(iso?: string | null) {
  if (!iso) return "";
  // iso: YYYY-MM-DD
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return iso;

  // Simple, locale-agnostic output (keeps UI consistent)
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}
