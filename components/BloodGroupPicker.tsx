"use client";

import { useRef, type KeyboardEvent } from "react";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/data";
import { cn } from "@/lib/cn";
import { M } from "@/lib/messages";
import { CheckIcon } from "@/components/icons";
import { BloodGroupText } from "@/components/BloodGroupText";

type BloodGroupPickerProps = {
  value: string;
  onChange: (value: BloodGroup) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function BloodGroupPicker({
  value,
  onChange,
  invalid = false,
  disabled = false,
  id = "bloodGroup",
  className,
}: BloodGroupPickerProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = BLOOD_GROUPS.indexOf(value as BloodGroup);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % BLOOD_GROUPS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + BLOOD_GROUPS.length) % BLOOD_GROUPS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = BLOOD_GROUPS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    onChange(BLOOD_GROUPS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={M.join.bloodGroup}
      aria-invalid={invalid || undefined}
      tabIndex={-1}
      className={cn("grid grid-cols-4 gap-2 lg:grid-cols-8", className)}
    >
      {BLOOD_GROUPS.map((group, index) => {
        const selected = group === value;
        const focusable = selected || (selectedIndex < 0 && index === 0);

        return (
          <button
            key={group}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={focusable ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(group)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative flex h-14 items-center justify-center rounded-control border text-xl font-bold transition-[transform,background-color,border-color,color] duration-150 active:translate-y-px disabled:opacity-60",
              selected
                ? "border-blood-600 bg-blood-600 text-white"
                : "border-line bg-surface text-ink hover:border-ink-3",
              invalid && !selected ? "border-err" : "",
            )}
          >
            <BloodGroupText group={group} />
            {selected ? (
              <CheckIcon className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
