import { Chart as ChartJS } from "chart.js";

export type ChartTheme = "light" | "dark";

export function applyChartTheme(theme: ChartTheme) {
  const isDark = theme === "dark";

  ChartJS.defaults.color = isDark ? "#E5E7EB" : "#374151";
  ChartJS.defaults.borderColor = isDark ? "#374151" : "#E5E7EB";

  ChartJS.defaults.plugins.legend.labels.color = isDark
    ? "#E5E7EB"
    : "#374151";

  ChartJS.defaults.plugins.tooltip.backgroundColor = isDark
    ? "#020617"
    : "#FFFFFF";

  ChartJS.defaults.plugins.tooltip.titleColor = isDark
    ? "#F9FAFB"
    : "#111827";

  ChartJS.defaults.plugins.tooltip.bodyColor = isDark
    ? "#E5E7EB"
    : "#374151";

  ChartJS.defaults.plugins.tooltip.borderColor = isDark
    ? "#1F2937"
    : "#E5E7EB";

  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
}
