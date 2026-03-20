import { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import type { ChartOptions } from "chart.js";


/* ================= TYPES ================= */
interface AgeGroup {
  label: string;
  total: number;
  male: number;
  female: number;
}

interface AgeRow {
  name: string;
  age: number;
  department: string;
}

interface ApiResponse {
  distribution: AgeGroup[];
  table: AgeRow[];
}

/* ================= API ================= */
const API_URL = "http://localhost:8000/eim/age-analysis";
const REPORT_URL = "http://localhost:8000/eim/age-analysis/report";

/* ================= COMPONENT ================= */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


export default function AgeAnalysisDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [dateRange, setDateRange] = useState<any>(null);
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const token = localStorage.getItem("token");

  /* ================= FETCH DATA ================= */
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const res = await fetch(
        `${API_URL}${qs.toString() ? `?${qs.toString()}` : ""}`,
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


  /* ================= DOWNLOAD PDF ================= */
  const onDownloadReport = async () => {
    setDownloading(true);
  
    try {
      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);
  
      const url = `${REPORT_URL}${
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

  if (loading) return <div className="p-6">Loading Age Analysis...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load data</div>;

  /* ================= AGE DISTRIBUTION CHART ================= */
  const pastelColors = [
  "#FFD1DC", // pink
  "#B0E0E6", // light blue
  "#C1E1C1", // mint green
  "#FFE4B5", // pastel orange
  "#D8BFD8", // thistle
  "#F5DEB3", // wheat
];

const ageBarData = {
  labels: data.distribution.map((a) => a.label),
  datasets: [
    {
      label: "Employees",
      data: data.distribution.map((a) => a.total),
      backgroundColor: pastelColors, // <-- array of colors
      borderRadius: 8,
    },
  ],
};

  const ageBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "#E5E7EB" } },
    },
  };

  /* ================= POPULATION PYRAMID ================= */
  const pyramidData = {
    labels: data.distribution.map((a) => a.label),
    datasets: [
      {
        label: "Male",
        data: data.distribution.map((a) => -a.male),
        backgroundColor: "#2563EB",
      },
      {
        label: "Female",
        data: data.distribution.map((a) => a.female),
        backgroundColor: "#EC4899",
      },
    ],
  };

  const pyramidOptions: ChartOptions<"bar"> = {
    responsive: true,
    indexAxis: "y",
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { ticks: { callback: (v) => Math.abs(Number(v)) }, grid: { color: "#E5E7EB" } },
      y: { grid: { display: false } },
    },
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
              <h1 className="text-2xl font-extrabold">
                Employee Age Analysis
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

      {/* AGE DISTRIBUTION */}
      <Card title="Age Distribution">
        <div className="h-[280px]">
          <Bar data={ageBarData} options={ageBarOptions} />
        </div>
      </Card>

      {/* POPULATION PYRAMID */}
      <Card title="Population Pyramid (Male/Female)">
        <div className="h-[320px]">
          <Bar data={pyramidData} options={pyramidOptions} />
        </div>
      </Card>

      {/* TABLE */}
      <Card title="Employee Age Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Age</th>
                <th className="p-3 text-left">Department</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3">{row.name}</td>
                  <td className="p-3 font-semibold">{row.age}</td>
                  <td className="p-3">{row.department}</td>
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

/* ================= CARD COMPONENT ================= */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card  text-card-foreground border p-5 shadow-sm">
      <div className="font-bold mb-4">{title}</div>
      {children}
    </div>
  );
}