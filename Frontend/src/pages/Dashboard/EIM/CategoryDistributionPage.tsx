import { useEffect, useState } from "react";
import axios from "axios";
import { Doughnut } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

interface ApiResponse {
  labels: string[];
  values: number[];
  total_staff: number;
  summary: { type: string; percentage: number }[];
  employees: { name: string; department: string; category: string }[];
}

const API_Base = API_BASE;

const colors: { [key: string]: string } = {
  "Acedemic": "#2663c4",
  "administrative": "#8abc0d",
};

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function CategoryDistribution() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [location, setLocation] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const isDark = document.documentElement.classList.contains("dark");

 useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const qs = new URLSearchParams();
        if (dateRange) qs.set("dateRange", dateRange);
        if (department) qs.set("department", department);
        if (location) qs.set("location", location);

        const res = await fetch(
          `${API_Base}/eim/category-distribution${
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
        toast.error("Failed to load category distribution data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, department, location]);

  const onDownloadReport = async () => {
    try {
      setDownloading(true);

      const qs = new URLSearchParams();
      if (dateRange) qs.set("dateRange", dateRange);
      if (department) qs.set("department", department);
      if (location) qs.set("location", location);

      const url = `${API_Base}/eim/category-distribution/report${
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
      a.download = "category_type_distribution_report.pdf";
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

  if (loading) return <p>Loading category distribution...</p>;
  if (!data) return <p>No data available</p>;
  
const colors: Record<string, string> = {
    Academic: "#3B82F6",
    Administrative: "#F59E0B",
    
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
        color: isDark ? "#FFFFFF" : "#374151",
        font: { weight: "bold" as const },
      },
    },
  },
};

  return (
     <div className="space-y-6 p-6">
          {/* HEADER */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h1 className="text-2xl font-extrabold">
              Category Type Distribution
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

      <Card title="Category Type Distribution">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="h-[300px]">
                  <Doughnut data={chartData} options={chartOptions} />
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
            <Card title="Category Type Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Department</th>
                      <th className="text-left p-3">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3">{e.name}</td>
                        <td className="p-3">{e.department}</td>
                        <td className="p-3 font-semibold">{e.category}</td>
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
/* ---------------- CHART OPTIONS ---------------- */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card text-card-foreground border p-5 shadow-sm">
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