import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchSkeleton, SearchView } from "@/components/SearchView";
import { M } from "@/lib/messages";

export const metadata: Metadata = {
  title: { absolute: M.appNameFull },
};

export default function HomePage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
