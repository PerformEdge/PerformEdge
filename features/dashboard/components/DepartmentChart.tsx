import { Card } from "@/components/ui/card";
import { Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/utils/chartSetup";

const departmentData = [
  { name: "HR", value: 20 },
  { name: "IT", value: 35 },
  { name: "Marketing", value: 25 },
  { name: "Sales", value: 20 },
];

export function DepartmentChart() {
  const data = {
    labels: departmentData.map((d) => d.name),
    datasets: [
      {
        data: departmentData.map((d) => d.value),
        backgroundColor: [
          "hsl(var(--chart-1))",
          "hsl(var(--chart-2))",
          "hsl(var(--chart-3))",
          "hsl(var(--chart-4))",
        ],
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    cutout: "65%",
  };

  return (
    <Card className="p-4 h-[300px]">
      <Doughnut data={data} options={options} />
    </Card>
  );
}
