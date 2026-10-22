import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "professional"
  | "admin";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--portal-accent)] text-black hover:brightness-110 focus-visible:ring-[var(--portal-accent)]",
  secondary:
    "bg-zinc-800 text-white hover:bg-zinc-700 focus-visible:ring-zinc-500",
  outline:
    "border border-zinc-700 bg-transparent text-zinc-200 hover:border-[var(--portal-accent)] hover:text-[var(--portal-accent)] focus-visible:ring-[var(--portal-accent)]",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500",
  professional:
    "bg-orange-500 text-black hover:bg-orange-400 focus-visible:ring-orange-500",
  admin:
    "bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500",
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3",
        "text-sm font-bold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
