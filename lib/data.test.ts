import { describe, expect, it } from "vitest";
import {
  COOLDOWN_DAYS,
  DISTRICTS,
  isCoolingDown,
  nextEligibleDate,
  parseDistrictParam,
  parseGroupParam,
  rank,
  sortDonors,
  type Donor,
} from "./data";

function daysAgo(days: number): string {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - days * 86_400_000,
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}`;
}

function makeDonor(overrides: Partial<Donor> = {}): Donor {
  return {
    uid: "uid-1",
    name: "দাতা",
    bloodGroup: "O+",
    phone: "01712345678",
    district: "রংপুর",
    available: true,
    lastDonated: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("DISTRICTS", () => {
  it("has all 64 districts, unique", () => {
    expect(DISTRICTS).toHaveLength(64);
    expect(new Set(DISTRICTS).size).toBe(64);
  });
});

describe("URL parameter parsing", () => {
  it("maps a raw '+' that decoded to a space back to a valid group", () => {
    expect(parseGroupParam("O ")).toBe("O+");
    expect(parseGroupParam("AB ")).toBe("AB+");
  });

  it("keeps valid groups and rejects junk", () => {
    expect(parseGroupParam("O+")).toBe("O+");
    expect(parseGroupParam("AB-")).toBe("AB-");
    expect(parseGroupParam("Z+")).toBe("");
    expect(parseGroupParam(null)).toBe("");
  });

  it("only accepts known districts", () => {
    expect(parseDistrictParam(" রংপুর ")).toBe("রংপুর");
    expect(parseDistrictParam("Atlantis")).toBe("");
    expect(parseDistrictParam(null)).toBe("");
  });
});

describe("isCoolingDown", () => {
  it("is true before the cooldown and false on/after it", () => {
    expect(isCoolingDown(daysAgo(0))).toBe(true);
    expect(isCoolingDown(daysAgo(119))).toBe(true);
    expect(isCoolingDown(daysAgo(COOLDOWN_DAYS))).toBe(false);
    expect(isCoolingDown(daysAgo(COOLDOWN_DAYS + 1))).toBe(false);
  });

  it("treats missing, malformed and future dates as not cooling", () => {
    expect(isCoolingDown(null)).toBe(false);
    expect(isCoolingDown("")).toBe(false);
    expect(isCoolingDown("not-a-date")).toBe(false);
    expect(isCoolingDown(daysAgo(-3))).toBe(false);
  });
});

describe("rank", () => {
  it("sorts available first, recently donated second, unavailable last", () => {
    expect(rank(makeDonor({ available: true, lastDonated: null }))).toBe(0);
    expect(rank(makeDonor({ available: true, lastDonated: daysAgo(10) }))).toBe(1);
    expect(rank(makeDonor({ available: false, lastDonated: null }))).toBe(2);
  });
});

describe("sortDonors", () => {
  it("orders by rank then updatedAt desc without mutating input", () => {
    const input = [
      makeDonor({ uid: "unavailable", available: false, updatedAt: 99 }),
      makeDonor({ uid: "cooling", lastDonated: daysAgo(10), updatedAt: 50 }),
      makeDonor({ uid: "available-old", updatedAt: 10 }),
      makeDonor({ uid: "available-new", updatedAt: 20 }),
    ];
    const sorted = sortDonors(input);
    expect(sorted.map((d) => d.uid)).toEqual([
      "available-new",
      "available-old",
      "cooling",
      "unavailable",
    ]);
    expect(input[0].uid).toBe("unavailable");
  });
});

describe("nextEligibleDate", () => {
  it("returns today for a donation exactly COOLDOWN_DAYS ago", () => {
    expect(nextEligibleDate(daysAgo(COOLDOWN_DAYS))).toBe(daysAgo(0));
  });

  it("returns a future date for a recent donation", () => {
    const next = nextEligibleDate(daysAgo(10));
    expect(next).not.toBeNull();
    expect(next! > daysAgo(0)).toBe(true);
  });

  it("returns null when no date or already eligible", () => {
    expect(nextEligibleDate(null)).toBeNull();
    expect(nextEligibleDate("bad")).toBeNull();
    expect(nextEligibleDate(daysAgo(COOLDOWN_DAYS + 5))).toBeNull();
  });
});
