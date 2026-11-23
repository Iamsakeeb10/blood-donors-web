export const HAS_ENTRY_KEY = "hasEntry";

type Listener = () => void;
const listeners = new Set<Listener>();

export function getHasEntry(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HAS_ENTRY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHasEntry(hasEntry: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (hasEntry) {
      window.localStorage.setItem(HAS_ENTRY_KEY, "1");
    } else {
      window.localStorage.removeItem(HAS_ENTRY_KEY);
    }
  } catch {
    // Ignore storage quota or access errors
  }

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });

  try {
    window.dispatchEvent(new Event("hasEntryChange"));
  } catch {
    // Ignore event dispatch errors
  }
}

export function subscribeHasEntry(callback: () => void): () => void {
  listeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === HAS_ENTRY_KEY) {
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}
