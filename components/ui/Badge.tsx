import type { ReactNode } from "react";

type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "green"
  | "orange"
  | "blue";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-white/5 text-text-secondary border-white/10",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  green: "bg-vemgo-green-soft text-vemgo-green border-vemgo-green-border",
  orange:
    "bg-vemgo-orange-soft text-vemgo-orange border-vemgo-orange-border",
  blue: "bg-vemgo-blue-soft text-vemgo-blue border-vemgo-blue-border",
};

export function Badge({
  children,
  variant = "neutral",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border",
        "px-2.5 py-1 text-xs font-medium",
        variants[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}