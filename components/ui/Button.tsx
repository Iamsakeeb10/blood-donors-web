import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-control px-5 text-base font-semibold transition-[transform,background-color,border-color,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-blood-600 text-white hover:bg-blood-700",
  secondary: "border border-line bg-surface text-ink hover:border-ink-3 active:bg-paper",
  ghost: "text-ink-2 hover:bg-off-bg",
  danger: "bg-err text-white hover:brightness-90",
};

export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-5 w-5 animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  variant = "primary",
  loading = false,
  loadingText,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, className)}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
