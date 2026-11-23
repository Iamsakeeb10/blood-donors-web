"use client";

import { useEffect } from "react";
import { M } from "@/lib/messages";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error.message);
  }, [error]);

  return (
    <html lang="bn">
      <body className="flex min-h-dvh items-center justify-center bg-[#FBF8F5] p-4 text-[#1F1A17]">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold leading-snug text-[#C4271F]">
            {M.error.title}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[#5C524C]">
            {M.error.body}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-xl bg-[#C4271F] px-4 text-lg font-bold text-white active:bg-[#A11E18]"
          >
            {M.error.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
