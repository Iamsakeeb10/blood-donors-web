"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { BloodGroupPicker } from "@/components/BloodGroupPicker";
import { ShareSheet } from "@/components/ShareSheet";
import { ArrowLeftIcon, CheckIcon, CopyIcon, DropIcon, TrashIcon } from "@/components/icons";
import { Button, buttonStyles } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { inputClass } from "@/components/ui/styles";
import { useToast } from "@/components/ui/Toast";
import { ContactTrigger } from "@/components/ContactTrigger";
import { DISTRICTS, type Donor } from "@/lib/data";
import {
  DonorError,
  deleteMyDonor,
  findDonorsByPhone,
  getMyDonor,
  saveMyDonor,
} from "@/lib/donors";
import { ensureUser, FirebaseNotConfiguredError } from "@/lib/firebase";
import { formatTimestampBn, todayIso, toBn } from "@/lib/format";
import { M } from "@/lib/messages";
import { inviteMessage, shareText } from "@/lib/share";
import {
  isValidBDPhone,
  normalizePhone,
  validateDonorForm,
  type DonorFormErrors,
  type DonorFormValues,
  type DonorInput,
} from "@/lib/validation";

import { setHasEntry } from "@/lib/entryState";

const DRAFT_KEY = "bd-donor-draft-v1";

type Draft = Omit<DonorFormValues, "consent">;

type AuthState =
  | { status: "pending" }
  | { status: "ready"; uid: string }
  | { status: "error"; isConfigError?: boolean };

type EntryState = "loading" | "ready" | "error";

const fieldOrder = [
  "name",
  "bloodGroup",
  "phone",
  "district",
  "area",
  "lastDonated",
  "consent",
] as const;

const emptyValues: DonorFormValues = {
  name: "",
  bloodGroup: "",
  phone: "",
  district: "",
  area: "",
  available: true,
  lastDonated: "",
  consent: false,
};

function donorToInput(donor: Donor, available: boolean): DonorInput {
  return {
    name: donor.name,
    bloodGroup: donor.bloodGroup,
    phone: donor.phone,
    district: donor.district,
    area: donor.area ?? "",
    available,
    lastDonated: donor.lastDonated,
  };
}

