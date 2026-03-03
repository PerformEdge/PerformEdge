import * as React from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-muted text-muted-foreground",
  outline: "border-border text-foreground",
};

export function Badge({ variant = "default", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        VARIANTS[variant] || VARIANTS.default,
        className,
      )}
      {...props}
    />
  );
}
