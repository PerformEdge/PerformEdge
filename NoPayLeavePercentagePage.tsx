import { useEffect, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

import "@/utils/chartSetup";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const API_BASE = "http://localhost:8000";

/* ================= THEME HELPERS ================= */
function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const getAxisColor = (dark: boolean) => (dark ? "#F8FAFC" : "#475569");
const getGridColor = (dark: boolean) => (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");

const kpiColorSchemes = {
  total: { light: { bg: "#E8F6F3", text: "#1E5047", label: "#5A8A83" }, dark: { bg: "#0F3D38", text: "#A8D5D0", label: "#7FC3BA" } },
  affected: { light: { bg: "#F4E4F7", text: "#522E66", label: "#8B5BA8" }, dark: { bg: "#2A1545", text: "#D4A5D4", label: "#B896D1" } },
  percentage: { light: { bg: "#FEF5E7", text: "#7D6608", label: "#B39E0D" }, dark: { bg: "#3E3410", text: "#F0D9A0", label: "#D4B95F" } },
  trend: { light: { bg: "#FCEAEA", text: "#7D2D2D", label: "#B85555" }, dark: { bg: "#3E2020", text: "#F0BABA", label: "#D48585" } },
};

const chartPalettes = {
  donut: ["#22C55E", "#F59E0B", "#3B82F6", "#8B5CF6", "#F43F5E", "#F97316"],
  bar: ["#F5A623", "#4F46E5", "#EC4899", "#22C55E", "#34D399", "#8B5CF6"],
};

import FilterControls from "@/components/FilterControls";
