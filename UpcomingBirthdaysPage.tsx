import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import PerformanceFilters from "@/components/PerformanceFilters";

/* ================= TYPES ================= */
interface Birthday {
  name: string;
  department: string;
  birthday: string;
  days_left: string;
  tag: string;
}

interface Highlight {
  name: string;
  department: string;
  date: string;
}

interface ApiResponse {
  highlights: Highlight[];
  table: Birthday[];
}

/* ================= API URL ================= */
const API_URL = "http://localhost:8000/eim/upcoming-birthdays";
const REPORT_URL = "http://localhost:8000/eim/upcoming-birthdays/report";

/* ================= COMPONENT ================= */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


export default function UpcomingBirthdays() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [dateRange, setDateRange] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");

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

      if (res.status === 401) {
        setData(null);
        toast.error("Session expired. Please login again.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load data");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setData(null);
      toast.error("Failed to load upcoming birthdays data");
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
        a.download = "upcoming_birthdays_report.pdf";
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
  
    if (loading) return <div className="p-6">Loading upcoming birthdays...</div>;
    if (!data) return <div className="p-6 text-red-500">Failed to load data</div>;

  /* ================= GET TAG COLOR ================= */
  const getTagColor = (tag: string) => {
    switch (tag) {
      case "This Week":
        return "bg-indigo-600 text-white";
      case "Soon":
        return "bg-indigo-500 text-white";
      case "Next Month":
        return "bg-indigo-400 text-white";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  /* ================= FORMAT DATE ================= */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  /* ================= UI ================= */
  return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl  font-extrabold">
            Upcoming Birthdays
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

        {/* HIGHLIGHTS SECTION */}
        <div className=" rounded-xl p-6 shadow-sm border bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">🎉</span>
            <h2 className="text-lg font-semibold">Upcoming Birthdays</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.highlights.map((h, i) => (
              <div
                key={i}
                className="relative p-5 border-l-4 border-red-400 bg-pink-50 rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-1">{h.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{h.department}</p>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <span>🎂</span>
                  <span>{formatDate(h.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className=" rounded-xl shadow-sm border overflow-hidden bg-card text-card-foreground">
          <div className="p-6 border-b border-gray-300">
            <h2 className="text-lg font-semibold">Upcoming Birthdays</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing employees with birthdays in the next 30 days
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className=" border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider">
                    Birthday
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider">
                    Days Left
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider">
                    Tag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.table.length > 0 ? (
                  data.table.map((emp, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {emp.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {emp.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(emp.birthday)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {emp.days_left}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(emp.tag)}`}>
                          {emp.tag}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      No upcoming birthdays in the next 30 days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          
        </div>

      </div>
  );
}
