import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";

import FormAlert from "@/components/FormAlert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE = "http://127.0.0.1:8000";

type SearchEmployee = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  department_name?: string | null;
  location_name?: string | null;
  role_name?: string | null;
};

export default function EmployeeSearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();

  const token = useMemo(() => localStorage.getItem("access_token") || "", []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<SearchEmployee[]>([]);

  useEffect(() => {
    if (!q) {
      setEmployees([]);
      setError(null);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/search?query=${encodeURIComponent(q)}&limit=25`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.detail || "Search failed")
        }

        setEmployees((data?.employees || []) as SearchEmployee[]);
      } catch (e: any) {
        setEmployees([]);
        setError(e?.message || "Search failed")
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [q, token]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Search</h1>
          <p className="text-sm text-muted-foreground">
            Find colleagues by employee code, name, department, or location.
          </p>
        </div>

        <Button variant="outline" disabled className="gap-2">
          <Search className="h-4 w-4" />
          {q ? `Results for “${q}”` : "Type in the search box"}
        </Button>
      </div>

      {error && <FormAlert message={error} variant="error" />}

      <Card className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : employees.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {q ? "No results found." : "Search to see results."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.employee_id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-semibold">{e.full_name}</div>
                      <div className="text-xs text-muted-foreground">{e.employee_code}</div>
                    </td>
                    <td className="py-3 pr-4">{e.department_name || "—"}</td>
                    <td className="py-3 pr-4">{e.location_name || "—"}</td>
                    <td className="py-3">{e.role_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
