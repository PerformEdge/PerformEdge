import { useEffect, useState } from "react";
import { Pie, Bar, Line, Doughnut } from "react-chartjs-2";
import "@/utils/chartSetup";
import PerformanceFilters from "@/components/PerformanceFilters";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, UserX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

/* ================= API ================= */

/* ================= TYPES ================= */

interface DashboardResponse {
  kpis: {
    total_employees: number;
    new_joiners: number;
    resigned_staff: number;
    avg_service_years: number;
  };
  charts: {
    gender: { label: string; value: number }[];
    age: { label: string; value: number }[];
    staff_trend: {
      labels: string[];
      joiners: number[];
      resignations: number[];
    };
    location: { label: string; value: number }[];
    category: { label: string; value: number }[];
    contract_type: { label: string; percentage: number }[];
  };
  birthdays: {
    name: string;
    date: string;
    department?: string;
  }[];
  
}

function normalizeDashboardResponse(raw: any): DashboardResponse {
  const safeKpis = raw?.kpis ?? {};
  const safeCharts = raw?.charts ?? {};

  const toArray = (value: any) => (Array.isArray(value) ? value : []);

  return {
    kpis: {
      total_employees: Number(safeKpis.total_employees ?? 0),
      new_joiners: Number(safeKpis.new_joiners ?? 0),
      resigned_staff: Number(safeKpis.resigned_staff ?? 0),
      avg_service_years: Number(safeKpis.avg_service_years ?? 0),
    },
    charts: {
      gender: toArray(safeCharts.gender).map((g: any) => ({
        label: String(g?.label ?? "Unknown"),
        value: Number(g?.value ?? 0),
      })),
      age: toArray(safeCharts.age).map((a: any) => ({
        label: String(a?.label ?? "Unknown"),
        value: Number(a?.value ?? 0),
      })),
      staff_trend: {
        labels: toArray(safeCharts?.staff_trend?.labels).map((x: any) => String(x ?? "")),
        joiners: toArray(safeCharts?.staff_trend?.joiners).map((x: any) => Number(x ?? 0)),
        resignations: toArray(safeCharts?.staff_trend?.resignations).map((x: any) => Number(x ?? 0)),
      },
      location: toArray(safeCharts.location).map((l: any) => ({
        label: String(l?.label ?? "Unknown"),
        value: Number(l?.value ?? 0),
      })),
      category: toArray(safeCharts.category).map((c: any) => ({
        label: String(c?.label ?? "Unknown"),
        value: Number(c?.value ?? 0),
      })),
      contract_type: toArray(safeCharts.contract_type).map((c: any) => ({
        label: String(c?.label ?? "Unknown"),
        percentage: Number(c?.percentage ?? 0),
      })),
    },
    birthdays: toArray(raw?.birthdays).map((b: any) => ({
      name: String(b?.name ?? "Unknown"),
      date: String(b?.date ?? ""),
      department: b?.department ? String(b.department) : "Unknown Department",
    })),
  };
}

/* ================= AUTH HEADER ================= */

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ================= COMPONENT ================= */

export default function EIMDashboard() {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const axisColor = isDark ? "#E5E7EB" : "#374151";
  const gridColor = isDark ? "#374151" : "#E5E7EB";

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [downloading, setDownloading] = useState(false);

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
          `${API_BASE}/eim/dashboard${
            qs.toString() ? `?${qs.toString()}` : ""
          }`,
          { headers: getAuthHeaders() }
        );

        if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }

        if (!res.ok) throw new Error("Failed to load dashboard");

        const json = await res.json();
        setData(normalizeDashboardResponse(json));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load EIM dashboard");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, department, location]);

  /* ================= DOWNLOAD REPORT ================= */
