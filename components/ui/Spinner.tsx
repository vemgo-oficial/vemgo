type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  variant?: "client" | "professional" | "admin" | "light";
  label?: string;
};

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

const colors = {
  client: "border-emerald-500/30 border-t-emerald-500",
  professional: "border-orange-500/30 border-t-orange-500",
  admin: "border-blue-500/30 border-t-blue-500",
  light: "border-white/30 border-t-white",
};

export default function Spinner({
  size = "md",
  variant = "client",
  label,
}: SpinnerProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className={[
          "animate-spin rounded-full",
          sizes[size],
          colors[variant],
        ].join(" ")}
        aria-hidden="true"
      />

      {label && (
        <span className="text-sm font-medium text-zinc-400">{label}</span>
      )}
    </div>
  );
}
