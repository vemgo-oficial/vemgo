import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export function PageState({
  kind,
  title,
  description,
  tone = "client",
  action,
  children,
}: {
  kind: "loading" | "error" | "empty";
  title: string;
  description?: string;
  tone?: "client" | "professional" | "admin";
  action?: { label: string; href: string };
  children?: ReactNode;
}) {
  const accent = {
    client: "#10b981",
    professional: "#f97316",
    admin: "#3b82f6",
  }[tone];
  const liveRole = kind === "error" ? "alert" : "status";

  return (
    <section
      role={liveRole}
      aria-live={kind === "error" ? "assertive" : "polite"}
      aria-busy={kind === "loading"}
      className="mx-auto flex min-h-48 max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center"
    >
      {kind === "loading" && (
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[var(--state-accent)]"
          style={{ "--state-accent": accent } as CSSProperties}
        />
      )}
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {description && <p className="max-w-xl text-sm leading-6 text-zinc-400">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--state-accent)] hover:text-[var(--state-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-accent)]"
          style={{ "--state-accent": accent } as CSSProperties}
        >
          {action.label}
        </Link>
      )}
      {children}
    </section>
  );
}
