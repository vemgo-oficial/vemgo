import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "professional"
  | "control";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-vemgo-green text-white hover:bg-vemgo-green-hover focus-visible:ring-vemgo-green",

  secondary:
    "border border-white/10 bg-surface-2 text-text-primary hover:bg-surface-3 focus-visible:ring-vemgo-green",

  ghost:
    "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary focus-visible:ring-vemgo-green",

  danger:
    "bg-danger text-white hover:bg-red-500 focus-visible:ring-danger",

  professional:
    "bg-vemgo-orange text-white hover:bg-vemgo-orange-hover focus-visible:ring-vemgo-orange",

  control:
    "bg-vemgo-blue text-white hover:bg-vemgo-blue-hover focus-visible:ring-vemgo-blue",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-md",
        "font-medium",
        "transition-colors duration-180",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        "disabled:pointer-events-none",
        "disabled:opacity-50",
        "select-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}