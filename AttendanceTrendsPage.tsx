"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import FilterControls from "@/components/FilterControls";
import type { ChartOptions } from "chart.js";

import "@/utils/chartSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// Color schemes for KPI cards
const kpiColorScheme = {
  employees: {
    light: { bg: "#E8F6F3", text: "#1E5047", label: "#5A8A83" },
    dark: { bg: "#0F3D38", text: "#A8D5D0", label: "#7FC3BA" },
  },
  absentee: {
    light: { bg: "#F4E4F7", text: "#552D6F", label: "#8B5BA8" },
    dark: { bg: "#2A1545", text: "#D4A5D4", label: "#B896D1" },
  },
  highest: {
    light: { bg: "#FEF5E7", text: "#7D6608", label: "#B39E0D" },
    dark: { bg: "#3E3410", text: "#F0D9A0", label: "#D4B95F" },
  },
  concern: {
    light: { bg: "#FCEAEA", text: "#7D2D2D", label: "#B85555" },
    dark: { bg: "#3E2020", text: "#F0BABA", label: "#D48585" },
  },
};

// Chart color palettes
const chartColors = {
  trendBars: [
    { light: "#EF4444", dark: "#FF6B6B" },  // Red
    { light: "#F87171", dark: "#FF8A8A" },  // Light Red
    { light: "#FB923C", dark: "#FFB366" },  // Orange
    { light: "#DC2626", dark: "#FF5252" },  // Dark Red
    { light: "#EA580C", dark: "#FF7043" },  // Dark Orange
  ],
  departmentAvg: [
    { light: "#1B86BB", dark: "#64B5F6" },  // Blue
    { light: "#4BB05C", dark: "#81C784" },  // Green
    { light: "#E6E15F", dark: "#FFD54F" },  // Yellow
    { light: "#850D4B", dark: "#EC407A" },  // Pink
  ],
  lineChart1: {
    light: "#3B82F6",
    dark: "#64B5F6",
  },
  lineChart2: {
    light: "#8B5CF6",
    dark: "#BA68C8",
  },
};

const getAxisColor = (isDark: boolean) => isDark ? "#F8FAFC" : "#475569";
const getGridColor = (isDark: boolean) => isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
