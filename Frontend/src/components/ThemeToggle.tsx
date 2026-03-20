import * as React from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme";

export type ThemeToggleButtonProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggleButton({
  className,
  showLabel = false,
}: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur transition hover:shadow-md",
        className
      )}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0, y: 4 }}
        animate={{ rotate: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="inline-flex"
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </motion.span>
      {showLabel ? (
        <span className="text-muted-foreground">
          {isDark ? "Dark" : "Light"} mode
        </span>
      ) : null}
    </button>
  );
}

export function ThemeToggleFab() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      <motion.button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-border transition hover:shadow-xl"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </motion.button>
    </div>
  );
}
