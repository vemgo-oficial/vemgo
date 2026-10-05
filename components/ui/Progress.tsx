interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "green" | "orange" | "blue";
}

const variants = {
  green: "bg-vemgo-green",
  orange: "bg-vemgo-orange",
  blue: "bg-vemgo-blue",
};

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "green",
}: ProgressProps) {
  const percentage = Math.min(
    100,
    Math.max(0, (value / max) * 100),
  );

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-4">
          {label && (
            <span className="text-sm text-text-secondary">
              {label}
            </span>
          )}

          {showValue && (
            <span className="text-xs font-medium tabular-nums text-text-tertiary">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-300",
            variants[variant],
          ].join(" ")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}