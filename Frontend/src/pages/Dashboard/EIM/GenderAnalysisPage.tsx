import { useEffect, useState } from "react";
import axios from "axios";
import { Doughnut } from "react-chartjs-2";
import { ChartOptions } from "chart.js";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api";

/* ================= TYPES ================= */

interface Employee {
  full_name: string;
  department_name: string;
  gender: string;
}

interface ApiResponse {
  summary: {
    male: number;
    female: number;
  };
  total: number;
  employees: Employee[];
}

/* ---------------- API BASE ---------------- */

/* ---------------- AUTH HEADER ---------------- */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
/* ================= COMPONENT ================= */

export default function ServiceYearAnalysis() {
  const isDark = document.documentElement.classList.contains("dark");

  const colors: { [key: string]: string } = {
    Male: "#2D74B2",
    Female: "#D16BA5",
  };

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [downloading, setDownloading] = useState(false);

  const token = localStorage.getItem("token");
 useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const res = await fetch(
          `${API_BASE}/eim/gender-analysis${
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

  /* ---------------- DOWNLOAD ---------------- */
  const onDownloadReport = async () => {
    setDownloading(true);

    try {
      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const res = await fetch(
        `${API_BASE}/eim/gender-analysis/report${
          qs.toString() ? `?${qs.toString()}` : ""
        }`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Gender_analysis_report.pdf";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading Staff Analysis...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-500">No data available</div>;
  }
  /* ================= DONUT DATA ================= */

  const donutData = {
    labels: ["Male", "Female"],
    datasets: [
      {
        data: [data.summary.male, data.summary.female],
        backgroundColor: ["#2D74B2", "#D16BA5"],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions: ChartOptions<"doughnut"> = {
    cutout: "65%",
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="p-8 space-y-8">

      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold">Gender Analysis</h1>

         <PerformanceFilters
                  dateRange={dateRange}
                  department={department}
                  location={location}
                  onDateRangeChange={setDateRange}
                  onDepartmentChange={setDepartment}
                  onLocationChange={setLocation}
                />
      </div>

      {/* ================= CHART SECTION ================= */}

        {/* Donut */}
        <Card title="Gender Distribution">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="h-[300px]">
          <Doughnut data={donutData} options={donutOptions} />
          </div>

          <div className="space-y-3 text-sm">
            {[
              { type: "Male", percentage: data.summary.male },
              { type: "Female", percentage: data.summary.female },
            ].map((s) => (
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

      {/* ================= TABLE SECTION ================= */}
 {/* TABLE */}
      <Card title="Contract Type Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Gender</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{emp.full_name}</td>
                  <td className="p-3">{emp.department_name}</td>
                  <td className="p-3">{emp.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div>
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