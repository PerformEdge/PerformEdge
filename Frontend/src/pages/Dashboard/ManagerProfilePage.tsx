import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/FormAlert";

const API_BASE = "http://localhost:8000";

function getAuthHeaders() {
  const token = window.localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type MeResponse = {
  user_id?: string;
  user_name?: string;
  email?: string;
  role?: string;

  employee_id?: string;
  employee_code?: string;
  company_id?: string;
  company_name?: string;
  department?: string;
  location?: string;
};

export default function ManagerProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<MeResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);

      // Fallback (in case backend is not running yet)
      try {
        const raw = window.localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        if (!cancelled && parsed) {
          setMe((prev) => ({
            ...(prev || {}),
            user_id: parsed.user_id,
            user_name: parsed.user_name,
            email: parsed.email,
            company_id: parsed.company_id,
            role: window.localStorage.getItem("user_role") || "manager",
          }));
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.detail || "Failed to load profile");
        }
        const j = (await res.json()) as MeResponse;
        if (!cancelled) setMe(j);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("user_role");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const name = me?.user_name || "Manager";
  const email = me?.email || "";
  const company = me?.company_name || me?.company_id || "—";
  const department = me?.department || "—";
  const location = me?.location || "—";
  const role = (me?.role || "manager").toString().toLowerCase() === "employee" ? "Employee" : "Manager";

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            View your account details and sign out of your session.
          </p>
        </div>

        <Button onClick={logout} variant="outline" className="rounded-full">
          Logout
        </Button>
      </div>

      {error ? (
        <div className="mb-4">
          <FormAlert variant="error">{error}</FormAlert>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold">{name}</p>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold break-words">{email || "—"}</p>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-semibold">{company}</p>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-semibold">{department}</p>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold">{location}</p>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold">{role}</p>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading profile…</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
