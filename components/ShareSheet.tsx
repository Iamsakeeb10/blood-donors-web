"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { M } from "@/lib/messages";
import { useMounted } from "@/lib/useMounted";

type ShareSheetProps = {
  open: boolean;
  text: string;
  onClose: () => void;
};

export function ShareSheet({ open, text, onClose }: ShareSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => {
        textRef.current?.focus();
        textRef.current?.select();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="share-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/45"
    >
      <h2 id="share-title" className="text-lg font-bold leading-snug">
        {M.share.sheetTitle}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{M.share.sheetHint}</p>
      <textarea
        ref={textRef}
        readOnly
        value={text}
        rows={5}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-3 w-full rounded-control border border-line bg-paper p-3 text-sm leading-relaxed text-ink"
      />
      <Button variant="secondary" className="mt-3" onClick={onClose}>
        {M.share.close}
      </Button>
    </dialog>,
    document.body,
  );
}
