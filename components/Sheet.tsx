"use client";

import type { ReactNode } from "react";

export default function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[92dvh] w-full max-w-app animate-rise flex-col rounded-t-3xl border-t border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="tap flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-lg text-muted active:bg-surface3"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-4 pb-safe pt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
