const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

const MS_PER_DAY = 86_400_000;

export type DateParts = { year: number; month: number; day: number };

export function toBn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
}

export function toLatinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
}

/** Parses a strict `YYYY-MM-DD` string as a calendar date (no timezone shifting). */
export function parseDateOnly(value: string | null | undefined): DateParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function dayIndex(parts: DateParts): number {
  return Math.round(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

export function todayParts(): DateParts {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Whole calendar days between `value` and today. Negative for future dates, null if invalid. */
export function daysSince(value: string | null | undefined): number | null {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  return dayIndex(todayParts()) - dayIndex(parts);
}

function toDateOnly(parts: DateParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function addDays(value: string, days: number): string | null {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + days * MS_PER_DAY);
  return toDateOnly({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function formatDateBn(value: string | null | undefined): string {
  const parts = parseDateOnly(value);
  if (!parts) return "";
  return `${toBn(parts.day)} ${BN_MONTHS[parts.month - 1]} ${toBn(parts.year)}`;
}

export function formatTimestampBn(ms: number): string {
  const date = new Date(ms);
  return `${toBn(date.getDate())} ${BN_MONTHS[date.getMonth()]} ${toBn(date.getFullYear())}`;
}

export function formatDaysAgo(days: number): string {
  if (days <= 0) return "আজ";
  if (days === 1) return "১ দিন আগে";
  return `${toBn(days)} দিন আগে`;
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
