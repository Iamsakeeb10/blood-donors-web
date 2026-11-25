"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { BloodGroupPicker } from "@/components/BloodGroupPicker";
import { BloodGroupText } from "@/components/BloodGroupText";
import { ArrowLeftIcon, CheckIcon, CopyIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { inputClass } from "@/components/ui/styles";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { DISTRICTS, statusOf, type Donor } from "@/lib/data";
import {
  DonorError,
  adminDeleteDonor,
  adminSaveDonor,
  isAdminUser,
  listAllDonors,
  type AdminDonor,
} from "@/lib/donors";
import {
  FirebaseNotConfiguredError,
  getCurrentUser,
  signInAdmin,
  signOutCurrentUser,
} from "@/lib/firebase";
import { formatDateBn, formatTimestampBn, todayIso, toBn } from "@/lib/format";
import { M } from "@/lib/messages";
import {
  isValidBDPhone,
  normalizePhone,
  validateDonorForm,
  type DonorFormErrors,
  type DonorFormValues,
} from "@/lib/validation";

const PAGE = 50;

const emptyValues: DonorFormValues = {
  name: "",
  bloodGroup: "",
  phone: "",
  district: "",
  area: "",
  available: true,
  lastDonated: "",
  consent: true,
};

const fieldOrder = [
  "name",
  "bloodGroup",
  "phone",
  "district",
  "area",
  "lastDonated",
] as const;

type AuthStatus = "checking" | "signedOut" | "notAdmin" | "ready" | "error";

type ChangeHandler = <K extends keyof DonorFormValues>(
  field: K,
  value: DonorFormValues[K],
) => void;

function sortAdminDonors(items: AdminDonor[]): AdminDonor[] {
  return [...items].sort(
    (a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name, "bn"),
  );
}

function donorToForm(donor: AdminDonor): DonorFormValues {
  return {
    name: donor.name,
    bloodGroup: donor.bloodGroup,
    phone: donor.phone,
    district: donor.district,
    area: donor.area ?? "",
    available: donor.available,
    lastDonated: donor.lastDonated ?? "",
    consent: true,
  };
}

function AdminStatusPill({
  donor,
}: {
  donor: Pick<Donor, "available" | "lastDonated">;
}) {
  const status = statusOf(donor);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-semibold",
        status === "available"
          ? "bg-ok-bg text-ok"
          : status === "cooling"
            ? "bg-warn-bg text-warn"
            : "bg-off-bg text-off",
      )}
    >
      {M.status[status]}
    </span>
  );
}