export function JoinView() {
  const { show } = useToast();
  const [values, setValues] = useState<DonorFormValues>(emptyValues);
  const [errors, setErrors] = useState<DonorFormErrors>({});
  const [summary, setSummary] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ status: "pending" });
  const [entryState, setEntryState] = useState<EntryState>("loading");
  const [existing, setExisting] = useState<Donor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Donor | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const draftLoaded = useRef(false);
  const pendingInputRef = useRef<DonorInput | null>(null);

  const loadEntry = useCallback(async (uid: string) => {
    setEntryState("loading");
    try {
      const donor = await getMyDonor(uid);
      setExisting(donor);
      if (donor) {
        setHasEntry(true);
        setValues({
          name: donor.name,
          bloodGroup: donor.bloodGroup,
          phone: donor.phone,
          district: donor.district,
          area: donor.area ?? "",
          available: donor.available,
          lastDonated: donor.lastDonated ?? "",
          consent: true,
        });
        setShowDate(Boolean(donor.lastDonated));
      } else {
        setHasEntry(false);
      }
      setEntryState("ready");
    } catch {
      setEntryState("error");
    }
  }, []);

  const runAuth = useCallback(() => {
    ensureUser()
      .then((user) => {
        setAuthState({ status: "ready", uid: user.uid });
        void loadEntry(user.uid);
      })
      .catch((err: unknown) => {
        const isConfig = err instanceof FirebaseNotConfiguredError;
        setAuthState({ status: "error", isConfigError: isConfig });
      });
  }, [loadEntry]);

  const retryAuth = useCallback(() => {
    setAuthState({ status: "pending" });
    runAuth();
  }, [runAuth]);

  const retryEntry = useCallback(() => {
    if (authState.status === "ready") void loadEntry(authState.uid);
    else retryAuth();
  }, [authState, loadEntry, retryAuth]);

  useEffect(() => {
    runAuth();
  }, [runAuth]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Draft>;
        // sessionStorage is client-only: reading it after hydration avoids an SSR mismatch (plan M4).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues((current) => ({
          ...current,
          name: typeof draft.name === "string" ? draft.name : current.name,
          bloodGroup:
            typeof draft.bloodGroup === "string" ? draft.bloodGroup : current.bloodGroup,
          phone: typeof draft.phone === "string" ? draft.phone : current.phone,
          district: typeof draft.district === "string" ? draft.district : current.district,
          area: typeof draft.area === "string" ? draft.area : current.area,
          available:
            typeof draft.available === "boolean" ? draft.available : current.available,
          lastDonated:
            typeof draft.lastDonated === "string" ? draft.lastDonated : current.lastDonated,
          consent: false,
        }));
        if (typeof draft.lastDonated === "string" && draft.lastDonated) {
          setShowDate(true);
        }
      }
    } catch {
      // Private mode / blocked storage: the form still works without drafts.
    }
    draftLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!draftLoaded.current || saved || existing) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values, consent: false }));
    } catch {
      // ignore storage failures
    }
  }, [values, saved, existing]);

  function update<K extends keyof DonorFormValues>(field: K, value: DonorFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function focusFirstError(nextErrors: DonorFormErrors) {
    const first = fieldOrder.find((field) => nextErrors[field]);
    if (!first) return;
    const element = document.getElementById(first);
    if (!element) return;
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.focus({ preventScroll: true });
  }

  async function persist(input: DonorInput) {
    if (authState.status !== "ready") return;

    try {
      const donor = await saveMyDonor(
        authState.uid,
        input,
        existing ? existing.createdAt : undefined,
      );
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore storage failures
      }

      if (existing) {
        setExisting(donor);
        setValues({ ...input, lastDonated: input.lastDonated ?? "", consent: true });
        setShowDate(Boolean(input.lastDonated));
        setHasEntry(true);
        show(M.toast.updated);
      } else {
        setExisting(donor);
        setSaved(donor);
        setHasEntry(true);
      }
    } catch (error) {
      setFormError(error instanceof DonorError ? error.message : M.errors.saveFailed);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (authState.status !== "ready") return;

    setFormError(null);
    const result = validateDonorForm(values, { requireConsent: !existing });

    if (!result.ok) {
      setErrors(result.errors);
      setSummary(M.errors.summary(toBn(Object.keys(result.errors).length)));
      focusFirstError(result.errors);
      return;
    }

    setErrors({});
    setSummary("");
    submittingRef.current = true;
    setSubmitting(true);

    try {
      if (!existing) {
        try {
          const matches = await findDonorsByPhone(result.values.phone);
          if (matches.some((donor) => donor.uid !== authState.uid)) {
            pendingInputRef.current = result.values;
            setDuplicateNotice(true);
            return;
          }
        } catch {
          // Duplicate check is best-effort; never block a legitimate save on it.
        }
      }

      await persist(result.values);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function confirmDuplicate() {
    const input = pendingInputRef.current;
    pendingInputRef.current = null;
    setDuplicateNotice(false);
    if (!input || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await persist(input);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleAvailabilityToggle(next: boolean) {
    if (!existing) {
      update("available", next);
      return;
    }
    if (authState.status !== "ready" || toggling) return;

    const previous = existing.available;
    update("available", next);
    setToggling(true);
    try {
      const donor = await saveMyDonor(
        authState.uid,
        donorToInput(existing, next),
        existing.createdAt,
      );
      setExisting(donor);
      show(M.toast.updated);
    } catch {
      update("available", previous);
      show(M.errors.saveFailed, "error");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (authState.status !== "ready" || deleting) return;
    setDeleting(true);
    try {
      await deleteMyDonor(authState.uid);
      setHasEntry(false);
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore storage failures
      }
      setDeleteOpen(false);
      setDeleted(true);
    } catch (error) {
      setDeleteOpen(false);
      show(error instanceof DonorError ? error.message : M.errors.deleteFailed, "error");
    } finally {
      setDeleting(false);
    }
  }

  function resetAfterDelete() {
    setDeleted(false);
    setExisting(null);
    setHasEntry(false);
    setValues(emptyValues);
    setShowDate(false);
    setErrors({});
    setFormError(null);
  }

  async function handleInvite() {
    const text = inviteMessage();
    const result = await shareText(text);
    if (result === "copied") show(M.toast.copied);
    else if (result === "failed") setFallbackText(text);
  }

  async function copyLink() {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(window.location.href);
      show(M.toast.copied);
    } catch {
      setFallbackText(window.location.href);
    }
  }

  if (saved) {
    return (
      <div className="flex min-h-[62dvh] flex-col items-center justify-center py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ok-bg text-ok">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h1 className="mt-5 text-[28px] font-bold leading-snug text-ink">
          {M.join.successTitle}
        </h1>
        <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">
          {M.join.successBody}
        </p>
        <div className="mt-8 w-full max-w-sm space-y-2">
          <Link
            href={`/?g=${encodeURIComponent(saved.bloodGroup)}`}
            className={buttonStyles()}
          >
            {M.actions.viewList}
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              void handleInvite();
            }}
          >
            {M.actions.invite}
          </Button>
          <Button variant="ghost" onClick={() => setSaved(null)}>
            {M.actions.myInfo}
          </Button>
        </div>
        <ShareSheet
          open={fallbackText !== null}
          text={fallbackText ?? ""}
          onClose={() => setFallbackText(null)}
        />
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="flex min-h-[62dvh] flex-col items-center justify-center py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-off-bg text-off">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h1 className="mt-5 text-[28px] font-bold leading-snug text-ink">
          {M.join.deletedTitle}
        </h1>
        <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">
          {M.join.deletedBody}
        </p>
        <div className="mt-8 w-full max-w-sm space-y-2">
          <Link href="/" className={buttonStyles()}>
            {M.nav.home}
          </Link>
          <Button variant="secondary" onClick={resetAfterDelete}>
            {M.join.joinAgain}
          </Button>
        </div>
      </div>
    );
  }

  const initialLoading =
    authState.status === "pending" ||
    (authState.status === "ready" && entryState === "loading");

  if (initialLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold text-blood-700 transition hover:text-blood-900 active:translate-y-px"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>{M.nav.back}</span>
        </Link>

        {existing ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={submitting || toggling}
            title={M.actions.delete}
            aria-label={M.actions.delete}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-2.5 py-1 text-sm font-semibold text-err transition hover:bg-blood-50 active:translate-y-px disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{M.actions.delete}</span>
          </button>
        ) : null}
      </div>

      <h1 className="text-[28px] font-bold leading-snug text-ink">
        {existing ? M.join.editTitle : M.join.title}
      </h1>
      {existing ? (
        <p className="mt-1 text-sm leading-relaxed text-ink-3">
          {M.join.lastUpdated(formatTimestampBn(existing.updatedAt))}
        </p>
      ) : (
        <p className="mt-1 text-base leading-relaxed text-ink-2">{M.join.intro}</p>
      )}

      {authState.status === "error" ? (
        <div role="alert" className="mt-4 rounded-card border border-err/30 bg-blood-50 p-4">
          <p className="text-base font-semibold leading-snug text-blood-900">
            {authState.isConfigError ? M.join.configErrorTitle : M.join.authErrorTitle}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            {authState.isConfigError ? M.join.configErrorBody : M.errors.authFailed}
          </p>
          <div className="mt-3 grid gap-2">
            <Button variant="secondary" onClick={retryAuth}>
              {M.actions.retry}
            </Button>
            {!authState.isConfigError ? (
              <Button
                variant="ghost"
                onClick={() => {
                  void copyLink();
                }}
              >
                <CopyIcon className="h-4 w-4" />
                {M.join.copyLink}
              </Button>
            ) : null}
          </div>
        </div>
      ) : entryState === "error" ? (
        <div role="alert" className="mt-4 rounded-card border border-line bg-surface p-4">
          <p className="text-base font-semibold leading-snug text-ink">
            {M.join.loadErrorTitle}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{M.errors.loadFailed}</p>
          <Button variant="secondary" className="mt-3" onClick={retryEntry}>
            {M.actions.retry}
          </Button>
        </div>
      ) : (
        <>
          <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-6">
            <p role="status" aria-live="polite" className="sr-only">
              {summary}
            </p>

            {/* Name */}
            <Field label={M.join.name} hint={M.join.nameHint} error={errors.name} id="name">
              {(control) => (
                <input
                  {...control}
                  className={inputClass}
                  autoComplete="name"
                  placeholder={M.form.namePlaceholder}
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              )}
            </Field>

            {/* Blood group */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-sm font-semibold text-ink-2">
                  {M.join.bloodGroup}
                </span>
                <span className="text-xs text-ink-3">{M.form.pickOne}</span>
              </div>
              <BloodGroupPicker
                value={values.bloodGroup}
                onChange={(group) => update("bloodGroup", group)}
                invalid={Boolean(errors.bloodGroup)}
                disabled={submitting}
              />
              {errors.bloodGroup ? (
                <p className="text-sm leading-relaxed text-err">{errors.bloodGroup}</p>
              ) : null}
            </div>

            {/* Phone */}
            <Field
              label={M.join.phone}
              hint={M.join.phoneHint}
              error={errors.phone}
              id="phone"
            >
              {(control) => (
                <div>
                  <input
                    {...control}
                    className={inputClass}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="01XXXXXXXXX"
                    value={values.phone}
                    onChange={(event) => update("phone", normalizePhone(event.target.value))}
                  />
                  {isValidBDPhone(values.phone) && !errors.phone ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-ok">
                      <CheckIcon className="h-3.5 w-3.5" />
                      <span>{M.form.phoneOk}</span>
                    </p>
                  ) : null}
                </div>
              )}
            </Field>

            {/* Location (District & Area) in responsive 2-column grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={M.join.district} error={errors.district} id="district">
                {(control) => (
                  <Select
                    {...control}
                    value={values.district}
                    onChange={(event) => update("district", event.target.value)}
                  >
                    <option value="">{M.join.districtPlaceholder}</option>
                    {DISTRICTS.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label={M.join.area} hint={M.join.areaHint} error={errors.area} id="area">
                {(control) => (
                  <input
                    {...control}
                    className={inputClass}
                    placeholder={M.form.areaPlaceholder}
                    value={values.area}
                    onChange={(event) => update("area", event.target.value)}
                  />
                )}
              </Field>
            </div>

            {/* Availability status card */}
            <div className="rounded-control border border-line bg-surface p-4 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-snug text-ink">
                    {M.join.available}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">
                    {M.form.availableHint}
                  </span>
                </div>
                <Switch
                  checked={values.available}
                  onChange={(event) => {
                    if (existing) {
                      void handleAvailabilityToggle(event.target.checked);
                    } else {
                      update("available", event.target.checked);
                    }
                  }}
                  aria-label={M.join.available}
                  disabled={submitting || toggling}
                />
              </div>
            </div>

            {/* Last donated date (collapsible) */}
            {showDate ? (
              <div className="rounded-control border border-line bg-surface p-4 space-y-3">
                <Field
                  label={M.join.lastDonated}
                  hint={M.join.lastDonatedHint}
                  error={errors.lastDonated}
                  id="lastDonated"
                >
                  {(control) => (
                    <input
                      {...control}
                      className={inputClass}
                      type="date"
                      max={todayIso()}
                      value={values.lastDonated}
                      onChange={(event) => update("lastDonated", event.target.value)}
                    />
                  )}
                </Field>
                <div className="text-right">
                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center text-sm font-semibold text-blood-700 transition hover:underline"
                    onClick={() => {
                      update("lastDonated", "");
                      setShowDate(false);
                    }}
                  >
                    ✕ {M.join.removeDate}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDate(true)}
                className="flex min-h-12 w-full items-center justify-between rounded-control border border-dashed border-line bg-surface/60 px-4 py-3 text-left transition hover:border-blood-600/40 hover:bg-surface active:translate-y-px"
              >
                <div>
                  <span className="block text-sm font-semibold text-ink">
                    {M.join.lastDonatedToggle}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    {M.form.dateOptional}
                  </span>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blood-50 text-sm font-bold text-blood-700">
                  +
                </span>
              </button>
            )}

            {/* Consent & privacy notes */}
            {existing ? (
              <div className="rounded-control border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink-2">
                <p className="font-medium text-ink">{M.join.consentAlready}</p>
                <p className="mt-1 text-xs text-ink-3">{M.join.onePerBrowser}</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="rounded-control border border-blood-100 bg-blood-50 p-4 text-sm leading-relaxed text-blood-900">
                  <div className="flex items-start gap-2.5">
                    <DropIcon className="mt-0.5 h-4 w-4 shrink-0 text-blood-600" />
                    <p>{M.join.consentExplainer}</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 select-none">
                    <input
                      id="consent"
                      type="checkbox"
                      checked={values.consent}
                      onChange={(event) => update("consent", event.target.checked)}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? "consent-error" : undefined}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded accent-blood-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium leading-relaxed text-ink">
                      {M.join.consent}
                    </span>
                  </label>
                  {errors.consent ? (
                    <p id="consent-error" className="mt-1.5 text-sm leading-relaxed text-err">
                      {errors.consent}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {duplicateNotice ? (
              <div role="alert" className="rounded-card border border-warn/30 bg-warn-bg p-4">
                <p className="text-sm font-semibold leading-relaxed text-warn">
                  {M.join.duplicateNotice}
                </p>
                <div className="mt-3 grid gap-2">
                  <Button
                    variant="secondary"
                    loading={submitting}
                    onClick={() => {
                      void confirmDuplicate();
                    }}
                  >
                    {M.join.duplicateYes}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => {
                      pendingInputRef.current = null;
                      setDuplicateNotice(false);
                    }}
                  >
                    {M.join.duplicateNo}
                  </Button>
                </div>
              </div>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="rounded-control border border-err/30 bg-blood-50 px-4 py-3 text-sm font-semibold leading-relaxed text-err"
              >
                {formError}
              </div>
            ) : null}

            {/* Sticky Save CTA Bar */}
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-md">
              <div className="mx-auto w-full max-w-md md:max-w-2xl">
                <Button type="submit" loading={submitting} loadingText={M.actions.saving}>
                  {M.actions.save}
                </Button>
              </div>
            </div>
          </form>

          {existing ? (
            <div className="mt-8 border-t border-line pt-6">
              <Button
                variant="danger"
                onClick={() => setDeleteOpen(true)}
                disabled={submitting || toggling}
              >
                {M.actions.delete}
              </Button>
            </div>
          ) : null}

          <div className="mt-8 text-center text-sm leading-relaxed text-ink-3">
            {M.join.oldInfoContact}{" "}
            <ContactTrigger className="font-semibold text-blood-700 underline underline-offset-2" />
          </div>

          <p className="mt-1 text-center">
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center text-sm font-semibold text-blood-700 underline underline-offset-2"
            >
              {M.nav.about}
            </Link>
          </p>

          <ConfirmDialog
            open={deleteOpen}
            title={M.join.deleteTitle}
            description={M.join.deleteBody}
            confirmLabel={M.actions.delete}
            cancelLabel={M.actions.cancel}
            loading={deleting}
            onConfirm={() => {
              void handleDelete();
            }}
            onCancel={() => {
              if (!deleting) setDeleteOpen(false);
            }}
          />
        </>
      )}

      <ShareSheet
        open={fallbackText !== null}
        text={fallbackText ?? ""}
        onClose={() => setFallbackText(null)}
      />
    </>
  );
}
