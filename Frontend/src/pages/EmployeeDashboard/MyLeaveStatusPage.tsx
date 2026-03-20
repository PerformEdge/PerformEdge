import { FormEvent, useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/utils/chartSetup";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE = "http://127.0.0.1:8000";

type LeaveSummary = {
  year: number;
  total_entitled: number;
  used: number;
  remaining: number;
  pending_requests: number;
  next_approved_leave?: string | null;
  by_type: { leave_type: string; total: number; used: number; remaining: number }[];
};

type LeaveRecord = {
  leave_record_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days?: number | null;
  status: string;
  reason?: string | null;
};

export default function MyLeaveStatusPage() {
  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [summary, setSummary] = useState<LeaveSummary | null>(null);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    leave_type: "Annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/employee/leave/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/employee/leave/records`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const sJson = await sRes.json().catch(() => ({}));
      const rJson = await rRes.json().catch(() => ({}));

      if (!sRes.ok) throw new Error(sJson?.detail || "Failed to load leave summary");
      if (!rRes.ok) throw new Error(rJson?.detail || "Failed to load leave records");

      setSummary(sJson as LeaveSummary);
      setRecords((rJson?.records || []) as LeaveRecord[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token]);

  useEffect(() => {
    if (!summary) return;
    const valid = new Set(summary.by_type.map((b) => b.leave_type));
    if (!valid.has(form.leave_type) && summary.by_type.length) {
      setForm((f) => ({ ...f, leave_type: summary.by_type[0].leave_type }));
    }
  }, [summary]);

  const breakdown = summary?.by_type || [];
  const chartData = {
    labels: breakdown.map((d) => d.leave_type),
    datasets: [
      {
        data: breakdown.length ? breakdown.map((d) => d.used) : [1],
        backgroundColor: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"],
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    cutout: "70%",
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!form.start_date || !form.end_date) {
      setError("Please select both start date and end date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/employee/leave/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.detail || "Failed to submit leave request");

      setSuccess(`Leave request submitted (${j.leave_record_id}).`);
      setForm((f) => ({ ...f, start_date: "", end_date: "", reason: "" }));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-extrabold tracking-tight">My Leave</div>
        <div className="text-sm text-muted-foreground">
          Entitlement, usage, and leave requests.
        </div>
      </div>

      {error && <FormAlert message={error} variant="error" />}
      {success && <FormAlert message={success} variant="success" />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leave Summary</CardTitle>
            {summary?.year && (
              <div className="text-xs font-semibold text-muted-foreground">
                {summary.year}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total" value={loading ? "—" : String(summary?.total_entitled ?? 0)} />
              <Metric label="Used" value={loading ? "—" : String(summary?.used ?? 0)} />
              <Metric label="Remaining" value={loading ? "—" : String(summary?.remaining ?? 0)} />
              <Metric label="Pending" value={loading ? "—" : String(summary?.pending_requests ?? 0)} />
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <div className="font-semibold">Next approved leave</div>
              <div className="text-muted-foreground">
                {summary?.next_approved_leave || "No upcoming approved leave"}
              </div>
            </div>

            <Card className="p-4">
              <div className="text-sm font-bold mb-3">Request Leave</div>
              <form onSubmit={submit} className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">Leave type</span>
                    <select
                      className="h-10 rounded-xl border bg-background px-3 text-sm"
                      value={form.leave_type}
                      onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                    >
                      {(summary?.by_type?.length
                        ? summary.by_type.map((b) => b.leave_type)
                        : ["Annual", "Sick", "Casual"]).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">Reason</span>
                    <input
                      className="h-10 rounded-xl border bg-background px-3 text-sm"
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">Start date</span>
                    <input
                      type="date"
                      className="h-10 rounded-xl border bg-background px-3 text-sm"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">End date</span>
                    <input
                      type="date"
                      className="h-10 rounded-xl border bg-background px-3 text-sm"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl"
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
              </form>
            </Card>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Leave Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <Doughnut data={chartData} options={options} />
            </div>

            <div className="mt-4 grid gap-2">
              {breakdown.map((b) => (
                <div
                  key={b.leave_type}
                  className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold">{b.leave_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.used} used · {b.remaining} remaining
                    </div>
                  </div>
                  <div className="font-bold">{b.total}</div>
                </div>
              ))}
              {!loading && breakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">No leave data.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No leave records found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Dates</th>
                    <th className="py-2 pr-4">Days</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.leave_record_id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-semibold">{r.leave_type}</td>
                      <td className="py-3 pr-4">
                        {r.start_date} → {r.end_date}
                      </td>
                      <td className="py-3 pr-4">{r.days ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-3">{r.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  const cls =
    s === "APPROVED"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
      : s === "PENDING"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
        : s === "REJECTED"
          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200"
          : "bg-muted text-muted-foreground dark:bg-muted/50 dark:text-foreground/70";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {status}
    </span>
  );
}
