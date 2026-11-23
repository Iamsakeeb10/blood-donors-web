"use client";

import { useEffect, useRef } from "react";
import { BloodGroupText } from "@/components/BloodGroupText";
import {
  ChatIcon,
  ChevronDownIcon,
  CopyIcon,
  PhoneIcon,
  WarningIcon,
} from "@/components/icons";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { nextEligibleDate, statusOf, type Donor } from "@/lib/data";
import { daysSince, formatDateBn, formatDaysAgo } from "@/lib/format";
import { M } from "@/lib/messages";
import { waLink } from "@/lib/share";

type DonorCardProps = {
  donor: Donor;
  expanded: boolean;
  onToggle: () => void;
};

export function DonorCard({ donor, expanded, onToggle }: DonorCardProps) {
  const { show } = useToast();
  const status = statusOf(donor);
  const location = [donor.district, donor.area]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const panelId = `donor-${donor.uid}`;
  const liRef = useRef<HTMLLIElement>(null);
  const phoneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      liRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 170);
    return () => clearTimeout(timer);
  }, [expanded]);

  const cooling = status === "cooling";
  const days = daysSince(donor.lastDonated);
  const eligibleDate = nextEligibleDate(donor.lastDonated);

  async function copyPhone() {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(donor.phone);
      show(M.toast.copied);
    } catch {
      const element = phoneRef.current;
      if (element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      show(M.toast.copyFailed, "error");
    }
  }

  return (
    <li
      ref={liRef}
      className="scroll-mb-28 rounded-card border border-line bg-surface"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-blood-50 text-lg font-bold text-blood-700"
        >
          <BloodGroupText group={donor.bloodGroup} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 py-0.5 text-lg font-semibold leading-relaxed text-ink">
              {donor.name}
            </span>
            <ChevronDownIcon
              className={cn(
                "mt-1 h-5 w-5 shrink-0 text-ink-3 transition-transform duration-150",
                expanded && "rotate-180",
              )}
            />
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-ink-2">
            {location}
          </span>
          <StatusPill status={status} className="mt-2" />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className="border-t border-line px-3 pb-3 pt-3">
          <p className="text-sm leading-relaxed text-ink-2">
            {donor.name}
            {location ? ` · ${location}` : ""}
          </p>

          {cooling && donor.lastDonated ? (
            <div className="mt-2">
              <p className="text-sm leading-relaxed text-warn">
                {M.search.lastDonated(
                  formatDateBn(donor.lastDonated),
                  days !== null ? formatDaysAgo(days) : "",
                )}
              </p>
              {eligibleDate ? (
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {M.search.nextEligible(formatDateBn(eligibleDate))}
                </p>
              ) : null}
            </div>
          ) : null}

          {!donor.available ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-control bg-warn-bg px-3 py-2 text-sm leading-relaxed text-warn">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {M.search.unavailableWarning}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p
              ref={phoneRef}
              className="select-all text-xl font-bold tabular-nums text-ink"
            >
              {donor.phone}
            </p>
            <button
              type="button"
              onClick={() => {
                void copyPhone();
              }}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-blood-700"
            >
              <CopyIcon className="h-4 w-4" />
              {M.actions.copy}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <a
              href={`tel:${donor.phone}`}
              className="inline-flex min-h-13 items-center justify-center gap-1.5 rounded-control bg-ok px-3 text-sm font-semibold text-white transition active:translate-y-px"
            >
              <PhoneIcon className="h-4 w-4" />
              {M.actions.call}
            </a>
            <a
              href={waLink(donor.phone, M.search.waMessage(donor.bloodGroup))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink transition active:translate-y-px"
            >
              <ChatIcon className="h-4 w-4" />
              {M.actions.whatsapp}
            </a>
          </div>
        </div>
      ) : null}
    </li>
  );
}
