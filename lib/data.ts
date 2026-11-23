import { COOLDOWN_DAYS } from "./config";
import { daysSince } from "./format";

export { COOLDOWN_DAYS };

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export function isBloodGroup(value: unknown): value is BloodGroup {
  return typeof value === "string" && (BLOOD_GROUPS as readonly string[]).includes(value);
}

/**
 * The 64 official districts, stored as their Bangla names. These strings are the
 * stable value in Firestore and in the URL — never rename an entry without a migration.
 */
export const DISTRICTS = [
  // Dhaka division
  "ঢাকা",
  "গাজীপুর",
  "কিশোরগঞ্জ",
  "মানিকগঞ্জ",
  "মুন্সিগঞ্জ",
  "নারায়ণগঞ্জ",
  "নরসিংদী",
  "টাঙ্গাইল",
  "ফরিদপুর",
  "গোপালগঞ্জ",
  "মাদারীপুর",
  "রাজবাড়ী",
  "শরীয়তপুর",
  // Chattogram division
  "চট্টগ্রাম",
  "কক্সবাজার",
  "কুমিল্লা",
  "ব্রাহ্মণবাড়িয়া",
  "চাঁদপুর",
  "ফেনী",
  "লক্ষ্মীপুর",
  "নোয়াখালী",
  "খাগড়াছড়ি",
  "রাঙ্গামাটি",
  "বান্দরবান",
  // Rajshahi division
  "রাজশাহী",
  "বগুড়া",
  "জয়পুরহাট",
  "নওগাঁ",
  "নাটোর",
  "পাবনা",
  "সিরাজগঞ্জ",
  "চাঁপাইনবাবগঞ্জ",
  // Khulna division
  "খুলনা",
  "বাগেরহাট",
  "চুয়াডাঙ্গা",
  "যশোর",
  "ঝিনাইদহ",
  "কুষ্টিয়া",
  "মাগুরা",
  "মেহেরপুর",
  "নড়াইল",
  "সাতক্ষীরা",
  // Barishal division
  "বরিশাল",
  "বরগুনা",
  "ভোলা",
  "ঝালকাঠি",
  "পটুয়াখালী",
  "পিরোজপুর",
  // Sylhet division
  "সিলেট",
  "হবিগঞ্জ",
  "মৌলভীবাজার",
  "সুনামগঞ্জ",
  // Rangpur division
  "রংপুর",
  "দিনাজপুর",
  "গাইবান্ধা",
  "কুড়িগ্রাম",
  "লালমনিরহাট",
  "নীলফামারী",
  "পঞ্চগড়",
  "ঠাকুরগাঁও",
  // Mymensingh division
  "ময়মনসিংহ",
  "জামালপুর",
  "নেত্রকোণা",
  "শেরপুর",
].sort((a, b) => a.localeCompare(b, "bn"));

export function isDistrict(value: unknown): value is string {
  return typeof value === "string" && DISTRICTS.includes(value);
}

/**
 * URL parameters are untrusted. `+` in a raw query decodes to a space, so "O "
 * must still resolve to O+; anything unknown is ignored rather than crashing.
 */
export function parseGroupParam(raw: string | null | undefined): BloodGroup | "" {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/\s+/g, "");
  if (isBloodGroup(cleaned)) return cleaned;
  const withPlus = `${cleaned}+`;
  return isBloodGroup(withPlus) ? withPlus : "";
}

export function parseDistrictParam(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  return isDistrict(cleaned) ? cleaned : "";
}

export type Donor = {
  uid: string;
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  district: string;
  area?: string;
  available: boolean;
  lastDonated: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DonorStatus = "available" | "cooling" | "unavailable";

export function isCoolingDown(lastDonated: string | null | undefined): boolean {
  const days = daysSince(lastDonated);
  if (days === null || days < 0) return false;
  return days < COOLDOWN_DAYS;
}

export function nextEligibleDate(lastDonated: string | null | undefined): string | null {
  const days = daysSince(lastDonated);
  if (days === null || days < 0) return null;
  const remaining = COOLDOWN_DAYS - days;
  if (remaining < 0) return null;
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + remaining * 86_400_000,
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}`;
}

export function rank(donor: Donor): 0 | 1 | 2 {
  if (!donor.available) return 2;
  return isCoolingDown(donor.lastDonated) ? 1 : 0;
}

export function sortDonors(donors: Donor[]): Donor[] {
  return [...donors].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.updatedAt - a.updatedAt ||
      a.name.localeCompare(b.name, "bn"),
  );
}

export function statusOf(donor: Pick<Donor, "available" | "lastDonated">): DonorStatus {
  if (!donor.available) return "unavailable";
  return isCoolingDown(donor.lastDonated) ? "cooling" : "available";
}
