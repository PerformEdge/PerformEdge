import * as React from "react";
import { ChevronDown, Calendar } from "lucide-react";

import { cn } from "@/lib/utils";

const API_BASE = "https://performedge.onrender.com";

type Option = { id: string; name: string };

type Props = {
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  department: string;
  onDepartmentChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  className?: string;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractDates(range: string): { start?: string; end?: string } {
  const matches = range?.match(/\d{4}-\d{2}-\d{2}/g) || [];
  if (matches.length >= 2) return { start: matches[0], end: matches[1] };
  return {};
}

function DateRangePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const parsed = React.useMemo(() => extractDates(value), [value]);
  const [start, setStart] = React.useState(parsed.start || "");
  const [end, setEnd] = React.useState(parsed.end || "");

  React.useEffect(() => {
    setStart(parsed.start || "");
    setEnd(parsed.end || "");
  }, [parsed.start, parsed.end]);

  // Close on outside click
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = value && parsed.start && parsed.end ? `${parsed.start} - ${parsed.end}` : "Select Date Range";
  const invalidRange = Boolean(start && end && start > end);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-sm font-semibold",
          "shadow-sm border border-border hover:bg-muted transition",
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[180px] truncate">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[290px] rounded-xl border border-border bg-background p-4 shadow-lg">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Start</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">End</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStart("");
                  setEnd("");
                  onChange("");
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold",
                  "hover:bg-muted",
                )}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!start || !end || invalidRange}
                onClick={() => {
                  onChange(`${start} to ${end}`);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground",
                  "disabled:opacity-50",
                )}
              >
                Apply
              </button>
            </div>
            {invalidRange ? (
              <div className="text-xs text-red-600 dark:text-red-400">Start date must be before or equal to end date.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectPill({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 appearance-none rounded-xl bg-background pl-4 pr-10 text-sm font-semibold",
          "shadow-sm border border-border hover:bg-muted transition outline-none",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export default function PerformanceFilters(props: Props) {
  const {
    dateRange,
    onDateRangeChange,
    department,
    onDepartmentChange,
    location,
    onLocationChange,
    className,
  } = props;

  const [departments, setDepartments] = React.useState<Option[]>([]);
  const [locations, setLocations] = React.useState<Option[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [depRes, locRes] = await Promise.all([
          fetch(`${API_BASE}/meta/departments`, {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/meta/locations`, {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }),
        ]);

        if (depRes.ok) {
          const depJson = await depRes.json();
          setDepartments(depJson.items || []);
        }
        if (locRes.ok) {
          const locJson = await locRes.json();
          setLocations(locJson.items || []);
        }
      } catch (e) {
        // Silent: dropdowns will still work with placeholders
      }
    }

    load();
    return () => controller.abort();
  }, []);

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <DateRangePill value={dateRange} onChange={onDateRangeChange} />
      <SelectPill
        placeholder="Department"
        value={department}
        options={departments}
        onChange={onDepartmentChange}
      />
      <SelectPill
        placeholder="Location"
        value={location}
        options={locations}
        onChange={onLocationChange}
      />
    </div>
  );
}
