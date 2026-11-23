"use client";

import { useEffect } from "react";
import { ensureAppCheck } from "@/lib/firebase";

/** Warms up App Check after hydration so it stays out of the first-load bundle. */
export function AppCheckInit() {
  useEffect(() => {
    void ensureAppCheck();
  }, []);

  return null;
}