export function AdminView() {
  const { show } = useToast();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [configError, setConfigError] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [donors, setDonors] = useState<AdminDonor[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDonor | null>(null);
  const [values, setValues] = useState<DonorFormValues>(emptyValues);
  const [errors, setErrors] = useState<DonorFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminDonor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const checkAuth = useCallback(() => {
    getCurrentUser()
      .then((user) => {
        if (!user || user.isAnonymous) {
          setUid(null);
          setEmail(null);
          setStatus("signedOut");
          return;
        }
        setUid(user.uid);
        setEmail(user.email);
        return isAdminUser(user.uid).then((admin) => {
          setStatus(admin ? "ready" : "notAdmin");
        });
      })
      .catch((error: unknown) => {
        const isConfigError = error instanceof FirebaseNotConfiguredError;
        setConfigError(isConfigError);
        setAuthError(
          isConfigError ? M.admin.configErrorBody : M.admin.checkError,
        );
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;

    listAllDonors()
      .then((items) => {
        if (cancelled) return;
        setDonors(sortAdminDonors(items));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof DonorError && error.code === "unavailable"
            ? error.message
            : M.admin.loadError,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  useEffect(() => {
    if (!formOpen) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formOpen, editing]);

  const filtered = useMemo(() => {
    if (!donors) return null;
    const query = filter.trim().toLowerCase();
    if (!query) return donors;
    return donors.filter((donor) =>
      [donor.name, donor.phone, donor.district, donor.area ?? "", donor.bloodGroup].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [donors, filter]);

  const shown = filtered ? filtered.slice(0, visible) : null;
  const total = donors?.length ?? 0;
  const available =
    donors?.filter((donor) => statusOf(donor) === "available").length ?? 0;

  function retryAuthCheck() {
    setStatus("checking");
    setAuthError(null);
    setConfigError(false);
    checkAuth();
  }

  function retryLoad() {
    setDonors(null);
    setLoadError(null);
    setReloadKey((current) => current + 1);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signingIn) return;
    setAuthError(null);
    setConfigError(false);

    const address = emailInput.trim();
    if (!address || !passwordInput) {
      setAuthError(M.admin.signInError);
      return;
    }

    setSigningIn(true);
    try {
      const user = await signInAdmin(address, passwordInput);
      setUid(user.uid);
      setEmail(user.email);
      setPasswordInput("");
      try {
        const admin = await isAdminUser(user.uid);
        setStatus(admin ? "ready" : "notAdmin");
      } catch {
        setAuthError(M.admin.checkError);
        setStatus("error");
      }
    } catch (error) {
      const isConfigError = error instanceof FirebaseNotConfiguredError;
      setConfigError(isConfigError);
      setAuthError(isConfigError ? M.admin.configErrorBody : M.admin.signInError);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutCurrentUser();
    } catch {
      // The UI still returns to the signed-out state.
    }
    setStatus("signedOut");
    setUid(null);
    setEmail(null);
    setDonors(null);
    setLoadError(null);
    setFilter("");
    setFormOpen(false);
    setEditing(null);
    setDeleteTarget(null);
  }

  async function copyUid() {
    if (!uid) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(uid);
      show(M.toast.copied);
    } catch {
      show(M.toast.copyFailed, "error");
    }
  }

  function update<K extends keyof DonorFormValues>(
    field: K,
    value: DonorFormValues[K],
  ) {
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
    const element = document.getElementById(`admin-${first}`);
    if (!element) return;
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.focus({ preventScroll: true });
  }

  function openAdd() {
    if (saving) return;
    setEditing(null);
    setValues(emptyValues);
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(donor: AdminDonor) {
    if (saving) return;
    setEditing(donor);
    setValues(donorToForm(donor));
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setErrors({});
    setFormError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const result = validateDonorForm(values, { requireConsent: false });
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }

    setErrors({});
    setFormError(null);
    setSaving(true);
    const current = editing;
    try {
      const saved = await adminSaveDonor(result.values, current);
      setDonors((items) => {
        if (!items) return [saved];
        if (current) {
          return sortAdminDonors(
            items.map((donor) => (donor.docId === saved.docId ? saved : donor)),
          );
        }
        return sortAdminDonors([saved, ...items]);
      });
      if (!current) {
        setFilter("");
        setVisible(PAGE);
      }
      show(current ? M.toast.updated : M.admin.saved);
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof DonorError ? error.message : M.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const target = deleteTarget;
    if (!target || deleting) return;

    setDeleting(true);
    try {
      await adminDeleteDonor(target.docId);
      setDonors((items) =>
        items ? items.filter((donor) => donor.docId !== target.docId) : items,
      );
      if (editing?.docId === target.docId) {
        setFormOpen(false);
        setEditing(null);
      }
      setDeleteTarget(null);
      show(M.admin.deleted);
    } catch (error) {
      setDeleteTarget(null);
      show(error instanceof DonorError ? error.message : M.errors.deleteFailed, "error");
    } finally {
      setDeleting(false);
    }
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

        {status === "ready" || status === "notAdmin" ? (
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            className="inline-flex min-h-12 items-center rounded-control px-2 text-sm font-semibold text-ink-2 transition hover:bg-off-bg active:translate-y-px"
          >
            {M.admin.signOut}
          </button>
        ) : null}
      </div>

      <h1 className="text-[28px] font-bold leading-snug text-ink">{M.admin.title}</h1>
      <p className="mt-1 text-base leading-relaxed text-ink-2">{M.admin.subtitle}</p>
      <p className="mt-1 text-xs text-ink-3">{M.admin.hidden}</p>

      {status === "checking" ? (
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : status === "error" ? (
        <div
          role="alert"
          className="mt-6 rounded-card border border-err/30 bg-blood-50 p-4"
        >
          <p className="text-base font-semibold leading-snug text-blood-900">
            {configError ? M.admin.configErrorTitle : M.admin.checkErrorTitle}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            {authError ?? M.admin.signInError}
          </p>
          <div className="mt-3 grid gap-2">
            <Button variant="secondary" onClick={retryAuthCheck}>
              {M.admin.retry}
            </Button>
            {uid ? (
              <Button
                variant="ghost"
                onClick={() => {
                  void handleSignOut();
                }}
              >
                {M.admin.signOut}
              </Button>
            ) : null}
          </div>
        </div>
      ) : status === "signedOut" ? (
        <form
          noValidate
          onSubmit={handleSignIn}
          className="mt-6 space-y-4 rounded-card border border-line bg-surface p-4"
        >
          <div>
            <h2 className="text-lg font-semibold leading-snug text-ink">
              {M.admin.signInTitle}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {M.admin.signInBody}
            </p>
          </div>

          <Field label={M.admin.email} id="admin-email">
            {(control) => (
              <input
                {...control}
                className={inputClass}
                type="email"
                autoComplete="username"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
              />
            )}
          </Field>

          <Field label={M.admin.password} id="admin-password">
            {(control) => (
              <input
                {...control}
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
              />
            )}
          </Field>

          {authError ? (
            <p role="alert" className="text-sm font-semibold leading-relaxed text-err">
              {authError}
            </p>
          ) : null}

          <Button type="submit" loading={signingIn} loadingText={M.admin.signingIn}>
            {M.admin.signIn}
          </Button>
        </form>
      ) : status === "notAdmin" ? (
        <div className="mt-6 space-y-4 rounded-card border border-warn/30 bg-warn-bg p-4">
          <div>
            <p className="text-base font-semibold leading-snug text-warn">
              {M.admin.notAdminTitle}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {M.admin.notAdminBody}
            </p>
          </div>

          {uid ? (
            <div className="rounded-control border border-line bg-surface p-3">
              <p className="text-xs font-semibold text-ink-3">{M.admin.yourUid}</p>
              <p className="mt-1 select-all break-all font-mono text-sm leading-relaxed text-ink">
                {uid}
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  void copyUid();
                }}
              >
                <CopyIcon className="h-4 w-4" />
                {M.admin.copyUid}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Button variant="secondary" onClick={retryAuthCheck}>
              {M.admin.recheck}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void handleSignOut();
              }}
            >
              {M.admin.signOut}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {email ? (
            <p className="mt-3 truncate text-sm leading-relaxed text-ink-3">
              {M.admin.signedInAs(email)}
            </p>
          ) : null}

          {donors ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-sm leading-relaxed text-ink-3">{M.admin.total}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {toBn(total)}
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-sm leading-relaxed text-ink-3">{M.admin.available}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ok">
                  {toBn(available)}
                </p>
              </div>
            </div>
          ) : !loadError ? (
            <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden="true">
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
            </div>
          ) : null}

          <div className="mt-4">
            <Button onClick={openAdd} disabled={saving}>
              {M.admin.add}
            </Button>
          </div>

          {formOpen ? (
            <div ref={formRef} className="scroll-mt-20">
              <AdminDonorForm
                editing={editing}
                saving={saving}
                values={values}
                errors={errors}
                formError={formError}
                onChange={update}
                onSubmit={handleSave}
                onCancel={closeForm}
              />
            </div>
          ) : null}

          {donors ? (
            <div className="relative mt-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-3">
                <SearchIcon className="h-4 w-4" />
              </div>
              <input
                type="search"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setVisible(PAGE);
                }}
                placeholder={M.admin.searchPlaceholder}
                aria-label={M.admin.searchPlaceholder}
                className={`h-11 w-full rounded-control border border-line bg-surface pl-10 ${filter ? "pr-20" : "pr-3"} text-base text-ink placeholder:text-ellipsis placeholder:text-ink-3 outline-none transition focus:border-blood-600 focus:ring-1 focus:ring-blood-600`}
              />
              {filter ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("");
                    setVisible(PAGE);
                  }}
                  className="absolute right-0 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded px-3 text-sm font-semibold text-blood-700 hover:bg-blood-50 active:translate-y-px"
                >
                  {M.actions.clear}
                </button>
              ) : null}
            </div>
          ) : null}

          {loadError ? (
            <div className="mt-4 rounded-card border border-line bg-surface p-4">
              <p role="alert" className="text-sm leading-relaxed text-ink-2">
                {loadError}
              </p>
              <Button variant="secondary" className="mt-3" onClick={retryLoad}>
                {M.admin.retry}
              </Button>
            </div>
          ) : !donors ? (
            <ul className="mt-4 grid gap-2 md:grid-cols-2" aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <li key={item}>
                  <Skeleton className="h-40 w-full rounded-card" />
                </li>
              ))}
            </ul>
          ) : filtered && filtered.length === 0 ? (
            <div className="mt-4 rounded-card border border-line bg-surface p-5 text-center">
              <p className="text-base font-semibold leading-relaxed text-ink">
                {donors.length === 0 ? M.admin.empty : M.admin.noResults}
              </p>
            </div>
          ) : shown ? (
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {shown.map((donor) => (
                <li
                  key={donor.docId}
                  className="rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-base font-semibold leading-relaxed text-ink">
                        {donor.name}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
                        {[donor.district, donor.area]
                          .filter((part): part is string => Boolean(part))
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-blood-50 text-sm font-bold text-blood-700">
                      <BloodGroupText group={donor.bloodGroup} />
                    </span>
                  </div>

                  <p className="mt-2 select-all text-lg font-bold tabular-nums text-ink">
                    {donor.phone}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-ink-3">
                    <AdminStatusPill donor={donor} />
                    {donor.lastDonated ? (
                      <span>{formatDateBn(donor.lastDonated)}</span>
                    ) : null}
                    <span>{M.admin.updated(formatTimestampBn(donor.updatedAt))}</span>
                  </div>

                  <div className="mt-3 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(donor)}
                      disabled={saving}
                      className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-blood-700 hover:bg-blood-50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
                    >
                      {M.admin.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(donor)}
                      disabled={saving}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-err hover:bg-blood-50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {M.admin.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {shown && filtered && filtered.length > shown.length ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => setVisible((current) => current + PAGE)}
              >
                {M.admin.showMore}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={M.admin.deleteTitle}
        description={deleteTarget ? M.admin.deleteBody(deleteTarget.name) : ""}
        confirmLabel={M.admin.delete}
        cancelLabel={M.admin.cancel}
        loading={deleting}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </>
  );
}

type AdminDonorFormProps = {
  editing: AdminDonor | null;
  saving: boolean;
  values: DonorFormValues;
  errors: DonorFormErrors;
  formError: string | null;
  onChange: ChangeHandler;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function AdminDonorForm({
  editing,
  saving,
  values,
  errors,
  formError,
  onChange,
  onSubmit,
  onCancel,
}: AdminDonorFormProps) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="mt-4 space-y-5 rounded-card border border-blood-100 bg-surface p-4"
    >
      <h2 className="text-lg font-semibold leading-snug text-ink">
        {editing ? M.admin.formEditTitle : M.admin.formAddTitle}
      </h2>

      <Field label={M.join.name} hint={M.join.nameHint} error={errors.name} id="admin-name">
        {(control) => (
          <input
            {...control}
            className={inputClass}
            autoComplete="off"
            placeholder={M.form.namePlaceholder}
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        )}
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="block text-sm font-semibold text-ink-2">
            {M.join.bloodGroup}
          </span>
          <span className="text-xs text-ink-3">{M.form.pickOne}</span>
        </div>
        <BloodGroupPicker
          id="admin-bloodGroup"
          value={values.bloodGroup}
          onChange={(group) => onChange("bloodGroup", group)}
          invalid={Boolean(errors.bloodGroup)}
          disabled={saving}
        />
        {errors.bloodGroup ? (
          <p className="text-sm leading-relaxed text-err">{errors.bloodGroup}</p>
        ) : null}
      </div>

      <Field label={M.join.phone} hint={M.join.phoneHint} error={errors.phone} id="admin-phone">
        {(control) => (
          <div>
            <input
              {...control}
              className={inputClass}
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              placeholder="01XXXXXXXXX"
              value={values.phone}
              onChange={(event) => onChange("phone", normalizePhone(event.target.value))}
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label={M.join.district} error={errors.district} id="admin-district">
          {(control) => (
            <Select
              {...control}
              value={values.district}
              onChange={(event) => onChange("district", event.target.value)}
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

        <Field label={M.join.area} hint={M.join.areaHint} error={errors.area} id="admin-area">
          {(control) => (
            <input
              {...control}
              className={inputClass}
              placeholder={M.form.areaPlaceholder}
              value={values.area}
              onChange={(event) => onChange("area", event.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="rounded-control border border-line bg-surface p-4">
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
            onChange={(event) => onChange("available", event.target.checked)}
            aria-label={M.join.available}
            disabled={saving}
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          {M.admin.statusLabel}:{" "}
          <span className="font-semibold text-ink-2">
            {
              M.status[
                statusOf({
                  available: values.available,
                  lastDonated: values.lastDonated || null,
                })
              ]
            }
          </span>
        </p>
      </div>

      <Field
        label={M.join.lastDonated}
        hint={M.join.lastDonatedHint}
        error={errors.lastDonated}
        id="admin-lastDonated"
      >
        {(control) => (
          <div className="relative">
            <input
              {...control}
              className={`${inputClass} date-input`}
              type="date"
              max={todayIso()}
              value={values.lastDonated}
              onChange={(event) => onChange("lastDonated", event.target.value)}
            />
            {!values.lastDonated ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-4 right-12 flex items-center truncate text-base text-ink-3"
              >
                {M.form.datePlaceholder}
              </span>
            ) : null}
          </div>
        )}
      </Field>

      {formError ? (
        <div
          role="alert"
          className="rounded-control border border-err/30 bg-blood-50 px-4 py-3 text-sm font-semibold leading-relaxed text-err"
        >
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          {M.admin.cancel}
        </Button>
        <Button type="submit" loading={saving} loadingText={M.admin.saving}>
          {M.admin.save}
        </Button>
      </div>
    </form>
  );
}
