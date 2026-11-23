"use client";

import { useState } from "react";
import { ContactDialog } from "@/components/ContactDialog";
import { ADMIN_CONTACT } from "@/lib/config";

type ContactTriggerProps = {
  className?: string;
  label?: string;
};

export function ContactTrigger({
  className,
  label = ADMIN_CONTACT.label,
}: ContactTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {label}
      </button>
      <ContactDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
