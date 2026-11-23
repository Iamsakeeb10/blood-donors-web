"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { CheckIcon, WarningIcon } from "@/components/icons";

type ToastTone = "info" | "error";

type ToastState = { id: number; message: string; tone: ToastTone };

type ToastContextValue = { show: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        {toast ? (
          <div
            key={toast.id}
            className={cn(
              "toast-enter flex max-w-md items-start gap-2 rounded-card px-4 py-3 text-sm font-semibold shadow-lg",
              toast.tone === "error" ? "bg-err text-white" : "bg-ink text-white",
            )}
          >
            {toast.tone === "error" ? (
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
