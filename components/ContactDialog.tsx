"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ADMIN_CONTACT } from "@/lib/config";
import { M } from "@/lib/messages";
import { useMounted } from "@/lib/useMounted";

type ContactDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ContactDialog({ open, onClose }: ContactDialogProps) {
  const { show } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open, mounted]);

  async function handleCopy() {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(ADMIN_CONTACT.email);
      setCopied(true);
      show(M.contactDialog.emailCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show(M.contactDialog.emailCopyFailed, "error");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="contact-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/45"
    >
      <div className="flex items-center justify-between">
        <h2 id="contact-title" className="text-lg font-bold leading-snug text-ink">
          {ADMIN_CONTACT.label} {M.contactDialog.titleSuffix}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={M.contactDialog.close}
          className="flex h-12 w-12 -mr-2 items-center justify-center rounded-control text-ink-3 hover:bg-paper hover:text-ink active:translate-y-px"
        >
          ✕
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {M.contactDialog.body}
      </p>

      {/* Email Display & Copy Pill */}
      <div className="mt-4 flex items-center justify-between gap-2 rounded-control border border-line bg-paper p-3">
        <span className="select-all font-mono text-sm font-semibold text-ink">
          {ADMIN_CONTACT.email}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-blood-700 shadow-sm transition active:translate-y-px"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-ok" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
          <span>{copied ? M.contactDialog.copiedShort : M.contactDialog.copy}</span>
        </button>
      </div>

      {/* Action Options */}
      <div className="mt-5 space-y-2">
        <a
          href={ADMIN_CONTACT.gmailComposeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles("primary")}
        >
          {M.contactDialog.gmail}
        </a>
        <a
          href={ADMIN_CONTACT.href}
          className={buttonStyles("secondary")}
        >
          {M.contactDialog.mailApp}
        </a>
      </div>
    </dialog>,
    document.body,
  );
}
