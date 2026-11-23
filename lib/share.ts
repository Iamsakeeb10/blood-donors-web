import { SITE_URL } from "./config";

export function siteOrigin(): string {
  if (SITE_URL) return SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function inviteMessage(): string {
  return `🩸 রক্তদাতা তালিকায় নিজেকে যুক্ত করুন। রক্ত দরকার হলে কেউ সরাসরি আপনাকে খুঁজে পাবে।\n${siteOrigin()}/join`;
}

export function requestMessage({
  group,
  district,
}: {
  group: string;
  district?: string;
}): string {
  const params = new URLSearchParams({ g: group });
  if (district) params.set("d", district);
  const url = `${siteOrigin()}/?${params.toString()}`;
  return `🩸 জরুরি ${group} রক্ত দরকার${district ? `\nএলাকা: ${district}` : ""}\nদাতাদের তালিকা: ${url}`;
}

export function waLink(phone: string, message?: string): string {
  const withCountryCode = phone.startsWith("0") ? `880${phone.slice(1)}` : phone;
  const base = `https://wa.me/${withCountryCode}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export type ShareResult = "shared" | "copied" | "failed" | "cancelled";

/**
 * Native share sheet on phones, clipboard on desktop. Never uses alert().
 * `navigator.share` must be called directly from a user gesture, so callers
 * should not await anything before invoking this.
 */
export async function shareText(text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof window !== "undefined" &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // fall through
  }

  return "failed";
}
