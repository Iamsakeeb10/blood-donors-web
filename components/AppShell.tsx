import Link from "next/link";
import type { ReactNode } from "react";
import { DropIcon } from "@/components/icons";
import { AppCheckInit } from "@/components/AppCheckInit";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { M } from "@/lib/messages";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex min-h-14 w-full max-w-md items-center px-4 md:max-w-2xl">
          <Link
            href="/"
            aria-label={M.appNameFull}
            className="inline-flex min-h-12 items-center gap-2 rounded-control text-lg font-bold leading-snug text-blood-700"
          >
            <DropIcon className="h-5 w-5 text-blood-600" />
            <span>{M.appName}</span>
          </Link>
        </div>
      </header>

      <OfflineBanner />
      <AppCheckInit />

      <main id="main" className="mx-auto w-full max-w-md px-4 pb-40 pt-4 md:max-w-2xl">
        {children}
      </main>
    </ToastProvider>
  );
}
