import { describe, expect, it } from "vitest";
import { addDays, daysSince, formatDateBn, formatDaysAgo, parseDateOnly, toBn } from "./format";

describe("toBn", () => {
  it("converts Latin digits", () => {
    expect(toBn(1234567890)).toBe("১২৩৪৫৬৭৮৯০");
    expect(toBn("৫ জন")).toBe("৫ জন");
  });
});

describe("parseDateOnly", () => {
  it("parses valid dates and rejects impossible ones", () => {
    expect(parseDateOnly("2026-10-12")).toEqual({ year: 2026, month: 10, day: 12 });
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("12/10/2026")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
  });
});

describe("formatDateBn", () => {
  it("formats in Bangla with Bangla digits", () => {
    expect(formatDateBn("2026-10-12")).toBe("১২ অক্টোবর ২০২৬");
    expect(formatDateBn("2026-01-01")).toBe("১ জানুয়ারি ২০২৬");
    expect(formatDateBn("bad")).toBe("");
  });
});

describe("formatDaysAgo", () => {
  it("speaks in human terms", () => {
    expect(formatDaysAgo(0)).toBe("আজ");
    expect(formatDaysAgo(1)).toBe("১ দিন আগে");
    expect(formatDaysAgo(35)).toBe("৩৫ দিন আগে");
  });
});

describe("addDays", () => {
  it("shifts calendar dates", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("bad", 1)).toBeNull();
  });
});

describe("daysSince", () => {
  it("is negative for future dates and null for bad input", () => {
    expect(daysSince("2999-01-01")).toBeLessThan(0);
    expect(daysSince("bad")).toBeNull();
  });
});
