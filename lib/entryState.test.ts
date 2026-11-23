import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HAS_ENTRY_KEY,
  getHasEntry,
  setHasEntry,
  subscribeHasEntry,
} from "./entryState";

describe("entryState", () => {
  const originalWindow = globalThis.window;
  let store: Record<string, string> = {};
  let eventListeners: Record<string, Array<() => void>> = {};

  beforeEach(() => {
    store = {};
    eventListeners = {};

    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    const mockWindow = {
      localStorage: mockStorage,
      addEventListener: (type: string, listener: () => void) => {
        eventListeners[type] = eventListeners[type] || [];
        eventListeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: () => void) => {
        if (!eventListeners[type]) return;
        eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
      },
      dispatchEvent: (event: { type: string }) => {
        const listeners = eventListeners[event.type] || [];
        listeners.forEach((l) => l());
        return true;
      },
    };

    // @ts-expect-error Mocking window in node
    globalThis.window = mockWindow;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("returns false initially when no key exists", () => {
    expect(getHasEntry()).toBe(false);
  });

  it("sets and gets entry state correctly", () => {
    setHasEntry(true);
    expect(getHasEntry()).toBe(true);
    expect(window.localStorage.getItem(HAS_ENTRY_KEY)).toBe("1");

    setHasEntry(false);
    expect(getHasEntry()).toBe(false);
    expect(window.localStorage.getItem(HAS_ENTRY_KEY)).toBeNull();
  });

  it("notifies subscribers when state changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHasEntry(listener);

    setHasEntry(true);
    expect(listener).toHaveBeenCalledTimes(1);

    setHasEntry(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setHasEntry(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
