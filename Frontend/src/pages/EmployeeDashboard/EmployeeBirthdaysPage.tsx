import { useEffect, useMemo, useState } from "react";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";

type BirthdayRow = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  department?: string | null;
  birth_date?: string | null;
  days_until?: number;
};

export default function EmployeeBirthdaysPage() {
  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/employee/birthdays?days=60`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.detail || "Failed to load birthdays");
        setRows((j?.birthdays || []) as BirthdayRow[]);
      } catch (e: any) {
        setRows([]);
        setError(e?.message || "Failed to load birthdays");
      } finally {
        setLoading(false);
      }
    };

    if (token) run();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-extrabold tracking-tight">🎂 Birthdays</div>
        <div className="text-sm text-muted-foreground">Upcoming birthdays in your company.</div>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Next 60 days 🎉</CardTitle>
            <div className="text-xs text-muted-foreground">Celebrate your teammates!</div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No upcoming birthdays."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((b) => (
                <BirthdayCard
                  key={b.employee_id}
                  name={b.full_name}
                  code={b.employee_code}
                  department={b.department || "—"}
                  daysUntil={b.days_until}
                  birthDate={b.birth_date}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BirthdayCard({
  name,
  code,
  department,
  daysUntil,
  birthDate,
}: {
  name: string;
  code: string;
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
          <div className="h-12 w-12 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-200 grid place-items-center font-extrabold">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{department}</div>
            <div className="mt-1 text-xs text-muted-foreground">#{code}</div>
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
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}
