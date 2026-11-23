import { cn } from "@/lib/cn";
import { M } from "@/lib/messages";
import type { DonorStatus } from "@/lib/data";

export type { DonorStatus };

const labels: Record<DonorStatus, string> = {
  available: M.status.available,
  cooling: M.status.cooling,
  unavailable: M.status.unavailable,
};

const tones: Record<DonorStatus, string> = {
  available: "bg-ok-bg text-ok",
  cooling: "bg-warn-bg text-warn",
  unavailable: "bg-off-bg text-off",
};

export function StatusPill({
  status,
  className,
}: {
  status: DonorStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold leading-snug",
        tones[status],
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
