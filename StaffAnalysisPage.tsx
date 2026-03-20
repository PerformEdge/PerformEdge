import { useEffect, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Users, UserPlus, UserX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

/* TYPES */

interface ApiResponse {
  kpis: {
    total_staff: number;
    new_joiners: number;
    resigned_staff: number;
    pending_recruit: number;
  };
  trend: {
    months: string[];
    new_joiners: number[];
    resigned: number[];
  };
  distribution: {
    new_joiners: number;
    current_staff: number;
    resigned: number;
  };
  new_joiners_list: {
    name: string;
    department: string;
    date: string;
  }[];
  resigned_list: {
    name: string;
    department: string;
    date: string;
  }[];
}


/*  AUTH HEADER  */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


/*  COMPONENT  */

export default function StaffAnalysis() {
  const isDark = document.documentElement.classList.contains("dark");
  const axisColor = isDark ? "#E5E7EB" : "#374151";
  const gridColor = isDark ? "#374151" : "#E5E7EB";

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  /* FETCH DATA */

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const url = `${API_BASE}/eim/staff-analysis${
          qs.toString() ? `?${qs.toString()}` : ""
        }`;

        const res = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch staff analysis");
        }
        if (res.status === 401) {
        toast.error("Session expired. Please login again.");
        return;
      }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load staff analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, department, location]);

  if (loading) {
    return <div className="p-6">Loading Staff Analysis...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-500">No data available</div>;
  }

  /* LINE CHART  */

  const lineData = {
    labels: data.trend.months,
    datasets: [
      {
        label: "New Joiners",
        data: data.trend.new_joiners,
        borderColor: "#22C55E",
        backgroundColor: "rgba(34,197,94,0.25)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Resigned",
        data: data.trend.resigned,
        borderColor: "#EF4444",
        backgroundColor: "rgba(239,68,68,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: axisColor } },
    },
    scales: {
      x: { ticks: { color: axisColor }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
    },
  };

  /*  DONUT  */

  const donutData = {
    labels: ["New Joiners", "Current Staff", "Resigned"],
    datasets: [
      {
        data: [
          data.distribution.new_joiners,
          data.distribution.current_staff,
          data.distribution.resigned,
        ],
        backgroundColor: ["#3B82F6", "#22C55E", "#EF4444"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: axisColor },
      },
    },
  };

  /*  DOWNLOAD  */

  const onDownloadReport = async () => {
    try {
      setDownloading(true);

      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const url = `${API_BASE}/eim/staff-analysis/report${
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
      a.download = "staff_analysis_report.pdf";
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

  /*  UI  */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-extrabold">Staff Analysis</h1>

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
        <StatCard title="Total Staff" value={data.kpis.total_staff.toString()} tone="blue" />
        <StatCard title="New Joiners" value={data.kpis.new_joiners.toString()} tone="green" />
        <StatCard title="Resigned Staff" value={data.kpis.resigned_staff.toString()} tone="yellow" />
        <StatCard title="Pending Recruit" value={data.kpis.pending_recruit.toString()} tone="orange" />
      </div>

      {/* LINE CHART */}
      <Card title="Joiners vs Resignations">
        <div className="h-[240px]">
          <Line data={lineData} options={lineOptions} />
        </div>
      </Card>

      {/* DONUT + TABLE */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Staff Distribution">
          <div className="h-[240px] flex items-center justify-center">
            <Pie data={donutData} options={donutOptions} />
          </div>
        </Card>

        <Card title="New Joiners (Latest 5)">
          <SimpleTable
            headers={["Name", "Department", "Date"]}
            rows={data.new_joiners_list.map((j) => [
              j.name,
              j.department,
              j.date,
            ])}
          />
        </Card>
      </div>

      <Card title="Resigned Employees (Latest 5)">
        <SimpleTable
          headers={["Name", "Department", "Date"]}
          rows={data.resigned_list.map((r) => [
            r.name,
            r.department,
            r.date,
          ])}
        />
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

/*  UI HELPERS  */

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
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card text-card-foreground border p-5 shadow-sm">
      <div className="font-bold mb-4">{title}</div>
      {children}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left p-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) => (
                <td key={j} className="p-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
