import { describe, expect, it } from "vitest";
import { isValidBDPhone, normalizePhone, validateDonorForm, type DonorFormValues } from "./validation";

const validValues: DonorFormValues = {
  name: "রাহিম উদ্দিন",
  bloodGroup: "O+",
  phone: "01712345678",
  district: "রংপুর",
  area: "সদর",
  available: true,
  lastDonated: "",
  consent: true,
};

describe("normalizePhone", () => {
  it("accepts plain local digits", () => {
    expect(normalizePhone("01712345678")).toBe("01712345678");
  });

  it("converts Bangla digits", () => {
    expect(normalizePhone("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
  });

  it("strips +880 and separators", () => {
    expect(normalizePhone("+880 1712-345678")).toBe("01712345678");
    expect(normalizePhone("8801712345678")).toBe("01712345678");
  });

  it("does not validate, only normalises", () => {
    expect(normalizePhone("01712")).toBe("01712");
    expect(normalizePhone("")).toBe("");
  });
});

describe("isValidBDPhone", () => {
  it("accepts operator prefixes 013-019", () => {
    for (const prefix of ["013", "014", "015", "016", "017", "018", "019"]) {
      expect(isValidBDPhone(`${prefix}12345678`)).toBe(true);
    }
  });

  it("rejects landlines, short and long numbers", () => {
    expect(isValidBDPhone("01212345678")).toBe(false);
    expect(isValidBDPhone("0171234567")).toBe(false);
    expect(isValidBDPhone("017123456789")).toBe(false);
    expect(isValidBDPhone("0212345678")).toBe(false);
  });
});

describe("validateDonorForm", () => {
  it("accepts a complete form", () => {
    const result = validateDonorForm(validValues, { requireConsent: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values).toMatchObject({
        name: "রাহিম উদ্দিন",
        bloodGroup: "O+",
        phone: "01712345678",
        district: "রংপুর",
        area: "সদর",
        lastDonated: null,
      });
    }
  });

  it("normalises phone and collapses whitespace", () => {
    const result = validateDonorForm(
      { ...validValues, name: "  রাহিম   উদ্দিন ", phone: "+880 1712 345678" },
      { requireConsent: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.name).toBe("রাহিম উদ্দিন");
      expect(result.values.phone).toBe("01712345678");
    }
  });

  it("requires name, group, district, phone and consent", () => {
    const result = validateDonorForm(
      { ...validValues, name: "   ", bloodGroup: "", phone: "01712", district: "", consent: false },
      { requireConsent: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.bloodGroup).toBeTruthy();
      expect(result.errors.phone).toBeTruthy();
      expect(result.errors.district).toBeTruthy();
      expect(result.errors.consent).toBeTruthy();
    }
  });

  it("rejects spam-looking names", () => {
    for (const name of ["visit https://x.com", "www.spam.com", "call 01712345678", "12345", "a@b"]) {
      const result = validateDonorForm({ ...validValues, name }, { requireConsent: true });
      expect(result.ok).toBe(false);
    }
  });

  it("counts names by code points, not UTF-16 units", () => {
    const emojiName = "😀".repeat(40);
    const result = validateDonorForm({ ...validValues, name: emojiName }, { requireConsent: true });
    expect(result.ok).toBe(true);
  });

  it("rejects names longer than 40 code points", () => {
    const result = validateDonorForm({ ...validValues, name: "ক".repeat(41) }, {
      requireConsent: true,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an area longer than 60 code points", () => {
    const result = validateDonorForm({ ...validValues, area: "ক".repeat(61) }, {
      requireConsent: true,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects future and malformed donation dates", () => {
    const future = validateDonorForm(
      { ...validValues, lastDonated: daysAgo(-2) },
      { requireConsent: true },
    );
    expect(future.ok).toBe(false);

    const malformed = validateDonorForm(
      { ...validValues, lastDonated: "2026-02-30" },
      { requireConsent: true },
    );
    expect(malformed.ok).toBe(false);
  });

  it("accepts a recent past donation date", () => {
    const result = validateDonorForm(
      { ...validValues, lastDonated: daysAgo(119) },
      { requireConsent: true },
    );
    expect(result.ok).toBe(true);
  });

  it("skips consent on edits", () => {
    const result = validateDonorForm({ ...validValues, consent: false }, { requireConsent: false });
    expect(result.ok).toBe(true);
  });
});

function daysAgo(days: number): string {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - days * 86_400_000,
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}`;
}
