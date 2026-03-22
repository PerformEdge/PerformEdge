import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

/* ---------------- API BASE ---------------- */
const API_BASE = "https://performedge.onrender.com";

/* ---------------- TYPES ---------------- */
interface ApiResponse {
  chart: {
    labels: string[];
    values: number[];
  };
  loyalty_index: number;
  top_long_serving: {
    name: string;
    years: number;
  }[];
  staff: {
    name: string;
    department: string;
    years: string;
  }[];
}

/* ---------------- AUTH HEADER ---------------- */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ---------------- COMPONENT ---------------- */
export default function ServiceYearAnalysis() {
  const isDark = document.documentElement.classList.contains("dark");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [downloading, setDownloading] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const res = await fetch(
          `${API_BASE}/eim/service-year-analysis${
            qs.toString() ? `?${qs.toString()}` : ""
          }`,
          {  method: "GET", headers: getAuthHeaders() }
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
        toast.error("Failed to load service year data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, department, location]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load data</div>;

  /* ---------------- CHART ---------------- */
  const chartData = {
    labels: data.chart.labels,
    datasets: [
      {
        label: "Staff",
        data: data.chart.values,
        fill: true,
        tension: 0.4,
        borderColor: "#EF4444",
        backgroundColor: "rgba(239,68,68,0.25)",
        pointRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isDark ? "#ffffff" : "#000000",
        },
      },
    },
  };

  /* ---------------- DOWNLOAD ---------------- */
  const onDownloadReport = async () => {
    setDownloading(true);

    try {
      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const res = await fetch(
        `${API_BASE}/eim/service-year-analysis/report${
          qs.toString() ? `?${qs.toString()}` : ""
        }`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "service_year_analysis_report.pdf";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-extrabold">Service Year Analysis</h1>

        <PerformanceFilters
          dateRange={dateRange}
          department={department}
          location={location}
          onDateRangeChange={setDateRange}
          onDepartmentChange={setDepartment}
          onLocationChange={setLocation}
        />
      </div>

      <Card title="Service Year Analysis">
        <div className="h-[320px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Loyalty Index">
          <div className="text-sm text-muted-foreground">Loyalty Index</div>
          <div className="text-3xl font-bold mt-2">
            {data.loyalty_index}%
          </div>
        </Card>

        <Card title="Top Long-Serving Staff">
          <div className="text-sm text-muted-foreground">
            Top Long-Serving
          </div>
          {data.top_long_serving.map((e, i) => (
            <div key={i}>
              {e.name} ({e.years} yrs)
            </div>
          ))}
        </Card>
      </div>

      <Card title="Staff Service Years">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Name</th>
            <th className="py-2">Department</th>
            <th className="py-2">Years</th>
          </tr>
        </thead>
        <tbody>
          {data.staff.map((s, i) => (
            <tr key={i} className="border-b last:border-b-0">
          <td className="py-2">{s.name}</td>
          <td className="py-2">{s.department}</td>
          <td className="py-2">{s.years}</td>
            </tr>
          ))}
        </tbody>
          </table>
        </div>
      </Card>

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

/* ---------------- CARD ---------------- */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground p-5 shadow-sm">
      <div className="font-bold mb-4">{title}</div>
      {children}
    </div>
  );
}