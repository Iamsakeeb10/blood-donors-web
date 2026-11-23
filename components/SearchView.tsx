"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BloodGroupPicker } from "@/components/BloodGroupPicker";
import { DonorList } from "@/components/DonorList";
import { ShareSheet } from "@/components/ShareSheet";
import { SearchIcon, ShareIcon } from "@/components/icons";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ContactTrigger } from "@/components/ContactTrigger";
import {
  DISTRICTS,
  parseDistrictParam,
  parseGroupParam,
  rank,
  sortDonors,
  type BloodGroup,
  type Donor,
} from "@/lib/data";
import { DonorError, fetchDonorPage, getMyDonor, type DonorPageCursor } from "@/lib/donors";
import { getHasEntry, setHasEntry, subscribeHasEntry } from "@/lib/entryState";
import { ensureUser } from "@/lib/firebase";
import { toBn } from "@/lib/format";
import { M } from "@/lib/messages";
import { requestMessage, shareText } from "@/lib/share";

const readHasEntryServer = () => false;

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const group = parseGroupParam(searchParams.get("g"));
  const district = parseDistrictParam(searchParams.get("d"));
  const hasEntry = useSyncExternalStore(
    subscribeHasEntry,
    getHasEntry,
    readHasEntryServer,
  );

  useEffect(() => {
    if (!hasEntry) return;
    let active = true;

    (async () => {
      try {
        const user = await ensureUser();
        const donor = await getMyDonor(user.uid);
        if (!active) return;
        if (!donor) {
          setHasEntry(false);
        }
      } catch {
        // Do not clear on offline or temporary network errors
      }
    })();

    return () => {
      active = false;
    };
  }, [hasEntry]);

  function setParams(changes: { g?: string | null; d?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());

    if ("g" in changes) {
      if (changes.g) params.set("g", changes.g);
      else params.delete("g");
    }
    if ("d" in changes) {
      if (changes.d) params.set("d", changes.d);
      else params.delete("d");
    }

    const query = params.toString();
    if (query === searchParams.toString()) return;
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  const hasFilters = Boolean(group || district);

  return (
    <>
      <h1 className="text-[28px] font-bold leading-snug text-ink">{M.search.title}</h1>
      <p className="mt-1 text-base leading-relaxed text-ink-2">{M.search.subtitle}</p>

      <div className="mt-5">
        <BloodGroupPicker
          id="searchGroup"
          value={group}
          onChange={(next) => setParams({ g: next })}
        />
      </div>

      <div className="mt-3">
        <Select
          aria-label={M.search.districtLabel}
          value={district}
          onChange={(event) => setParams({ d: event.target.value })}
        >
          <option value="">{M.search.allDistricts}</option>
          {DISTRICTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {hasFilters ? (
        <div className="mt-1 text-right">
          <button
            type="button"
            onClick={() => setParams({ g: null, d: null })}
            className="min-h-12 text-sm font-semibold text-blood-700"
          >
            {M.search.clearFilters}
          </button>
        </div>
      ) : null}

      {group ? (
        <SearchResults
          key={`${group}|${district}`}
          group={group}
          district={district}
          onSearchAllDistricts={() => setParams({ d: null })}
        />
      ) : (
        <div className="mt-6 rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold leading-snug text-ink">
            {M.search.introTitle}
          </h2>
          <p className="mt-1 text-base leading-relaxed text-ink-2">{M.search.introBody}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            {M.search.communityNote}
          </p>
        </div>
      )}

      <footer className="mt-10 text-center text-sm leading-relaxed text-ink-3">
        <p>{M.footer}</p>
        <div className="mt-1">
          {M.join.oldInfoContact}{" "}
          <ContactTrigger className="font-semibold text-blood-700 underline underline-offset-2" />
        </div>
        <p className="mt-1">
          <Link
            href="/about"
            className="inline-flex min-h-12 items-center font-semibold text-blood-700 underline underline-offset-2"
          >
            {M.nav.about}
          </Link>
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/join" className={buttonStyles()}>
            {hasEntry ? M.actions.myInfo : M.actions.join}
          </Link>
        </div>
      </div>
    </>
  );
}

type SearchResultsProps = {
  group: BloodGroup;
  district: string;
  onSearchAllDistricts: () => void;
};

function SearchResults({ group, district, onSearchAllDistricts }: SearchResultsProps) {
  const { show } = useToast();
  const [donors, setDonors] = useState<Donor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<DonorPageCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const mountedRef = useRef(true);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, 8000);

    fetchDonorPage(group, district || undefined, null)
      .then((result) => {
        if (cancelled) return;
        setDonors(result.donors);
        setNext(result.next);
      })
      .catch((queryError: unknown) => {
        if (cancelled) return;
        setError(
          queryError instanceof DonorError ? queryError.message : M.errors.loadFailed,
        );
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(slowTimer);
        setSlow(false);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [group, district, attempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadMore() {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await fetchDonorPage(group, district || undefined, next);
      if (!mountedRef.current) return;
      setDonors((current) => {
        const seen = new Set((current ?? []).map((donor) => donor.uid));
        return sortDonors([
          ...(current ?? []),
          ...page.donors.filter((donor) => !seen.has(donor.uid)),
        ]);
      });
      setNext(page.next);
    } catch {
      if (mountedRef.current) setLoadMoreFailed(true);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }

  function retry() {
    setLoading(true);
    setError(null);
    setDonors(null);
    setNext(null);
    setLoadMoreFailed(false);
    setSlow(false);
    setFilterText("");
    setAttempt((current) => current + 1);
  }

  async function handleShare() {
    const text = requestMessage({ group, district: district || undefined });
    const result = await shareText(text);
    if (result === "copied") show(M.toast.copied);
    else if (result === "failed") setFallbackText(text);
  }

  const filteredDonors = useMemo(() => {
    if (!donors) return null;
    const q = filterText.trim().toLowerCase();
    if (!q) return donors;
    return donors.filter((donor) => {
      const area = (donor.area ?? "").toLowerCase();
      const dist = donor.district.toLowerCase();
      const name = donor.name.toLowerCase();
      return area.includes(q) || dist.includes(q) || name.includes(q);
    });
  }, [donors, filterText]);

  if (error) {
    return (
      <div className="mt-6 rounded-card border border-line bg-surface p-5">
        <p className="text-base font-semibold leading-snug text-ink">
          {M.search.errorTitle}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{error}</p>
        <Button variant="secondary" className="mt-3" onClick={retry}>
          {M.actions.retry}
        </Button>
      </div>
    );
  }

  const availableCount =
    filteredDonors?.filter((donor) => rank(donor) === 0).length ?? 0;
  const countLabel = donors
    ? filterText.trim()
      ? M.search.filteredCount(toBn(filteredDonors?.length ?? 0))
      : `${M.search.resultCount(`${toBn(donors.length)}${next ? "+" : ""}`)}${district ? ` · ${district}` : ""}`
    : M.search.loading;

  return (
    <>
      <div className="mt-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug text-ink">{countLabel}</p>
          {!loading && availableCount > 0 ? (
            <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
              {M.search.availableSubline(toBn(availableCount))}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink transition active:translate-y-px"
        >
          <ShareIcon className="h-4 w-4" />
          {M.actions.share}
        </button>
      </div>

      {donors && donors.length > 0 ? (
        <div className="relative mt-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-3">
            <SearchIcon className="h-4 w-4" />
          </div>
          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={M.search.filterPlaceholder}
            aria-label={M.search.filterPlaceholder}
            className="h-11 w-full rounded-control border border-line bg-surface pl-10 pr-20 text-base text-ink placeholder:text-ink-3 outline-none transition focus:border-blood-600 focus:ring-1 focus:ring-blood-600"
          />
          {filterText ? (
            <button
              type="button"
              onClick={() => setFilterText("")}
              className="absolute right-0 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded px-3 text-sm font-semibold text-blood-700 hover:bg-blood-50 active:translate-y-px"
            >
              {M.actions.clear}
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <>
          <ul className="mt-3 grid gap-2 md:grid-cols-2" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
              <li key={item}>
                <Skeleton className="h-24 w-full rounded-card" />
              </li>
            ))}
          </ul>
          {slow ? (
            <p role="status" className="mt-2 text-sm leading-relaxed text-ink-3">
              {M.search.slow}
            </p>
          ) : null}
        </>
      ) : donors && donors.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-5 text-center">
          <p className="text-base font-semibold leading-relaxed text-ink">
            {district ? M.search.noDonorsDistrict : M.search.noDonors}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{M.search.emptyNote}</p>
          <div className="mt-4 grid gap-2">
            {district ? (
              <Button variant="secondary" onClick={onSearchAllDistricts}>
                {M.search.searchAllDistricts}
              </Button>
            ) : null}
            <Button
              variant={district ? "ghost" : "secondary"}
              onClick={() => {
                void handleShare();
              }}
            >
              {M.actions.share}
            </Button>
          </div>
        </div>
      ) : filteredDonors && filteredDonors.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-5 text-center">
          <p className="text-base font-semibold leading-relaxed text-ink">
            {M.search.noFilteredDonors}
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => setFilterText("")}>
              {M.search.clearFilter}
            </Button>
          </div>
        </div>
      ) : filteredDonors ? (
        <DonorList
          donors={filteredDonors}
          expandedUid={expandedUid}
          onToggle={(uid) =>
            setExpandedUid((current) => (current === uid ? null : uid))
          }
        />
      ) : null}

      {!loading && next && !filterText.trim() ? (
        <div className="mt-3">
          {loadMoreFailed ? (
            <p role="alert" className="mb-2 text-sm leading-relaxed text-err">
              {M.search.loadMoreFailed}
            </p>
          ) : null}
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={() => {
              void loadMore();
            }}
          >
            {M.search.loadMore}
          </Button>
          {!district && donors && donors.length >= 90 ? (
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-3">
              {M.search.narrowHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <ShareSheet
        open={fallbackText !== null}
        text={fallbackText ?? ""}
        onClose={() => setFallbackText(null)}
      />
    </>
  );
}

export function SearchSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-8 w-2/3" />
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
