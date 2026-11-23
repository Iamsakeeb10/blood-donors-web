"use client";

import { useEffect, useState } from "react";
import { M } from "@/lib/messages";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-warn/20 bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn"
    >
      {M.offline}
    </div>
  );
}
