import { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

/* ---------------- API BASE URL ---------------- */

/* ---------------- TYPES ---------------- */

interface LocationChartItem {
  location: string;
  count: number;
}

interface EmployeeItem {
  name: string;
  department: string;
  location: string;
}

interface ApiResponse {
  kpis: {
    max_location: string;
    min_location: string;
    total_staff: number;
    total_locations: number;
  };
  chart: LocationChartItem[];
  employees: EmployeeItem[];
}

/* ---------------- API ---------------- */

const API_URL = `${API_BASE}/eim/location-wise-staff`;

/* ---------------- COMPONENT ---------------- */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function LocationWiseStaffDistribution() {
  const isDark = document.documentElement.classList.contains("dark");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<any>(null);
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  const axisColor = isDark ? "#E5E7EB" : "#374151";
  const gridColor = isDark ? "#374151" : "#E5E7EB";

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
        `${API_BASE}/eim/location-wise-staff${
          qs.toString() ? `?${qs.toString()}` : ""
        }`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

     
      if (!res.ok) {
        throw new Error("Failed to load data");
      }
     if (res.status === 401) {
        toast.error("Session expired. Please login again.");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load location-wise staff data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [dateRange, department, location]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load location-wise staff data</div>;

  /* ---------------- KPI DATA ---------------- */

  const kpis = [
    { title: "Locations with Max Staff", value: data.kpis.max_location },
    { title: "Location with Min Staff", value: data.kpis.min_location },
    { title: "Total Staff", value: String(data.kpis.total_staff) },
    { title: "Total Locations", value: String(data.kpis.total_locations) },
  ];

  /* ---------------- BAR CHART ---------------- */

  const chartData = {
    labels: data.chart.map((c) => c.location),
    datasets: [
      {
        label: "Staff Count",
        data: data.chart.map((c) => c.count),
        backgroundColor: [
          "#34D399",
          "#FB923C",
          "#F472B6",
          "#A3E635",
          "#FBBF24",
          "#9CA3AF",
        ],
        borderRadius: 8,
      },
    ],
  };

  const colors: { [key: string]: string } = {
    "#34D399": "#34D399",
    "#FB923C": "#FB923C",
    "#F472B6": "#F472B6",
    "#A3E635": "#A3E635",
    "#FBBF24": "#FBBF24",
    "#9CA3AF": "#9CA3AF",
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
    },
  };
 
const onDownloadReport = async () => {
  setDownloading(true);

  try {
    const qs = new URLSearchParams();
    if (dateRange) qs.set("dateRange", dateRange);
    if (department) qs.set("department", department);
    if (location) qs.set("location", location);

    const url = `${API_BASE}/eim/location-wise-staff/report${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    const res = await fetch(url, { headers: getAuthHeaders() });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Failed to download report");
    }

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "location_wise_staff_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(objectUrl);
  } catch (e: any) {
    toast.error(e?.message || "Failed to download report");
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
          Location-Wise Staff Distribution
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

      {/* KPI */}
      <div className="grid md:grid-cols-4 gap-6">
        {kpis.map((k, i) => (
          <StatCard 
        key={k.title} 
        title={k.title} 
        value={k.value}
        tone={["blue", "green", "yellow", "orange"][i % 4] as "blue" | "green" | "yellow" | "orange"}
          />
        ))}
      </div>

      {/* CHART */}
      <Card title="Location Distribution">
        <div className="h-[280px]">
          <Bar data={chartData} options={barOptions} />
        </div>

        <div className="space-y-3 text-sm">
          {data.chart.map((l, i) => (
            <LegendRow key={l.location} label={l.location} value={`${l.count}%`} color={["#34D399", "#FB923C", "#F472B6", "#A3E635", "#FBBF24", "#9CA3AF"][i % 6]} />
          ))}
        </div>
      </Card>

      {/* SUMMARY */}
      <Card title="Location Summary">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Staff Count</th>
              <th className="text-left p-3">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.chart.map((l) => (
              <tr key={l.location} className="border-b last:border-0">
                <td className="p-3">{l.location}</td>
                <td className="p-3">{l.count}</td>
                <td className="p-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${l.count}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* EMPLOYEES */}
      <Card title="Employee / Lecturer Details">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Department</th>
              <th className="text-left p-3">Location</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((e, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3">{e.name}</td>
                <td className="p-3">{e.department}</td>
                <td className="p-3">{e.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* DOWNLOAD */}
      <div className="flex justify-end">
             <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={onDownloadReport}
                    disabled={downloading}
                  >
                    {downloading ? "Preparing..." : "Download Report"}
              </Button>
            </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="text-m text-muted-foreground">{title}</div>
      <div className="text-xl font-bold mt-2">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground p-5 shadow-sm ">
      <div className="font-bold mb-4">{title}</div>
      {children}
    </div>
  )
}

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