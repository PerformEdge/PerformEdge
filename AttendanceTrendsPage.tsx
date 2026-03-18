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

export default function AttendanceTrendsPage() {
  const API_BASE = "http://localhost:8000";
  const [kpis, setKpis] = useState({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
  const [last5Days, setLast5Days] = useState<{ day: string; absent: number }[]>([]);
  const [avgByDept, setAvgByDept] = useState<{ dept: string; rate: number }[]>([]);
  const [dailyByDept, setDailyByDept] = useState<any>({ labels: [], datasets: [] });
  const [deptBreakdown, setDeptBreakdown] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const dark = isDarkMode();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        const res = await fetch(`${API_BASE}/attendance/latest-date`);
        const data = await res.json();
        if (data?.start && data?.end) {
          setStart(data.start);
          setEnd(data.end);
          return;
        }
      } catch {
      }

      const today = new Date();
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setStart(s.toISOString().split("T")[0]);
      setEnd(today.toISOString().split("T")[0]);
    };
    initializeDateRange();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!start || !end) return;
      if (start > end) {
        setErrorMessage("Start date must be before or equal to end date.");
        setLast5Days([]);
        setAvgByDept([]);
        setDailyByDept({ labels: [], datasets: [] });
        setDeptBreakdown([]);
        setKpis({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
        return;
      }
      try {
        setErrorMessage("");
        const qp = (path: string, includeDept = true, includeLoc = true) => {
          const params = new URLSearchParams();
          params.set('start', start);
          params.set('end', end);
          if (includeDept && department && department !== 'All') params.set('department', department);
          if (includeLoc && locationFilter && locationFilter !== 'All') params.set('location', locationFilter);
          return `${API_BASE}${path}?${params.toString()}`;
        };

        const [last5Res, avgRes, dailyRes, breakdownRes] = await Promise.all([
          fetch(qp('/attendance-trends/last-5-days', false, false)),
          fetch(qp('/attendance-trends/avg-by-department')),
          fetch(qp('/attendance-trends/daily-by-department')),
          fetch(qp('/attendance-trends/dept-breakdown')),
        ]);

        const [resLast5Raw, resAvgRaw, resDailyRaw, resBreakdownRaw] = await Promise.all([
          last5Res.json().catch(() => []),
          avgRes.json().catch(() => []),
          dailyRes.json().catch(() => ({ labels: [], datasets: [] })),
          breakdownRes.json().catch(() => []),
        ]);

        if (!last5Res.ok || !avgRes.ok || !dailyRes.ok || !breakdownRes.ok) {
          const detail = (resLast5Raw as any)?.detail || (resAvgRaw as any)?.detail || (resDailyRaw as any)?.detail || (resBreakdownRaw as any)?.detail;
          throw new Error(detail || "Failed to load attendance trends data.");
        }

        const resLast5 = Array.isArray(resLast5Raw) ? resLast5Raw : [];
        const resAvg = Array.isArray(resAvgRaw) ? resAvgRaw : [];
        const resDaily = (resDailyRaw && typeof resDailyRaw === "object") ? resDailyRaw : { labels: [], datasets: [] };
        const resBreakdown = Array.isArray(resBreakdownRaw) ? resBreakdownRaw : [];

        setLast5Days(resLast5 || []);
        setAvgByDept(resAvg || []);
        setDailyByDept(resDaily || { labels: [], datasets: [] });
        setDeptBreakdown(resBreakdown || []);

        // Calculate KPI values
        const totalEmps = resBreakdown.length ? resBreakdown.reduce((a, c) => a + (c.staff || 0), 0) : 0;
        const avgRate = resAvg.length ? (resAvg.reduce((a, c) => a + (c.rate || 0), 0) / resAvg.length).toFixed(1) : "0";
        const highDay = resLast5.length ? resLast5.reduce((a, c) => (c.absent > a.absent ? c : a), resLast5[0]) : null;
        const topD = resAvg.length ? resAvg.reduce((a, c) => (c.rate > a.rate ? c : a), resAvg[0]) : null;

        setKpis({
          employees: totalEmps,
          absenteeRate: parseFloat(avgRate),
          highestDay: highDay ? dayName(highDay.day) : "",
          topDept: topD?.dept || "",
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setErrorMessage(err instanceof Error ? err.message : "Failed to load attendance trends data.");
        setLast5Days([]);
        setAvgByDept([]);
        setDailyByDept({ labels: [], datasets: [] });
        setDeptBreakdown([]);
        setKpis({ employees: 0, absenteeRate: 0, highestDay: "", topDept: "" });
      }
    };
    fetchData();
  }, [start, end, department, locationFilter]);

  const barData = {
    labels: last5Days.map((d) => d.day),
    datasets: [
      {
        label: "Absentee %",
        data: last5Days.map((d) => d.absent),
        backgroundColor: chartColors.trendBars.map((c) => dark ? c.dark : c.light),
        borderRadius: 12,
        maxBarThickness: 56,
      },
    ],
  };

  const avgData = {
    labels: avgByDept.map((d) => d.dept),
    datasets: [
      {
        label: "Avg Absentee %",
        data: avgByDept.map((d) => d.rate),
        backgroundColor: chartColors.departmentAvg.slice(0, avgByDept.length).map((c) => dark ? c.dark : c.light),
        borderRadius: 14,
        maxBarThickness: 84,
      },
    ],
  };