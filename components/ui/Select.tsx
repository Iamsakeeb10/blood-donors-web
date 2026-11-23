import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/icons";
import { inputClass } from "@/components/ui/styles";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select {...props} className={cn(inputClass, "appearance-none pr-11", className)}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
    </div>
  );
}
