import * as React from "react";
import { Toaster as Sonner, toast } from "sonner";

export type SonnerTheme = "dark" | "light" | "system";

export function Toaster({ theme = "dark" }: { theme?: SonnerTheme }) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground",
        },
      }}
    />
  );
}

export { toast };
