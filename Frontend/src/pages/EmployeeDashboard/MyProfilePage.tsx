import { useEffect, useMemo, useState } from "react";

import FormAlert from "@/components/FormAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

type MeResponse = {
  user_id: number;
  user_name: string;
  email: string;
  company_id: string;
  company_name?: string | null;
  role: string;
  employee_id?: string | null;
  employee_code?: string | null;
  full_name?: string | null;
  department?: string | null;
  location?: string | null;
};

export default function MyProfilePage() {
  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.detail || "Failed to load profile");
      setMe(j as MeResponse);
    } catch (e: any) {
      setMe(null);
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchMe();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-extrabold tracking-tight">My Profile</div>
        <div className="text-sm text-muted-foreground">
          View your account details.
        </div>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <Button variant="outline" className="rounded-xl" onClick={fetchMe}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" value={loading ? "—" : me?.full_name || me?.user_name || "—"} />
            <Field label="Email" value={loading ? "—" : me?.email || "—"} />
            <Field label="Company" value={loading ? "—" : me?.company_id || "—"} />
            <Field label="Employee Code" value={loading ? "—" : me?.employee_code || "—"} />
            <Field label="Department" value={loading ? "—" : me?.department || "—"} />
            <Field label="Location" value={loading ? "—" : me?.location || "—"} />
            <Field label="Role" value={loading ? "—" : me?.role ? me.role[0].toUpperCase() + me.role.slice(1) : "—"} />
            <Field label="User ID" value={loading ? "—" : String(me?.user_id ?? "—")} />
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Note</div>
            Editing profile is not enabled in this demo build.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value}</div>
    </div>
  );
}
