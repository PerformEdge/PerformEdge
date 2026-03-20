import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Bar, Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/utils/chartSetup";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, CalendarCheck2, Clock3, TrendingDown, TrendingUp } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

type PerfHistoryRow = {
  review_id: string;
  cycle_name: string;
  end_date?: string | null;
  review_date?: string | null;
  score: number | null;
  rating?: string | null;
  comments?: string | null;
};

type CriteriaRow = {
  criteria: string;
  score: number;
  max_score: number;
};

type PerfSummary = {
  latest: {
    score: number | null;
    rating?: string | null;
    cycle_name?: string | null;
    review_date?: string | null;
    comments?: string | null;
  };
  history: PerfHistoryRow[];
  criteria: CriteriaRow[];
};

export default function MyPerformancePage() {
  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [data, setData] = useState<PerfSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/employee/performance/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.detail || "Failed to load performance data");
        setData(j as PerfSummary);
      } catch (e: any) {
        setData(null);
        setError(e?.message || "Failed to load performance data");
      } finally {
        setLoading(false);
      }
    };

    if (token) run();
  }, [token]);

  const historyAsc = [...(data?.history || [])].reverse();

  const trendChart = {
    labels: historyAsc.map((h) => h.cycle_name),
    datasets: [
      {
        label: "Score",
        data: historyAsc.map((h) => (h.score == null ? null : Number(h.score))),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const trendOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100 },
    },
  };

  const criteria = data?.criteria || [];
  const criteriaChart = {
    labels: criteria.map((c) => c.criteria),
    datasets: [
      {
        label: "%",
        data: criteria.map((c) =>
          c.max_score ? Math.round((Number(c.score) / Number(c.max_score)) * 100) : 0
        ),
        backgroundColor: "#3b82f6",
        borderRadius: 10,
      },
    ],
  };

  const criteriaOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100 },
    },
  };

  const downloadReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/employee/performance/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || "Failed to download report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my_performance_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Failed to download report");
    }
  };

  const latestScore = data?.latest?.score;
  const latestRating = data?.latest?.rating;

  const lastReviewLabel = useMemo(() => {
    const raw = data?.latest?.review_date;
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data?.latest?.review_date]);

  const scoreDelta = useMemo(() => {
    const h = data?.history ?? [];
    if (h.length < 2) return null;
    const a = Number(h[0]?.score);
    const b = Number(h[1]?.score);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.round((a - b) * 10) / 10;
  }, [data?.history]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-extrabold tracking-tight">My Performance</div>
        <div className="text-sm text-muted-foreground">
          Your score trend, criteria breakdown, and report download.
        </div>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Latest Score"
          value={loading ? "—" : latestScore != null ? `${Math.round(Number(latestScore))}%` : "—"}
          tone={scoreDelta !== null && scoreDelta < 0 ? "warning" : "success"}
          icon={scoreDelta !== null && scoreDelta < 0 ? TrendingDown : TrendingUp}
          helper={
            scoreDelta === null ? (
              <span>Based on your most recent review.</span>
            ) : (
              <span>
                {scoreDelta >= 0 ? "+" : ""}
                {scoreDelta}% vs previous cycle
              </span>
            )
          }
        />
        <Metric
          label="Latest Rating"
          value={loading ? "—" : latestRating ?? "—"}
          tone="info"
          icon={Award}
          helper={<span>Overall appraisal category.</span>}
        />
        <Metric
          label="Current Cycle"
          value={loading ? "—" : data?.latest?.cycle_name || "—"}
          tone="neutral"
          icon={CalendarCheck2}
          helper={<span>Performance evaluation period.</span>}
        />
        <Metric
          label="Last Review"
          value={loading ? "—" : lastReviewLabel}
          tone="neutral"
          icon={Clock3}
          helper={<span>Most recent review timestamp.</span>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <Line data={trendChart} options={trendOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Criteria Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <Bar data={criteriaChart} options={criteriaOptions} />
            </div>
            {!loading && criteria.length === 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                No criteria scores recorded for your latest review.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.history || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading…" : "No performance reviews found."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-12 bg-muted/40 px-4 py-3 text-xs font-bold text-muted-foreground">
                  <div className="col-span-4">Cycle</div>
                  <div className="col-span-2">Score</div>
                  <div className="col-span-3">Rating</div>
                  <div className="col-span-3">Review Date</div>
                </div>
                {(data?.history || []).map((p) => (
                  <div
                    key={p.review_id}
                    className="grid grid-cols-12 px-4 py-3 text-sm border-t border-border"
                  >
                    <div className="col-span-4 font-semibold">{p.cycle_name}</div>
                    <div className="col-span-2 font-extrabold">{p.score != null ? `${Math.round(Number(p.score))}%` : "—"}</div>
                    <div className="col-span-3">
                      <RatingPill rating={p.rating || "—"} />
                    </div>
                    <div className="col-span-3 text-muted-foreground font-semibold">
                      {p.review_date || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={downloadReport}
              >
                Download Report (PDF)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Latest Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              {data?.latest?.comments ? (
                <div className="whitespace-pre-wrap">{data.latest.comments}</div>
              ) : (
                <div className="text-muted-foreground">No comments available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const tones: Record<NonNullable<typeof tone>, { ring: string; icon: string; meta: string }> = {
    neutral: {
      ring: "from-zinc-200/80 to-white dark:from-zinc-800 dark:to-zinc-950",
      icon: "bg-zinc-900/5 text-zinc-800 dark:bg-white/10 dark:text-zinc-100",
      meta: "text-zinc-600 dark:text-zinc-300",
    },
    success: {
      ring: "from-emerald-200/70 to-white dark:from-emerald-500/15 dark:to-zinc-950",
      icon: "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
      meta: "text-emerald-900 dark:text-emerald-200",
    },
    warning: {
      ring: "from-amber-200/70 to-white dark:from-amber-500/15 dark:to-zinc-950",
      icon: "bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
      meta: "text-amber-950 dark:text-amber-200",
    },
    info: {
      ring: "from-blue-200/70 to-white dark:from-blue-500/15 dark:to-zinc-950",
      icon: "bg-blue-500/10 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200",
      meta: "text-blue-950 dark:text-blue-200",
    },
  };
  const t = tones[tone];

  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${t.ring} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-xs font-semibold uppercase tracking-wide ${t.meta}`}>{label}</div>
          <div className="mt-2 truncate text-2xl font-extrabold leading-tight text-zinc-950 dark:text-white">
            {value}
          </div>
        </div>

        {Icon ? (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      {helper ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function RatingPill({ rating }: { rating: string }) {
  const r = rating.toLowerCase();
  const cls =
    r.includes("excellent")
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
      : r.includes("very")
        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
        : r.includes("satisfactory")
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
          : r.includes("needs") || r.includes("improve")
            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200"
            : r.includes("unsatisfactory")
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200"
              : "bg-muted text-muted-foreground dark:bg-muted/50 dark:text-foreground/70";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {rating}
    </span>
  );
}