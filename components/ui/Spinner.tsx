interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={[
        "inline-block animate-spin rounded-full",
        "border-2 border-white/20 border-t-vemgo-green",
        sizes[size],
      ].join(" ")}
    />
  );
}