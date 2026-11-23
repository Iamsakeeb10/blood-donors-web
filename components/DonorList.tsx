"use client";

import { Fragment } from "react";
import { DonorCard } from "@/components/DonorCard";
import { rank, type Donor } from "@/lib/data";
import { M } from "@/lib/messages";

type DonorListProps = {
  donors: Donor[];
  expandedUid: string | null;
  onToggle: (uid: string) => void;
};

export function DonorList({ donors, expandedUid, onToggle }: DonorListProps) {
  const firstLower = donors.findIndex((donor) => rank(donor) > 0);

  return (
    <ul className="mt-3 grid gap-2 md:grid-cols-2">
      {donors.map((donor, index) => (
        <Fragment key={donor.uid}>
          {index === firstLower && firstLower > 0 ? (
            <li className="md:col-span-2">
              <p className="px-1 pb-1 pt-2 text-sm font-semibold text-ink-3">
                {M.search.lowerDivider}
              </p>
            </li>
          ) : null}
          <DonorCard
            donor={donor}
            expanded={expandedUid === donor.uid}
            onToggle={() => onToggle(donor.uid)}
          />
        </Fragment>
      ))}
    </ul>
  );
}
