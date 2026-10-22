"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  title,
  onClose,
  children,
  labelledBy,
  size = "md",
  showHeader = true,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  size?: "md" | "xl";
  showHeader?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generatedTitleId = useId();
  const titleId = labelledBy ?? `vemgo-dialog-title-${generatedTitleId}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[min(90dvh,800px)] ${size === "xl" ? "w-[min(1024px,calc(100vw-2rem))]" : "w-[min(640px,calc(100vw-2rem))]"} overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-0 text-white shadow-2xl backdrop:bg-black/75`}
    >
      {showHeader ? (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            ×
          </button>
        </div>
      ) : !labelledBy ? <h2 id={titleId} className="sr-only">{title}</h2> : null}
      <div className="p-5">{children}</div>
    </dialog>
  );
}