const chartOptions = {
  plugins: {
    legend: {
      labels: { color: axisColor },
    },
  },
  scales: {
    x: {
      ticks: { color: axisColor },
      grid: { color: gridColor },
    },
    y: {
      ticks: { color: axisColor },
      grid: { color: gridColor },
    },
  },
};

  const onDownloadReport = async () => {
    try {
      setDownloading(true);

      const res = await fetch(`${API_BASE}/eim/dashboard/report`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "eim_dashboard_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-red-500">No data available</div>;

  /* ================= KPI ================= */

 const kpis = [
    {
      icon: Users,
      title: "Total Employees",
      value: data.kpis.total_employees,

    },
    {
      icon: UserPlus,
      title: "New Joiners",
      value: data.kpis.new_joiners,

    },
    {
      icon: UserX,
      title: "Resigned Staff",
      value: data.kpis.resigned_staff,

    },
    {
      icon: Clock,
      title: "Avg. Service Years",
      value: data.kpis.avg_service_years,

    },
  ];

  /* ================= CHART DATA ================= */

  const genderChart = {
    labels: data.charts.gender.map(g => g.label),
    datasets: [
      {
        data: data.charts.gender.map(g => g.value),
        backgroundColor: data.charts.gender.map(g => 
          g.label.toLowerCase() === "male" ? "#2D74B2" : "#D16BA5"
        ),
      },
    ],
  };

  const ageGroups = ["18-25", "25-35", "36-45", "46-55", "55+"];

const ageChart = {
  labels: ageGroups,
  datasets: [
    {
      label: "age distribution",
      data: ageGroups.map(group => {
        const found = data.charts.age.find(a => a.label === group || (group === "18-25" && a.label === "-25"));
        return found ? found.value : 0;
      }),
      backgroundColor: [
      "#FFD1DC", // pink
      "#B0E0E6", // light blue
      "#C1E1C1", // mint green
      "#FFE4B5", // pastel orange
      "#D8BFD8", // thistle
      "#F5DEB3", // wheat
      ],
    },
  ],
};

  const trendChart = {
    labels: data.charts.staff_trend.labels,
    datasets: [
      {
        label: "Joiners",
        data: data.charts.staff_trend.joiners,
        borderColor: "#22C55E",
        fill: true,
      },
      {
        label: "Resignations",
        data: data.charts.staff_trend.resignations,
        borderColor: "#EF4444",
        fill: true,
      },
    ],
  };

  const locationChart = {
    labels: data.charts.location.map(l => l.label),
    datasets: [
      {
        label: "Location Distribution",
        data: data.charts.location.map(l => l.value),
        backgroundColor: [
          "#34D399",
          "#FB923C",
          "#F472B6",
          "#A3E635",
          "#FBBF24",
          "#9CA3AF",
        ],
        
      },
    ],
  };
  const categoryChart = {
  labels: data.charts.category.map(ca => ca.label),
  datasets: [
    {
      data: data.charts.category.map(ca => ca.value),
      backgroundColor: [
       "#3B82F6",
       "#F59E0B",
      ],
    },
  ],
};

  const contractChart = {
  labels: data.charts.contract_type.map(c => c.label),
  datasets: [
    {
      data: data.charts.contract_type.map(c => c.percentage),
      backgroundColor: [
        "#3B82F6",  // Permanent
        "#F59E0B",  // Consultants
        "#EC4899",  // Probation
      ],
    },
  ],
};

 

  /* ================= UI ================= */

  return (
    <div className="space-y-7 p-4 md:p-7">

      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl md:text-3xl font-extrabold">EIM Dashboard</h1>

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
      <div className="grid md:grid-cols-4 gap-5">
        {kpis.map((k) => (
          <StatCard
        key={k.title}
        title={k.title}
        value={String(k.value)}
        tone={
          k.title === "Total Employees" ? "blue" :
          k.title === "New Joiners" ? "green" :
          k.title === "Resigned Staff" ? "yellow" :
          "orange"
        }
          />
        ))}
      </div>

      {/* CHART GRID */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Gender Analysis">
          <div className="h-[280px] flex items-center justify-center">
            <div className="w-full max-w-[320px]">
              <Doughnut data={genderChart} options={chartOptions} />
            </div>
          </div>
        </Card>

        <Card title="Age Analysis">
          <div className="h-[280px] flex items-center justify-center">
            <Bar data={ageChart} options={chartOptions} />
          </div>
        </Card>

        <Card title="Staff Trend">
          <div className="h-[280px] flex items-center justify-center">
            <Line data={trendChart} options={chartOptions} />
          </div>
        </Card>
        
        
        <Card title="Category Type Distribution">
          <div className="h-[280px] flex items-center justify-center">
            <div className="w-full max-w-[320px]">
              <Doughnut data={categoryChart} options={chartOptions} />
            </div>
          </div>
        </Card>

        <Card title="Location Distribution">
          <div className="h-[280px] flex items-center justify-center">
            <Bar data={locationChart} options={chartOptions} />
          </div>
        </Card>
        <Card title="Contract Type Distribution">
          <div className="h-[280px] flex items-center justify-center">
            <div className="w-full max-w-[320px]">
              <Doughnut data={contractChart} options={chartOptions} />
            </div>
          </div>
        </Card>
      </div>

      {/* BIRTHDAYS */}
<Card title="🎉 Upcoming Birthdays">
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
    {data.birthdays.length > 0 ? data.birthdays.map((b) => (
      <div
        key={`${b.name}-${b.date}`}
        className="relative rounded-lg border border-border/60 bg-muted/40 p-4"
      >
        <div className="pl-2 border-l-2 border-primary/60">
          <div className="font-semibold text-base text-foreground">
            {b.name}
          </div>

          <div className="text-sm text-muted-foreground mt-1">
            {b.department || "Unknown Department"}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            🎂 {b.date}
          </div>
        </div>
      </div>
    )) : (
      <div className="col-span-full text-sm text-muted-foreground">No upcoming birthdays in the selected period.</div>
    )}
  </div>
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

/* ================= CARD ================= */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground border-border/60 bg-background p-4 md:p-5 shadow-sm">
      <div className="font-semibold mb-3 text-base">{title}</div>
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
    <div className={cn("rounded-xl p-4 md:p-5 text-center shadow-sm border border-border/60", cls)}>
      <div className="text-xs md:text-sm font-semibold text-foreground/70">{title}</div>
      <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
    </div>
  );
}