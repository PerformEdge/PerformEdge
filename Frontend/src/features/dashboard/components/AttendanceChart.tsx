import { Card } from "@/components/ui/card";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/utils/chartSetup";

const attendanceData = [
  { name: "Mon", present: 92, absent: 8 },
  { name: "Tue", present: 88, absent: 12 },
  { name: "Wed", present: 90, absent: 10 },
  { name: "Thu", present: 94, absent: 6 },
  { name: "Fri", present: 91, absent: 9 },
];

export function AttendanceChart() {
  const data = {
    labels: attendanceData.map((d) => d.name),
    datasets: [
      {
        label: "Present",
        data: attendanceData.map((d) => d.present),
        backgroundColor: "hsl(var(--chart-1))",
        borderRadius: 8,
      },
      {
        label: "Absent",
        data: attendanceData.map((d) => d.absent),
        backgroundColor: "hsl(var(--chart-3))",
        borderRadius: 8,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true },
    },
  };

  return (
    <Card className="p-4 h-[300px]">
      <Bar data={data} options={options} />
    </Card>
  );
}
