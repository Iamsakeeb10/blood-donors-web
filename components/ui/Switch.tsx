"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label className={cn("flex min-h-12 cursor-pointer items-center gap-3", className)}>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span
          aria-hidden="true"
          className="relative block h-7 w-12 rounded-full bg-line transition-colors duration-150 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-150 peer-checked:bg-blood-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-blood-600/40 peer-disabled:opacity-60"
        />
      </span>
      {label ? <span className="text-base text-ink">{label}</span> : null}
    </label>
  );
}
