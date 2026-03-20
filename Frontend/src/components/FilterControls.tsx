import React, { useState, Fragment } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  start: string;
  end: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  department: string;
  setDepartment: (v: string) => void;
  locationFilter: string;
  setLocationFilter: (v: string) => void;
  departments?: string[];
  locations?: string[];
};

export default function FilterControls({
  start,
  end,
  setStart,
  setEnd,
  department,
  setDepartment,
  locationFilter,
  setLocationFilter,
  departments = ["All", "HR", "Engineering", "Sales", "Finance", "Operations", "Marketing"],
  locations = ["All", "Head Office", "Branch Office", "Remote", "Client Site A", "Client Site B", "Main Office", "Branch 1", "Branch 2", "Client Site"],
}: Props) {
  const [openDate, setOpenDate] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [openLoc, setOpenLoc] = useState(false);

  // show placeholders until user interacts
  const [touchedDate, setTouchedDate] = useState(false);
  const [touchedDept, setTouchedDept] = useState(false);
  const [touchedLoc, setTouchedLoc] = useState(false);

  const applyDate = () => {
    setTouchedDate(true);
    setOpenDate(false);
  };

  const clearDate = () => {
    setStart("");
    setEnd("");
    setTouchedDate(false);
  };

  // open date - close others
  const handleOpenDate = () => {
    setOpenDate((s) => !s);
    setTouchedDate(true);
    if (!openDate) {
      setOpenDept(false);
      setOpenLoc(false);
    }
  };

  // open dept - close others
  const handleOpenDept = () => {
    setOpenDept((s) => !s);
    if (!openDept) {
      setOpenDate(false);
      setOpenLoc(false);
    }
  };

  // open loc - close others
  const handleOpenLoc = () => {
    setOpenLoc((s) => !s);
    if (!openLoc) {
      setOpenDate(false);
      setOpenDept(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Date Range pill */}
      <div className="relative">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={handleOpenDate}>
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{touchedDate ? `${start} – ${end}` : "Select Date Range"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {openDate && (
          <div className="absolute right-0 mt-2 w-[380px] rounded-xl border border-border bg-card p-5 shadow-xl z-50">
            <div className="mb-5 text-base font-semibold text-foreground">Select Date Range</div>
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">Start</label>
                <input 
                  type="date" 
                  value={start} 
                  onChange={(e) => setStart(e.target.value)} 
                  className="rounded-lg border border-border bg-background dark:bg-muted/50 text-foreground dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground" 
                  placeholder="yyyy-mm-dd"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">End</label>
                <input 
                  type="date" 
                  value={end} 
                  onChange={(e) => setEnd(e.target.value)} 
                  className="rounded-lg border border-border bg-background dark:bg-muted/50 text-foreground dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground" 
                  placeholder="yyyy-mm-dd"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={clearDate} className="font-medium px-6">Clear</Button>
              <Button size="sm" onClick={applyDate} className="font-medium px-6">Apply</Button>
            </div>
          </div>
        )}
      </div>

      {/* Department pill */}
      <div className="relative">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={handleOpenDept}>
          <span>{touchedDept ? department : "Department"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {openDept && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card p-2 shadow-lg z-50">
            {departments.map((d) => (
              <button key={d} className="w-full text-left px-3 py-1 rounded hover:bg-muted" onClick={() => { setDepartment(d); setOpenDept(false); setTouchedDept(true); }}>{d}</button>
            ))}
          </div>
        )}
      </div>

      {/* Location pill */}
      <div className="relative">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={handleOpenLoc}>
          <span>{touchedLoc ? locationFilter : "Location"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {openLoc && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card p-2 shadow-lg z-50">
            {locations.map((l) => (
              <button key={l} className="w-full text-left px-3 py-1 rounded hover:bg-muted" onClick={() => { setLocationFilter(l); setOpenLoc(false); setTouchedLoc(true); }}>{l}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
