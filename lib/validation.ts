import { isBloodGroup, isDistrict, type BloodGroup } from "./data";
import { daysSince, toLatinDigits } from "./format";
import { M } from "./messages";

const MAX_NAME_LENGTH = 40;
const MAX_AREA_LENGTH = 60;
const MAX_AGE_DAYS = 60 * 366;

export type DonorInput = {
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  district: string;
  area: string;
  available: boolean;
  lastDonated: string | null;
};

export type DonorFormValues = {
  name: string;
  bloodGroup: string;
  phone: string;
  district: string;
  area: string;
  available: boolean;
  lastDonated: string;
  consent: boolean;
};

export type DonorFormErrors = Partial<Record<keyof DonorFormValues, string>>;

export type DonorValidation =
  | { ok: true; values: DonorInput }
  | { ok: false; errors: DonorFormErrors };

export function normalizePhone(raw: string): string {
  let digits = toLatinDigits(raw).replace(/\D/g, "");

  // Only strip the country code once the number is longer than a local one, so a
  // hand-typed "+880…" isn't swallowed digit by digit while typing.
  if (digits.length > 11) {
    if (digits.startsWith("880")) digits = digits.slice(3);
    else if (digits.startsWith("88")) digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;

  return digits.slice(0, 11);
}

export function isValidBDPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone);
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function looksLikeSpam(name: string): boolean {
  return /https?:\/\//i.test(name) || /www\./i.test(name) || name.includes("@") || /^\d+$/.test(name) || /\d{5,}/.test(name);
}

export function validateDonorForm(
  values: DonorFormValues,
  options: { requireConsent: boolean },
): DonorValidation {
  const errors: DonorFormErrors = {};

  const name = collapseWhitespace(values.name);
  if (!name) {
    errors.name = M.errors.nameRequired;
  } else if (Array.from(name).length > MAX_NAME_LENGTH) {
    errors.name = M.errors.nameTooLong;
  } else if (looksLikeSpam(toLatinDigits(name))) {
    errors.name = M.errors.nameSpam;
  }

  const bloodGroup = values.bloodGroup;
  if (!isBloodGroup(bloodGroup)) {
    errors.bloodGroup = M.errors.groupRequired;
  }

  const phone = normalizePhone(values.phone);
  if (!isValidBDPhone(phone)) {
    errors.phone = M.errors.phoneInvalid;
  }

  const district = values.district;
  if (!isDistrict(district)) {
    errors.district = M.errors.districtRequired;
  }

  const area = collapseWhitespace(values.area);
  if (Array.from(area).length > MAX_AREA_LENGTH) {
    errors.area = M.errors.areaTooLong;
  }

  const lastDonated = values.lastDonated.trim();
  if (lastDonated) {
    const days = daysSince(lastDonated);
    if (days === null) {
      errors.lastDonated = M.errors.dateInvalid;
    } else if (days < 0) {
      errors.lastDonated = M.errors.dateFuture;
    } else if (days > MAX_AGE_DAYS) {
      errors.lastDonated = M.errors.dateTooOld;
    }
  }

  if (options.requireConsent && !values.consent) {
    errors.consent = M.errors.consentRequired;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      name,
      bloodGroup: bloodGroup as BloodGroup,
      phone,
      district,
      area,
      available: values.available,
      lastDonated: lastDonated || null,
    },
  };
}
