"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

export function Chip({ selected = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex min-h-12 items-center justify-center rounded-control border px-4 text-base font-semibold transition-[transform,background-color,border-color,color] duration-150 active:translate-y-px",
        selected
          ? "border-blood-600 bg-blood-600 text-white"
          : "border-line bg-surface text-ink hover:border-ink-3",
        className,
      )}
    />
  );
}
