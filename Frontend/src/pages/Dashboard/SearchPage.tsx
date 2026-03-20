import * as React from "react";
import { useSearchParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

type EmployeeResult = {
  employee_id: string;
  name: string;
  employee_code?: string;
  email?: string;
  department?: string;
  location?: string;
  role?: string;
};

type SearchResponse = {
  query: string;
  employees: EmployeeResult[];
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();

  const [data, setData] = React.useState<SearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!q) {
        setData({ query: "", employees: [] });
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(q)}&limit=50`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Search failed (${res.status})`);
        }
        const json = (await res.json()) as SearchResponse;
        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          const msg = e?.message || "Something went wrong";
          setError(
            msg === "Failed to fetch"
              ? "Cannot connect to the backend API. Please start the backend (FastAPI) on http://localhost:8000."
              : msg,
          );
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-extrabold">Search</div>
        <div className="text-sm text-muted-foreground">
          {q ? (
            <>
              Results for <span className="font-semibold text-foreground">“{q}”</span>
            </>
          ) : (
            <>Type in the top search bar to find employees.</>
          )}
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Searching...</div>}

      {error && (
        <div className="rounded-xl border border-border bg-background p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Employee Code</th>
                    <th className="py-3 pr-4 font-semibold">Department</th>
                    <th className="py-3 pr-4 font-semibold">Location</th>
                    <th className="py-3 pr-4 font-semibold">Role</th>
                    <th className="py-3 pr-4 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((e) => (
                    <tr key={e.employee_id} className="border-t border-border">
                      <td className="py-3 pr-4 font-semibold">{e.name || "-"}</td>
                      <td className="py-3 pr-4">{e.employee_code || "-"}</td>
                      <td className="py-3 pr-4">{e.department || "-"}</td>
                      <td className="py-3 pr-4">{e.location || "-"}</td>
                      <td className="py-3 pr-4">{e.role || "-"}</td>
                      <td className="py-3 pr-4">{e.email || "-"}</td>
                    </tr>
                  ))}

                  {data.employees.length === 0 && (
                    <tr className="border-t border-border">
                      <td className="py-8 text-muted-foreground" colSpan={6}>
                        {q ? "No results found." : "No query provided."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {q && (
              <div className={cn("pt-4 text-xs text-muted-foreground")}>
                Tip: try searching by full name, employee code, or email.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
