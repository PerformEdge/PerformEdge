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

/* ================= PAGE ================= */
export default function NoPayLeavePercentagePage() {
  const [kpis, setKpis] = useState([
    { label: "Total No-Pay Days", value: "-", scheme: kpiColorSchemes.total },
    { label: "Affected Employees", value: "-", scheme: kpiColorSchemes.affected },
    { label: "No-Pay Percentage", value: "-", scheme: kpiColorSchemes.percentage },
    { label: "Monthly Trend", value: "-", scheme: kpiColorSchemes.trend },
  ]);

  const [donutData, setDonutData] = useState<any>({ labels: [], datasets: [] });
  const [barData, setBarData] = useState<any>({ labels: [], datasets: [] });
  const [tableData, setTableData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        const res = await fetch("http://localhost:8000/attendance/latest-date?default_days=14");
        const data = await res.json();
        if (data?.start && data?.end) {
          setStart(data.start);
          setEnd(data.end);
          return;
        }
      } catch {
      }

      const d = new Date();
      const s = new Date(d);
      s.setDate(s.getDate() - 13);
      setStart(s.toISOString().split("T")[0]);
      setEnd(d.toISOString().split("T")[0]);
    };
    initializeDateRange();
  }, []);

  useEffect(() => {
    if (!start || !end) return;
    if (start > end) {
      setErrorMessage("Start date must be before or equal to end date.");
      setKpis([
        { label: "Total No-Pay Days", value: "-", scheme: kpiColorSchemes.total },
        { label: "Affected Employees", value: "-", scheme: kpiColorSchemes.affected },
        { label: "No-Pay Percentage", value: "-", scheme: kpiColorSchemes.percentage },
        { label: "Monthly Trend", value: "-", scheme: kpiColorSchemes.trend },
      ]);
      setDonutData({ labels: [], datasets: [] });
      setBarData({ labels: [], datasets: [] });
      setTableData([]);
      return;
    }
    setErrorMessage("");
    fetchSummary();
    fetchByDepartment();
    fetchDistribution();
    fetchDetails();
  }, [start, end, department, locationFilter]);

  /* ================= FETCH KPI CARDS ================= */
  async function fetchSummary() {
    try {
      const res = await fetch(`${API_BASE}/no-pay/summary?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to fetch KPI summary.");

      setKpis([
        { label: "Total No-Pay Days", value: data.total_days, scheme: kpiColorSchemes.total },
        { label: "Affected Employees", value: data.employees, scheme: kpiColorSchemes.affected },
        { label: "No-Pay Percentage", value: `${data.no_pay_percentage}%`, scheme: kpiColorSchemes.percentage },
        { label: "Monthly Trend", value: data.monthly_trend, scheme: kpiColorSchemes.trend },
      ]);
    } catch (err) {
      console.error("Failed to fetch KPI summary:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch KPI summary.");
    }
  }

 /* ================= FETCH DONUT ================= */
  async function fetchByDepartment() {
    try {
      const res = await fetch(`${API_BASE}/no-pay/by-department?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
      const raw = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((raw as any)?.detail || "Failed to fetch department data.");
      const data = Array.isArray(raw) ? raw : [];

      setDonutData({
        labels: data.map((d: any) => d.department_name),
        datasets: [
          {
            data: data.map((d: any) => d.no_pay_percentage),
            backgroundColor: chartPalettes.donut.slice(0, data.length),
            borderWidth: 0,
          },
        ],
      });
    } catch (err) {
      console.error("Failed to fetch department data:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch department data.");
      setDonutData({ labels: [], datasets: [] });
    }
  }

  /* ================= FETCH BAR ================= */
  async function fetchDistribution() {
    try {
      const res = await fetch(`${API_BASE}/no-pay/distribution?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
      const raw = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((raw as any)?.detail || "Failed to fetch distribution data.");
      const data = Array.isArray(raw) ? raw : [];

      setBarData({
        labels: data.map((d: any) => d.department_name),
        datasets: [
          {
            data: data.map((d: any) => d.days),
            backgroundColor: chartPalettes.bar.slice(0, data.length),
            borderRadius: 16,
            barThickness: 56,
            maxBarThickness: 64,
            categoryPercentage: 0.6,
            barPercentage: 0.85,
          },
        ],
      });
    } catch (err) {
      console.error("Failed to fetch distribution data:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch distribution data.");
      setBarData({ labels: [], datasets: [] });
    }
  }

  /* ================= FETCH TABLE ================= */
  async function fetchDetails() {
    try {
      const res = await fetch(`${API_BASE}/no-pay/details?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`);
      const raw = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((raw as any)?.detail || "Failed to fetch table data.");
      const data = Array.isArray(raw) ? raw : [];
      setTableData(data || []);
    } catch (err) {
      console.error("Failed to fetch table data:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch table data.");
      setTableData([]);
    }
  }

  /* ================= DOWNLOAD REPORT ================= */
  async function downloadReport() {
    try {
      const url = `${API_BASE}/no-pay/report?start=${start}&end=${end}&department=${encodeURIComponent(department)}&location=${encodeURIComponent(locationFilter)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to fetch report", res.statusText);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let filename = "no_pay_report.pdf";
      const match = disposition.match(/filename=([^;]+)/);
      if (match && match[1]) filename = match[1].replace(/['"]/g, "");

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download report:", err);
    }
  }
