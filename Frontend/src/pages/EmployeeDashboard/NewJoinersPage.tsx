import { useEffect, useMemo, useState } from "react";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = "http://127.0.0.1:8000";

type Joiner = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  department?: string | null;
  join_date?: string | null;
};

export default function NewJoinersPage() {
  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [rows, setRows] = useState<Joiner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/employee/new-joiners?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.detail || "Failed to load new joiners");
        setRows((j?.new_joiners || []) as Joiner[]);
      } catch (e: any) {
        setRows([]);
        setError(e?.message || "Failed to load new joiners");
      } finally {
        setLoading(false);
      }
    };

    if (token) run();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-extrabold tracking-tight">New Joiners</div>
        <div className="text-sm text-muted-foreground">
          Welcome the newest members in your company.
        </div>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent hires</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No joiners found."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-12 bg-muted/40 px-4 py-3 text-xs font-bold text-muted-foreground">
                <div className="col-span-6">Staff</div>
                <div className="col-span-4">Department</div>
                <div className="col-span-2 text-right">Join Date</div>
              </div>

              {rows.map((j) => (
                <div
                  key={j.employee_id}
                  className="grid grid-cols-12 items-center px-4 py-3 text-sm border-t border-border"
                >
                  <div className="col-span-6">
                    <div className="font-semibold">{j.full_name}</div>
                    <div className="text-xs text-muted-foreground">{j.employee_code}</div>
                  </div>
                  <div className="col-span-4 text-muted-foreground font-semibold">
                    {j.department || "—"}
                  </div>
                  <div className="col-span-2 text-right font-bold">
                    {j.join_date || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
