const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envBase = trimTrailingSlash(
  String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "").trim(),
);

const localBase = "http://127.0.0.1:8000";
const hostedBase = "https://performedge.onrender.com";
const browserHost = typeof window !== "undefined" ? window.location.hostname : "";
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
const isLocalBrowser = /^(localhost|127\.0\.0\.1)$/i.test(browserHost);
const isRenderBrowser = /\.onrender\.com$/i.test(browserHost);

export const API_BASE = envBase || (isLocalBrowser ? localBase : isRenderBrowser ? browserOrigin : hostedBase);

export function apiUrl(path: string): string {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export const API_BUILD_TAG = "2026-03-29-v4";
