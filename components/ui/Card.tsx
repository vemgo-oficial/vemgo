import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "client" | "professional" | "admin";
};

const paddingClasses = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  padding = "md",
  tone,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border bg-zinc-900/70",
        tone === "client" ? "border-emerald-500/30" : "",
        tone === "professional" ? "border-orange-500/30" : "",
        tone === "admin" ? "border-blue-500/30" : "",
        !tone ? "border-zinc-800" : "",
        "shadow-lg shadow-black/20",
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
