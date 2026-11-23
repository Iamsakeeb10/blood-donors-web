import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { M } from "@/lib/messages";

export const metadata: Metadata = {
  title: M.notFound.title,
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-5xl font-bold tracking-tight text-blood-600">৪০৪</p>
      <h1 className="mt-3 text-2xl font-bold leading-snug text-ink">
        {M.notFound.title}
      </h1>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">
        {M.notFound.body}
      </p>
      <Link href="/" className={buttonStyles("primary", "mt-8 w-full max-w-xs")}>
        {M.notFound.backHome}
      </Link>
    </div>
  );
}
