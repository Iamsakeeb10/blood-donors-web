import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FieldControlProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, hint, error, id, className, children }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const descId = `${fieldId}-desc`;
  const message = error ?? hint;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink-2">
        {label}
      </label>
      {children({
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? descId : undefined,
      })}
      {message ? (
        <p
          id={descId}
          className={cn("text-sm leading-relaxed", error ? "text-err" : "text-ink-3")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
