import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  tone?: "client" | "professional" | "admin";
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
  tone?: "client" | "professional" | "admin";
};

const baseClasses =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50";

const toneClasses = {
  client: "focus:border-emerald-500 focus:ring-emerald-500",
  professional: "focus:border-orange-500 focus:ring-orange-500",
  admin: "focus:border-blue-500 focus:ring-blue-500",
};

export function Input({
  label,
  error,
  hint,
  tone,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-zinc-200"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        className={[
          baseClasses,
          tone ? toneClasses[tone] : "focus:border-[var(--portal-accent)] focus:ring-[var(--portal-accent)]",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>
      )}

      {!error && hint && (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  tone,
  id,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-zinc-200"
        >
          {label}
        </label>
      )}

      <textarea
        id={id}
        className={[
          baseClasses,
          tone ? toneClasses[tone] : "focus:border-[var(--portal-accent)] focus:ring-[var(--portal-accent)]",
          "min-h-32 resize-y",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>
      )}

      {!error && hint && (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export default Input;
