import * as React from "react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-transparent hover:bg-muted",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  ghost: "bg-transparent hover:bg-muted",
  link: "bg-transparent underline-offset-4 hover:underline text-primary",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
} as const;

const SIZES = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClasses(
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
  } = {}
) {
  const { variant = "default", size = "default", className } = options;

  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
