import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  fullWidth = true,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `${inputId}-error`
            : hint
              ? `${inputId}-hint`
              : undefined
        }
        className={[
          "min-h-11 rounded-md border bg-surface-2 px-3.5",
          "text-base text-text-primary",
          "placeholder:text-text-tertiary",
          "transition-colors duration-180",
          "outline-none",
          "focus:border-vemgo-green",
          "focus:ring-2 focus:ring-vemgo-green/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : "border-white/10 hover:border-white/20",
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      {!error && hint && (
        <p
          id={`${inputId}-hint`}
          className="mt-2 text-xs text-text-tertiary"
        >
          {hint}
        </p>
      )}
    </div>
  );
}