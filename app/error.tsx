"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonStyles } from "@/components/ui/Button";
import { M } from "@/lib/messages";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error cleanly without PII
    console.error("App error:", error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-bold leading-snug text-blood-700">
        {M.error.title}
      </h1>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">
        {M.error.body}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button variant="primary" onClick={() => reset()}>
          {M.error.retry}
        </Button>
        <Link href="/" className={buttonStyles("secondary")}>
          {M.error.backHome}
        </Link>
      </div>
    </div>
  );
}
