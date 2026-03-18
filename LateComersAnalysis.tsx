import { useEffect, useState } from "react";
import { Download, ChevronDown, AlertTriangle, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { cn } from "@/lib/utils";

import "@/utils/chartSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FilterControls from "@/components/FilterControls";

// Use explicit backend base to avoid Vite returning index.html in dev
const API_BASE = "http://localhost:8000/latecomers";

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// KPI Color Schemes
const kpiColorSchemes = {
  today: {
    light: { bg: "#E8F6F3", text: "#1E5047", label: "#5A8A83" },
    dark: { bg: "#0F3D38", text: "#A8D5D0", label: "#7FC3BA" },
  },
  avgMinutes: {
    light: { bg: "#F4E4F7", text: "#552D6F", label: "#8B5BA8" },
    dark: { bg: "#2A1545", text: "#D4A5D4", label: "#B896D1" },
  },
  institution: {
    light: { bg: "#FEF5E7", text: "#7D6608", label: "#B39E0D" },
    dark: { bg: "#3E3410", text: "#F0D9A0", label: "#D4B95F" },
  },
  highest: {
    light: { bg: "#FCEAEA", text: "#7D2D2D", label: "#B85555" },
    dark: { bg: "#3E2020", text: "#F0BABA", label: "#D48585" },
  },
};

// Chart Colors
const chartColors = {
  doughnut: [
    { light: "#4CAF50", dark: "#66BB6A" },     // Green
    { light: "#F5A623", dark: "#FFB74D" },     // Orange
    { light: "#4A7AFF", dark: "#64B5F6" },     // Blue
    { light: "#8B5CF6", dark: "#BA68C8" },     // Purple
    { light: "#EC4899", dark: "#F48FB1" },     // Pink
    { light: "#22C55E", dark: "#81C784" },     // Green
  ],
  barDept: [
    { light: "#EC4899", dark: "#F48FB1" },     // Pink
    { light: "#22C55E", dark: "#81C784" },     // Green
    { light: "#6EE7B7", dark: "#80DEEA" },     // Teal
    { light: "#8B5CF6", dark: "#BA68C8" },     // Purple
    { light: "#F59E0B", dark: "#FFB74D" },     // Amber
    { light: "#4F46E5", dark: "#64B5F6" },     // Blue
  ],
};

const getAxisColor = (isDark: boolean) => isDark ? "#F8FAFC" : "#475569";
const getGridColor = (isDark: boolean) => isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
