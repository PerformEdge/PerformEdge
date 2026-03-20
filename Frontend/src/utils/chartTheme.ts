import { Chart as ChartJS } from "chart.js";

export type ChartTheme = "light" | "dark";

export function applyChartTheme(theme: ChartTheme) {
  const isDark = theme === "dark";
  const defaults = ChartJS.defaults as any;

  defaults.plugins ??= {};
  defaults.plugins.legend ??= {};
  defaults.plugins.legend.labels ??= {};
  defaults.plugins.tooltip ??= {};

  ChartJS.defaults.color = isDark ? "#E5E7EB" : "#374151";
  ChartJS.defaults.borderColor = isDark ? "#374151" : "#E5E7EB";

  defaults.plugins.legend.labels.color = isDark
    ? "#E5E7EB"
    : "#374151";

  defaults.plugins.tooltip.backgroundColor = isDark
    ? "#020617"
    : "#FFFFFF";

  defaults.plugins.tooltip.titleColor = isDark
    ? "#F9FAFB"
    : "#111827";

  defaults.plugins.tooltip.bodyColor = isDark
    ? "#E5E7EB"
    : "#374151";

  defaults.plugins.tooltip.borderColor = isDark
    ? "#1F2937"
    : "#E5E7EB";

  defaults.plugins.tooltip.borderWidth = 1;
}
