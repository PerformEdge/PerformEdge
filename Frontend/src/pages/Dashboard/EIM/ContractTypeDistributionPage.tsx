import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*---------------- ApI Base---------------*/

const API_BASE = "http://localhost:8000";

/* ---------------- TYPES ---------------- */

interface Kpis {
  total: number;
  permanent: number;
  contract: number;
  consultants: number;
  probation: number;
}

interface SummaryItem {
  type: string;
  percentage: number;
}

interface Employee {
  name: string;
  department: string;
  contract: string;
}

interface ApiResponse {
  kpis: Kpis;
  summary: SummaryItem[];
  employees: Employee[];
}

/* ---------------- AUTH HEADER ---------------- */
// Builds the request headers and attaches the saved access token for authenticated API calls.
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


/* ---------------- COMPONENT ---------------- */

export default function ContractTypeDistribution() {
  const isDark = document.documentElement.classList.contains("dark");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
//Fetches contract type distribution data again whenever the selected filters change.
 useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const res = await fetch(
          `${API_BASE}/eim/contract-type-distribution${
            qs.toString() ? `?${qs.toString()}` : ""
          }`,
          { headers: getAuthHeaders() }
        );
        

        if (!res.ok) {
          throw new Error("Unauthorized or failed request");
        }
        if (res.status === 401) {
        toast.error("Session expired. Please login again.");
        return;
      }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load contract type data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, department, location]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return <div className="p-6">Loading Contract Type Distribution...</div>;
  }

if (!data) {
  return <div className="p-6 text-red-500">Failed to load contract data</div>;
}

  /* ---------------- KPI LIST ---------------- */

  const kpis = [
    { title: "Total Staff", value: data.kpis.total },
    { title: "Permanent", value: data.kpis.permanent },
    { title: "Consultants", value: data.kpis.consultants },
    { title: "Probation", value: data.kpis.probation },
  ];

  /* ---------------- CHART ---------------- */

  const colors: Record<string, string> = {
    Permanent: "#3B82F6",
    Consultants: "#F59E0B",
    Probation: "#EC4899",
  };

  const chartData = {
    labels: data.summary?.map((s) => s.type) || [],
    datasets: [
      {
        data: data.summary?.map((s) => s.percentage ?? 0) || [],
        backgroundColor: data.summary?.map(
          (s) => colors[s.type] ?? "#9CA3AF"
        ),
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: isDark ? "#E5E7EB" : "#374151",
          font: { weight: "bold" as const },
        },
      },
    },
  };

  /* ---------------- DOWNLOAD ---------------- */

  const onDownloadReport = async () => {
    try {
      setDownloading(true);

      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const url = `${API_BASE}/eim/contract-type-distribution/report${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "contract_type_distribution_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      toast.error(error?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-extrabold">
          Contract Type Distribution
        </h1>

        <PerformanceFilters
          dateRange={dateRange}
          department={department}
          location={location}
          onDateRangeChange={setDateRange}
          onDepartmentChange={setDepartment}
          onLocationChange={setLocation}
        />
      </div>

      {/* KPI CARDS */}
      <div className="grid md:grid-cols-4 gap-6">
        {kpis.map((k, index) => (
          <StatCard
        key={k.title}
        title={k.title}
        value={k.value.toString()}
        tone={["blue", "green", "yellow", "orange"][index % 4] as "blue" | "green" | "yellow" | "orange"}
          />
        ))}
      </div>

      {/* CHART */}
      <Card title="Contract Type Distribution">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="h-[300px]">
            <Pie data={chartData} options={chartOptions} />
          </div>

          <div className="space-y-3 text-sm">
            {data.summary.map((s) => (
              <LegendRow
                key={s.type}
                label={s.type}
                value={`${s.percentage || 0}%`}
                color={colors[s.type]}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* TABLE */}
      <Card title="Contract Type Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Contract</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3">{e.name}</td>
                  <td className="p-3">{e.department}</td>
                  <td className="p-3 font-semibold">{e.contract}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DOWNLOAD */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="rounded-full "
          onClick={onDownloadReport}
          disabled={downloading}
        >
          {downloading ? "Preparing..." : "Download Report"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function LegendRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
      </div>
      <span className="font-bold">{value}</span>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card text-card-foreground border p-5 shadow-sm">
      <div className="font-bold mb-4">{title}</div>
      {children}
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
