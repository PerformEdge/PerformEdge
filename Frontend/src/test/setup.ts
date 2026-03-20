import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { installMockApiSuccess } from "@/test/mockApi";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create() {
      return this;
    },
  },
}));

vi.mock("react-chartjs-2", () => ({
  Pie: () => React.createElement("div", { "data-testid": "chart-pie" }),
  Bar: () => React.createElement("div", { "data-testid": "chart-bar" }),
  Line: () => React.createElement("div", { "data-testid": "chart-line" }),
  Doughnut: () => React.createElement("div", { "data-testid": "chart-doughnut" }),
}));

vi.mock("recharts", () => {
  const passthrough = ({ children }: any) => React.createElement("div", {}, children);
  return {
    ResponsiveContainer: passthrough,
    PieChart: passthrough,
    Pie: passthrough,
    Cell: passthrough,
    Tooltip: passthrough,
    Legend: passthrough,
    BarChart: passthrough,
    Bar: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    LineChart: passthrough,
    Line: passthrough,
    AreaChart: passthrough,
    Area: passthrough,
  };
});

vi.mock("framer-motion", () => {
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, prop: string) => (props: any) =>
        React.createElement(prop, props, props.children),
    }
  );
  const AnimatePresence = ({ children }: any) => React.createElement(React.Fragment, null, children);
  return {
    motion: motionProxy,
    AnimatePresence,
  };
});

vi.mock("react-day-picker", () => ({
  DayPicker: () => React.createElement("div", { "data-testid": "day-picker" }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: any) => React.createElement("div", { "data-testid": "toaster", ...props }),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}

beforeEach(() => {
  installMockApiSuccess();
  localStorage.clear();
  localStorage.setItem("access_token", "eyJhbGciOiJIUzI1NiJ9.e30.test-signature");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: MockResizeObserver,
  });
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "open", {
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:mock"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({} as any));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
