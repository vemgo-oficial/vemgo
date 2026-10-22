type ProgressProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "client" | "professional" | "admin";
};

export default function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "client",
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(
    100,
    Math.max(0, (value / safeMax) * 100),
  );

  const barColor = {
    client: "bg-emerald-500",
    professional: "bg-orange-500",
    admin: "bg-blue-500",
  }[variant];

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-4">
          {label && (
            <span className="text-sm font-medium text-zinc-300">
              {label}
            </span>
          )}

          {showValue && (
            <span className="text-xs font-semibold text-zinc-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(value, safeMax)}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
