import React from "react";

//  1) <FormAlert message={"..."} variant="error" />
//  2) <FormAlert variant="error">...</FormAlert>

type FormAlertVariant = "error" | "success" | "info";

type FormAlertProps = React.PropsWithChildren<{
  /** Preferred usage */
  message?: string;
  variant?: FormAlertVariant;
  className?: string;
}>;

const styles: Record<FormAlertVariant, string> = {
  error:
    "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200 dark:bg-red-500/15",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 dark:bg-emerald-500/15",
  info:
    "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200 dark:bg-blue-500/15",
};

export function FormAlert({
  message,
  children,
  variant = "error",
  className = "",
}: FormAlertProps) {
  const content = message ?? children;
  if (!content) return null;

  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles[variant]} ${className}`}
    >
      {content}
    </div>
  );
}

// Keep default export for convenience.
export default FormAlert;
