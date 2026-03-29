const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envBase = trimTrailingSlash(
  String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "").trim(),
);

const localBase = "http://127.0.0.1:8000";
const hostedBase = "https://performedge.onrender.com";

export const API_BASE = envBase || (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
  ? localBase
  : hostedBase);

export function apiUrl(path: string): string {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
