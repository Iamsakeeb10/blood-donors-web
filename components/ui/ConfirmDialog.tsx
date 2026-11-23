"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useMounted } from "@/lib/useMounted";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
      onClose={() => {
        if (open) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/45"
    >
      <h2 id="confirm-title" className="text-lg font-bold leading-snug">
        {title}
      </h2>
      <p id="confirm-desc" className="mt-2 text-base leading-relaxed text-ink-2">
        {description}
      </p>
      <div className="mt-5 grid gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>,
    document.body,
  );
}
