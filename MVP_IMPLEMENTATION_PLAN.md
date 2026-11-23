# রক্তদাতা তালিকা — MVP Implementation Plan

Companion to [FEATURE_AND_DEV_GUIDE.md](./FEATURE_AND_DEV_GUIDE.md). The guide says **what** and **why**; this file says **in what order, how exactly, what can go wrong, and when a step is done**.

Work top to bottom. Every milestone ends with an **Exit checklist** — don't start the next one until it's all ticked. Each milestone is small enough to be one commit/PR.

---

## 0. Ground truth about THIS repo (read first)

Verified in the repo, and they differ from the guide's snippets:

| Fact | Consequence |
|---|---|
| `next@16.4.6`, `react@19.3`, **`cacheComponents: true`** and `partialPrefetching: true` in `next.config.ts` | `AGENTS.md` says this Next.js differs from training data. Before each new file type (manifest, metadata, viewport, route handler) skim the matching doc in `node_modules/next/dist/docs/01-app/`. Anything reading `searchParams`/cookies/`Date.now()` in a **Server** Component must sit inside `<Suspense>`. Our data pages are Client Components, so keep dynamic things there. |
| Tailwind **v4** via `@tailwindcss/turbopack` (CSS-first, `@import "tailwindcss"` + `@theme`) | **No `tailwind.config.js`.** Design tokens go in `@theme {}` inside `app/globals.css`. The guide's `ui.ts` class-string approach still works but we use real components instead (see §2). |
| `app/` only, no `lib/`, no `src/` | Create `lib/` at repo root (alias `@/*`). Verify `tsconfig.json` has `"@/*": ["./*"]`. |
| `firebase@13` already installed | No install needed. Check `firebase/app-check` import still exists in v13 docs before M1. |
| Layout is still create-next-app default (Geist, `lang="en"`, dark-mode CSS) | Replaced in M2. **Remove the dark-mode media query** — we ship one deliberately designed light theme (a donor list read under hospital lighting must be high contrast; a half-done dark theme is worse than none). |
| No `.env.local`, no Firebase project yet | M1 is all manual console work. |

> [!IMPORTANT]
> The guide's code in §7.8/§7.9 is a **sketch**. It has real bugs (listed in §Appendix A). Use it for structure, not copy-paste.

---

## 1. Design direction (so it doesn't look like AI slop)

The typical "AI" look to avoid: purple/red gradients, glassmorphism cards everywhere, emoji as the entire icon system, centred hero with big blob, identical rounded-2xl cards with soft shadows, "Welcome to…" copy. This is a **utility for people in an emergency, in Bangla, on cheap phones**. Design for calm, speed and trust.

### 1.1 Principles
1. **Calm urgency, not panic.** Red is an *accent* reserved for blood-group identity and the one primary action. Everything else is neutral warm paper tones.
2. **The blood group is the hero.** It's the biggest, most recognisable element on every card. A donor card reads like a *ward-label/ID tag*, not a social post.
3. **Typography does the work.** Large, confident Bangla headings; tight hierarchy (3 sizes, 2 weights). No decorative fonts.
4. **Honest, flat, tactile.** Solid fills, 1px borders, a single subtle shadow level on elevated things only. Pressed states feel physical (`active:translate-y-px`, darker fill). No blur, no gradients.
5. **Real icons, not emoji.** Small inline SVG set (drop, phone, chat, share, check, chevron, warning, trash) in one `components/icons.tsx`. Emoji render differently on every Android version and look amateur; SVG is ~200 bytes each and keeps "no icon library".
6. **Copy is human Bangla**, short imperative verbs, no marketing. Errors say what to do next.
7. **Every state designed**: loading, empty, error, offline, success, disabled. State screens are part of the design, not afterthoughts.

### 1.2 Tokens (put in `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Paper & ink — warm neutrals, not pure white/grey */
  --color-paper:   #FBF8F5;   /* page background */
  --color-surface: #FFFFFF;   /* cards, inputs */
  --color-line:    #E7DFD8;   /* borders */
  --color-ink:     #1F1A17;   /* primary text  (contrast ≥ 15:1 on paper) */
  --color-ink-2:   #5C524C;   /* secondary text (≥ 7:1) */
  --color-ink-3:   #7A6F68;   /* tertiary, 14px+ only (≥ 4.6:1) */

  /* Blood — the only brand colour */
  --color-blood-50:  #FDF1F0;
  --color-blood-100: #FADDDA;
  --color-blood-600: #C4271F; /* primary buttons, selected chips (white text ≥ 5.9:1) */
  --color-blood-700: #A11E18; /* pressed, links */
  --color-blood-900: #5E120F;

  /* Semantic */
  --color-ok-bg: #E8F4EC;  --color-ok:   #1E6B3A;   /* "available" */
  --color-warn-bg:#FFF3DC; --color-warn: #8A5300;   /* "recently donated" */
  --color-off-bg:#EFEAE6;  --color-off:  #5C524C;   /* "unavailable" */
  --color-err:   #B3261E;

  --font-sans: var(--font-bengali), system-ui, sans-serif;

  --radius-control: 0.75rem;   /* 12px: inputs, buttons, chips */
  --radius-card:    1rem;      /* 16px */
}
```

*Contrast numbers are targets — verify each pair with Chrome DevTools' contrast checker in M2 and adjust the hex if below WCAG AA (4.5:1 body, 3:1 large).*

### 1.3 Type scale (Noto Sans Bengali 400/600/700 only)
| Role | Size / weight | Use |
|---|---|---|
| Display | 28px / 700, `leading-snug` | Page H1 |
| Title | 18px / 600 | Card name, section title |
| Body | 16px / 400, `leading-relaxed` | Everything default |
| Meta | 14px / 400–600 | Area, badges, helper text |
| Chip number | 22px / 700 | Blood group labels |

Bangla needs extra line height: never go below `leading-relaxed` (1.625) for body, `leading-snug` for headings, and **never** use `truncate` on Bangla names without `title`/wrapping (matras get clipped — use `line-clamp-2` with `leading-relaxed` + small `py`).

### 1.4 Component language
- **Blood chip**: 56px tall, 1px border, selected = solid `blood-600` + white text + a check mark (not colour alone). Letters use `A+`; render `+`/`−` with a slightly smaller superscript-style sign so `AB+` and `A+` are instantly distinct.
- **Donor card**: left = a 48×48 *blood-type tile* (blood-50 fill, blood-700 bold text); right = name (Title), `জেলা · এলাকা` (Meta), status pill. Expanded state slides open a call row. Cards are separated by borders, not shadows.
- **Status pills** (text + dot, never colour-only): `● এখন দিতে পারবেন` (ok), `● সম্প্রতি রক্ত দিয়েছেন` (warn), `● এখন দিতে পারবেন না` (off).
- **Primary button**: solid blood-600, 56px, bold, full width. **Secondary**: 1px border, transparent. **Destructive**: text-style `err` color, confirmation via dialog.
- **Page chrome**: a slim top bar (wordmark "রক্তদাতা" with a small drop SVG + page title/back). No hamburger.
- **Motion**: 150ms only on press, expand/collapse and toast; respect `prefers-reduced-motion`.
- **Focus**: visible 3px `blood-600/40` ring on every interactive element (keyboard + switch users).

### 1.5 Layout skeletons (360px)

```
HOME                                    JOIN
┌──────────────────────────┐           ┌──────────────────────────┐
│ ◖drop রক্তদাতা            │           │ ←  যুক্ত হোন              │
│                          │           │                          │
│ কার রক্ত দরকার?  (H1)     │           │ নাম          [_______]   │
│ [A+][A−][B+][B−]         │           │ গ্রুপ  [A+][A−][B+][B−]   │
│ [AB+][AB−][O+][O−]       │           │        [AB+][AB−][O+][O−]│
│ জেলা [সব জেলা ▾]          │           │ মোবাইল      [01_______]  │
│ ────────────────────     │           │ জেলা        [বাছাই ▾]    │
│ ৫ জন দাতা        [শেয়ার] │           │ এলাকা (ঐচ্ছিক) [_____]   │
│ ┌──────────────────────┐ │           │ ☐ সর্বশেষ রক্ত দিয়েছেন    │
│ │[O+] রাহিম             │ │           │ [ available switch ]     │
│ │     রংপুর · সদর       │ │           │ ☐ সম্মতি (public warning)│
│ │     ● দিতে পারবেন     │ │           │ ───────────────────────  │
│ └──────────────────────┘ │           │ [   সংরক্ষণ করুন        ] │ ← sticky
├──────────────────────────┤           └──────────────────────────┘
│ [ রক্তদাতা হিসেবে যুক্ত হোন ] │ ← sticky
└──────────────────────────┘
```

---

## 2. Target architecture

```
app/
  layout.tsx            Server. font, viewport, metadata, <AppShell>
  globals.css           tokens (§1.2)
  page.tsx              Server shell → <Suspense><SearchView/></Suspense>
  join/page.tsx         Server shell → <JoinView/>
  manifest.ts           PWA manifest (typed)
  icon.png / apple-icon.png   (Next file convention icons)
  not-found.tsx         Bangla 404
  error.tsx             Bangla error boundary (client)
components/
  icons.tsx             inline SVG set
  ui/ Button.tsx Field.tsx Select.tsx Chip.tsx Switch.tsx Toast.tsx ConfirmDialog.tsx Skeleton.tsx StatusPill.tsx
  BloodGroupPicker.tsx  (used by search and join)
  DonorCard.tsx  DonorList.tsx
  SearchView.tsx  JoinView.tsx
  OfflineBanner.tsx
lib/
  firebase.ts           app, db, auth, ensureUser, App Check (guarded)
  donors.ts             queryDonors, getMyDonor, saveMyDonor, deleteMyDonor, findByPhone
  data.ts               BLOOD_GROUPS, DISTRICTS(64), COOLDOWN_DAYS, types
  validation.ts         normalizePhone, validateDonorForm, date rules
  format.ts             Bangla digits, relative time
  share.ts              shareRequest(), copy fallback
  messages.ts           ALL Bangla strings (single file → easy copy edits)
firestore.rules         source of truth, deployed via console/CLI
```

Rules:
- **Data access only in `lib/donors.ts`.** Components never import `firebase/firestore`.
- **All Bangla strings in `lib/messages.ts`.** No string literals scattered in JSX (except trivial punctuation).
- Pure logic (`validation`, `format`, `isCoolingDown`, `rank`) is framework-free and unit-testable.
- `firebase/auth` and `app-check` must be imported only from client modules; guard `typeof window`.
- Add a minimal test setup in M3 (Vitest) for pure functions only. No component-test infrastructure for MVP.

---

## 3. Milestones

Legend: 🧱 build · ⚠️ edge cases to handle · ✅ exit checklist

---

### M0 — Repo hygiene & foundations (≈30 min)

🧱
1. Delete `public/*.svg` boilerplate and the default `app/page.tsx` content.
2. Create folder skeleton from §2.
3. `tsconfig.json`: confirm `@/*` maps to repo root (so `@/lib/...`, `@/components/...` resolve).
4. Add `.env.example` with the 5 keys (guide §7.3) and make sure `.env*.local` is in `.gitignore`.
5. Run `npm run dev` and `npm run build` once to prove the toolchain (Turbopack + Tailwind loader) works before writing anything.
6. Replace `README.md` boilerplate with a 10-line "how to run + where the plan is".

✅ `npm run build` & `npm run lint` pass on empty shell; `.env.local` not tracked.

---

### M1 — Firebase project & security rules first (≈45 min, manual)

Do rules **before** UI so nothing ever runs against open data.

🧱
1. Firebase Console: project → Web app → copy config into `.env.local`.
2. Firestore (production mode, nearest region — `asia-south1`/`asia-southeast1`).
3. Authentication → Anonymous → **Enable**.
4. App Check: register web app with reCAPTCHA v3, get site key. **Leave enforcement OFF** until M11.
5. Write `firestore.rules` in repo (so it's versioned) and paste into console. Improve the guide's rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function validDonor(d) {
      return d.keys().hasOnly(['uid','name','bloodGroup','phone','district','area',
                               'available','lastDonated','createdAt','updatedAt'])
        && d.keys().hasAll(['uid','name','bloodGroup','phone','district','available','createdAt','updatedAt'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 40
        && d.bloodGroup in ['A+','A-','B+','B-','AB+','AB-','O+','O-']
        && d.phone is string && d.phone.matches('^01[3-9][0-9]{8}$')
        && d.district is string && d.district.size() > 0 && d.district.size() <= 40
        && (!('area' in d) || (d.area is string && d.area.size() <= 60))
        && d.available is bool
        && (!('lastDonated' in d) || d.lastDonated == null
            || (d.lastDonated is string && d.lastDonated.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')))
        && d.createdAt is number && d.updatedAt is number;
    }

    match /donors/{id} {
      allow get, list: if true;          // list needs a limit — enforced client-side; see note
      allow create: if request.auth != null && request.auth.uid == id
                    && request.resource.data.uid == id
                    && validDonor(request.resource.data);
      allow update: if request.auth != null && request.auth.uid == id
                    && request.resource.data.uid == id
                    && request.resource.data.createdAt == resource.data.createdAt  // immutable
                    && validDonor(request.resource.data);
      allow delete: if request.auth != null && request.auth.uid == id;
    }
  }
}
```
Also add `allow list: if request.query.limit <= 200;` instead of `if true` (split `get` / `list`) so a client can't dump the whole collection in one call.

⚠️
- **Rules must match client validation exactly** (same regex, same max lengths) — otherwise users see a generic "save failed" for an input the UI accepted.
- Rules playground: test (a) unauthenticated create → denied, (b) uid mismatch → denied, (c) extra field → denied, (d) bad phone → denied, (e) update changing `createdAt` → denied, (f) delete other's doc → denied.
- Honest limitation to document in README: because reads are public, **phone numbers are technically downloadable** by anyone who calls the API. "Tap to reveal" is a UX nicety, not security. App Check raises the bar against bots only. This is why the consent checkbox is mandatory (M5).

✅ Six rule-playground cases behave as listed; `.env.local` filled; anonymous auth enabled.

---

### M2 — Design system, layout shell, fonts, PWA metadata (≈2 h)

🧱
1. `app/globals.css`: tokens (§1.2); body = `bg-paper text-ink`; remove dark-mode media query and Arial.
2. `app/layout.tsx`:
   - `Noto_Sans_Bengali` via `next/font/google`, `subsets:["bengali","latin"]`, weights 400/600/700, `display:"swap"`, `variable:"--font-bengali"`.
   - `<html lang="bn">`, `viewport` export (`width=device-width, initialScale=1, viewportFit:"cover", themeColor`). **No `maximumScale`.**
   - `metadata`: title template `%s · রক্তদাতা তালিকা`, Bangla description, `openGraph` (title/description, so the shared link previews well in Messenger), `robots` (index allowed).
3. App shell component: slim top bar + `<main className="mx-auto w-full max-w-md px-4 pb-40 md:max-w-2xl">`. `pb-40` reserves room for the sticky bar plus safe-area.
4. Build the UI primitives: `Button` (variants primary/secondary/ghost/danger, `loading` prop), `Field` (label above, helper, error text linked with `aria-describedby`, `aria-invalid`), `Select` (native `<select>` with custom chevron via wrapper), `Chip`, `Switch` (real `<input type=checkbox role=switch>` styled), `StatusPill`, `Skeleton`, `Toast` (single live region `role="status"`), `ConfirmDialog` (native `<dialog>` with `showModal()` — free focus trap + Esc).
5. `components/icons.tsx` with 8 SVGs, `aria-hidden`, `currentColor`.
6. Global focus ring + `@media (prefers-reduced-motion: reduce)` kill transitions.
7. `app/manifest.ts` + icons (see M10 — scaffold file now, finish icons then).
8. Temporary `/` dev gallery rendering every primitive in every state (delete in M12).

⚠️
- Inputs **16px** minimum (iOS zoom). Do not set `maximum-scale`.
- `env(safe-area-inset-bottom)` padding on sticky bars; verify on an iPhone (notch + home bar).
- Use `min-h-dvh`, not `min-h-screen`.
- Font fallback: Bangla must not render in a Latin fallback on first paint → `display: swap` + `system-ui` fallback accepted; verify no layout jump >CLS 0.1.
- Bangla digits: our UI shows `১২৩` via `toLocaleString("bn-BD")`, but **inputs stay Latin digits** (see M4).

✅ Gallery looks right at 320/360/412; all text/background pairs pass AA; Tab key shows focus on everything; Lighthouse a11y ≥ 95 on gallery.

---

### M3 — Domain layer: data, validation, Firestore access (≈2 h)

🧱
1. `lib/data.ts`: `BLOOD_GROUPS`, **all 64 districts** (Bangla, alphabetical by Bangla collation, using the standard official list — spell-check twice; a misspelt district silently splits donors), `COOLDOWN_DAYS = 120`, `Donor` type.
   - Store district as a **stable value**. Decision: store the Bangla name directly (matches guide + rules + URL). Never rename entries later without a migration — note in the file header.
2. `lib/validation.ts` (pure):
   - `normalizePhone(raw)`: convert Bangla digits `০–৯` → `0–9`, strip spaces/dashes, drop leading `+88`/`88`/`+880`/`880` (→ `01…`), strip non-digits. Returns 11-digit candidate.
   - `isValidBDPhone` = `/^01[3-9]\d{8}$/`.
   - `validateDonorForm(values)` → `{ ok, errors: Record<field,string> }` with Bangla messages:
     - name: trimmed, 1–40 chars, collapse inner whitespace, reject digits-only/URL-looking strings (spam guard: no `http`, no `@`).
     - group required; district required; phone valid; area ≤ 60.
     - `lastDonated`: valid `YYYY-MM-DD`, **not in the future**, not older than ~60 years; warn (don't block) if the year looks like a typo.
     - consent required for *new* entries.
3. `lib/format.ts`: `toBn(n)`, `formatDateBn(iso)` ("১২ অক্টোবর ২০২৬"), `daysAgoBn`.
4. `lib/donors.ts`:
   - `queryDonors(group, district?)`: **`where("bloodGroup","==",g)` + optional `where("district","==",d)` + `limit(200)`**. Two *equality* filters need **no composite index** (unlike guide's client-filter, this stops the 200 cap hiding local donors when a group has >200 donors). Sort client-side with `rank`, then `updatedAt` desc. Return `{ donors, truncated }` (truncated = hit limit → UI shows "আরও আছে, জেলা বাছাই করুন").
   - `getMyDonor(uid)`, `saveMyDonor(uid, values, existing?)` (preserve `createdAt`, omit `area`/`lastDonated` when empty), `deleteMyDonor(uid)`.
   - `findDonorsByPhone(phone)` — for duplicate warning (M5).
   - Map Firestore errors to typed app errors: `permission-denied`, `unavailable`/offline, `unauthenticated`, `resource-exhausted` (quota) → each has a Bangla message.
5. `lib/firebase.ts`: as in guide, but:
   - Make `ensureUser()` **memoised** (single in-flight promise; guide version leaks a listener on every call).
   - App Check init only when site key exists; in dev set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` (register token in console) so localhost keeps working once enforced.
   - Guard against the SSR import (`getAuth` is fine on server but don't call sign-in).
6. Vitest: tests for `normalizePhone`, `validateDonorForm`, `isCoolingDown` (boundary at exactly 120 / 119 days, invalid date string), `rank`.

⚠️
- `isCoolingDown` with malformed/`future` date → treat as **not** cooling (don't hide a donor because of bad data).
- `new Date("2026-03-01")` parses as UTC; compare using whole-day arithmetic in the user's local zone (Bangladesh UTC+6) to avoid off-by-one at the 120-day boundary.
- Docs with missing optional fields or stale schema must not crash cards (`area ?? ""`, `lastDonated ?? null`).
- `createdAt/updatedAt` are client clocks: don't rely on them for security; only for sorting.

✅ Unit tests green; a scratch script/page can create → read → update → delete one doc with the rules from M1 live.

---

### M4 — Join page: create flow (≈3 h)

Route `/join`. Real `<form noValidate onSubmit>`.

🧱
1. Fields in order: নাম → রক্তের গ্রুপ → মোবাইল → জেলা → এলাকা (ঐচ্ছিক) → সর্বশেষ রক্ত দিয়েছেন (ঐচ্ছিক, collapsed behind a "তারিখ যোগ করুন" toggle so the base form is 5 fields) → availability switch (default ON) → consent.
2. Blood group picker: radio-group semantics (`role="radiogroup"`, arrow-key support, `aria-checked`), 4-col grid → 8-col on `lg`.
3. Phone: `type="tel" inputMode="numeric" autoComplete="tel" maxLength` generous (14 to allow pasted `+8801…` before normalising on change), helper `01XXXXXXXXX`. Show normalised value live.
4. Consent copy (exact): *"আমি জানি আমার নাম ও ফোন নম্বর সবাই দেখতে পারবে।"* with a one-line explainer above the checkbox in a tinted info box (blood-50) — it's the trust moment, make it readable.
5. Sticky bottom bar: `সংরক্ষণ করুন` (primary). Sticky inside the form flow (guide §4.4), not `position: fixed`.
6. Submission:
   - Validate → on errors: show inline per-field messages, **focus the first invalid field** and scroll it into view, plus an `aria-live` summary ("২টি ঘর ঠিক করুন").
   - `ensureUser()` happens on mount (so first submit is instant); if still pending on submit, disable button with spinner "একটু অপেক্ষা করুন…" (don't error).
   - Success → full-screen success state: big check, "ধন্যবাদ! আপনি এখন তালিকায় আছেন", buttons: **তালিকা দেখুন** (→ `/?g=<their group>`), **বন্ধুকে জানান** (share invite), and a quiet "আমার তথ্য দেখুন/বদলান".
7. Disable double-submit (button `loading`, ignore re-entry via ref).
8. Autosave draft to `sessionStorage` (so an accidental back/Messenger-app switch doesn't lose input); clear on success.

⚠️ edge cases
| Case | Behaviour |
|---|---|
| Bangla digits / `+8801…` / spaces pasted into phone | Normalised silently, not an error |
| Landline or non-BD number | "সঠিক মোবাইল নম্বর দিন" |
| Whitespace-only name | Treated as empty |
| Name with emoji | Allowed (nicknames), but length counted by code points via `Array.from` ≤ 40 so rules (`size()` counts code points) never reject it |
| Name contains URL/phone digits | Rejected (spam) |
| Future/invalid last-donated date | Inline error |
| Offline at submit | Error banner + keep form data + Retry; Firestore may queue the write — **disable offline persistence** (default memory cache) to avoid showing "saved" when it isn't |
| Anonymous sign-in fails (blocked cookies/storage, Private mode in some in-app browsers) | Dedicated error: "এই ব্রাউজারে সংরক্ষণ করা যাচ্ছে না। Chrome/Safari-তে খুলুন" with a **copy link** button |
| App Check / permission-denied | Generic "সংরক্ষণ করা যায়নি, কিছুক্ষণ পরে চেষ্টা করুন" (don't expose internals) |
| Quota exceeded | "সার্ভার ব্যস্ত, কিছুক্ষণ পরে চেষ্টা করুন" |
| User navigates away mid-save | `beforeunload` is **not** used (annoying); the save is fast and idempotent (`setDoc` same id) |
| Hydration mismatch from storage draft | Read the draft in `useEffect`, not during render |

✅ Create a donor on a real phone in ≤ 20 s; every row in the table is reproduced and handled; doc appears in console with the right shape.

---

### M5 — Join page: duplicates, edit & delete (≈2.5 h)

🧱
1. On mount after `ensureUser()`: `getMyDonor(uid)`. Show a **form skeleton** while loading (not an empty form that then jumps and overwrites typing). If a doc exists → prefill, title becomes **আমার তথ্য**, consent pre-checked and hidden (already consented), show "সর্বশেষ আপডেট: …".
2. Edit save → `updatedAt` bump, toast "আপডেট হয়েছে" (stay on page).
3. **Availability quick toggle**: switching the switch on an existing entry saves immediately (optimistic with rollback + toast), without needing the Save button — that's the most frequent action by far.
4. **Delete**: danger button at the bottom → `ConfirmDialog` ("আপনার নাম ও নম্বর তালিকা থেকে মুছে যাবে। এটা ফেরানো যাবে না।", buttons `মুছে ফেলুন` / `থাক`). After delete → confirmation screen + link home. Dialog must not be dismissible while the delete is in flight.
5. **Duplicate phone soft-check** on save of a *new* entry: `findDonorsByPhone`. If another doc (different uid) has the same number → inline non-blocking notice: "এই নম্বর দিয়ে আগেই একজন যুক্ত আছেন (হয়তো অন্য ব্রাউজারে)। তবুও যুক্ত করবেন?" with `হ্যাঁ, যুক্ত করুন` / `ফিরে যান`. Not blocking, because family members sharing a phone is legitimate.
6. Show a small hint on the Join page for the known limitation: "এই ব্রাউজার থেকে একটি তথ্যই রাখা যায়"—only when editing.

⚠️ edge cases
| Case | Behaviour |
|---|---|
| **Lost identity**: user cleared site data / new phone / opened from Messenger's in-app browser then Chrome → new anonymous uid, old entry orphaned (cannot be edited) | MVP accepts this (guide §6). Mitigate: duplicate-phone notice (above) tells them an entry exists; footer text "পুরোনো তথ্য সরাতে জানান" with admin contact (a `mailto:`/WhatsApp link in `lib/config.ts`). Admin removes via console. Phase-2: phone-ownership claim. |
| Existing entry fails to load (network) | Retry card; don't show the blank "create" form (would silently overwrite on save) |
| Deleting an already-deleted doc | Treat as success |
| Edit changes blood group | Fine; doc id unchanged, list reflects on next query |
| Race: two tabs editing | Last write wins; acceptable |
| Availability toggle fails | Revert switch + toast error |
| Existing doc violates current rules (older schema) | Show "তথ্য হালনাগাদ করুন" and validate fully on next save |

✅ Create → edit → toggle availability → delete → re-create works; orphan scenario shows duplicate notice; no data loss on network failure.

---

### M6 — Search page: blood group + district + results (≈3.5 h)

Route `/`. Server page renders shell instantly; `SearchView` (client, in `<Suspense fallback={SearchSkeleton}>`) reads URL.

🧱
1. URL is the source of truth: `?g=O%2B&d=রংপুর`.
   - Parse defensively: `g` not in `BLOOD_GROUPS` → ignore (treat as none); `d` not in `DISTRICTS` → ignore. Never trust the URL.
   - Update with `router.replace(..., {scroll:false})`; no history spam when toggling.
   - Note `+` in URL: always build with `URLSearchParams` (encodes `+` as `%2B`). A raw `+` decodes to a space → "O " — also tolerate by trimming and mapping `"O "`→`"O+"`.
2. Empty state (no group chosen): short explainer card — "গ্রুপ বাছাই করুন, আশেপাশের দাতাদের নম্বর পাবেন" — plus the honest note about community list. No fake results.
3. Fetch with a request-id guard so only the latest query sets state (the guide's `useEffect` has a race when users tap groups quickly). Use an `AbortController`-style `let cancelled` flag.
4. Results header: `৫ জন দাতা · রংপুর` + **শেয়ার** button. Count displayed with Bangla digits. Show "শুধু ৫ জন এখন দিতে পারবেন" sub-line (count of rank 0).
5. List sorted by `rank` (available+eligible → recently donated → unavailable), stable within groups by `updatedAt` desc. Insert a thin divider label "যারা এখন নাও পারতে পারেন" before the lower groups so sorting is *explained*, not mysterious.
6. `DonorCard`: collapsed shows tile + name + location + status pill; whole card is a `<button aria-expanded aria-controls>`. Expanded shows the call row (see M7).
7. Skeleton cards ×4 (same height as real cards → no layout shift).
8. Sticky bottom bar CTA: `রক্তদাতা হিসেবে যুক্ত হোন` → `/join`. If the user already has an entry (cheap check: `localStorage` flag `hasEntry` set on save, cleared on delete) label becomes `আমার তথ্য দেখুন`.
9. Grid: 1 col phone, `md:grid-cols-2`.
10. Footer disclaimer text + admin contact line.

⚠️ edge cases
| Case | Behaviour |
|---|---|
| 0 results for group | Empty state with illustration-free message: "এই গ্রুপের কোনো দাতা এখনো নেই।" + **শেয়ার করুন** + (if district set) button **সব জেলায় খুঁজুন** |
| 0 results in district but donors exist elsewhere | Same empty state with the "সব জেলায়" action (one tap to widen) |
| Result count hits 200 | Banner "অনেক দাতা আছেন — জেলা বাছাই করে ছোট করুন" |
| Network failure / Firestore unavailable | Error card with **আবার চেষ্টা করুন**; keeps selection |
| Offline from the start | `OfflineBanner` via `navigator.onLine` + events; queries show error, not infinite skeleton |
| Query takes > 8 s | Show "ধীর নেটওয়ার্ক — একটু অপেক্ষা করুন" under skeletons |
| Rapid group switching | Latest wins (guard in step 3) |
| Back button after join | Search state restored from URL |
| Group tapped again | Does **not** deselect (accident-prone in emergencies); a separate "মুছুন" link clears filters |
| Very long names / areas | Wrap to 2 lines, then clamp; full text in expanded state |
| Missing optional fields | Cards render cleanly (no stray `·` or `,`) — build location string by `[district, area].filter(Boolean).join(" · ")` |
| Stale cached page served from SW/CDN | Not applicable (no SW); data always fetched client-side |

✅ At 320px nothing scrolls horizontally; selecting group updates URL and list within one render; every empty/error state manually triggered (use DevTools offline + a group with no donors).

---

### M7 — Contact reveal: call & WhatsApp (≈1.5 h)

🧱
1. Expanded card shows: full phone number in large type (selectable, `font-variant-numeric: tabular-nums`), **কল করুন** (`tel:`), **হোয়াটসঅ্যাপ** (`https://wa.me/880…`), and a small **কপি করুন** for desktop.
2. WhatsApp: strip leading `0` → `https://wa.me/8801XXXXXXXXX` (guide's `wa.me/88${phone}` yields `88` + `01…` = valid, keep it but build via helper `waLink(phone)`). Add a prefilled, polite message `?text=` in Bangla ("আমি রক্তদাতা তালিকা থেকে আপনার নম্বর পেয়েছি। {গ্রুপ} রক্ত দরকার…").
3. Only **one** card expanded at a time; expanding scrolls it into view if it'd go under the sticky bar.
4. Unavailable donors: the call row is still reachable (they may have toggled off stale), but preceded by a warn line "এখন দিতে পারবেন না বলা আছে — আগে মেসেজ করে নিশ্চিত হোন".
5. Cooling donors: show "সর্বশেষ রক্ত দিয়েছেন: ২৮ অক্টোবর (৩৫ দিন আগে)".
6. Tap-to-reveal is also what "hides" the number from the list DOM visually; don't render the phone in collapsed cards.

⚠️
- `tel:` on desktop does nothing → the copy button is the fallback and shows "কপি হয়েছে" toast.
- Clipboard API unavailable (insecure context / old WebView) → fall back to selecting the number text (it's selectable) and show "নম্বরটি চেপে ধরে কপি করুন".
- `target="_blank"` links need `rel="noopener noreferrer"`.
- Expanded card state must survive result refresh (key by `uid`).
- Each tap target ≥ 48px with ≥ 8px gap; call/WA buttons are 52px.

✅ Real phone: tap card → tap call opens dialer; WhatsApp opens chat with the prefilled text; desktop shows copy.

---

### M8 — Eligibility ("recently donated") & smart sort polish (≈1 h)

Most logic exists from M3/M6; this milestone is verification and polish.

🧱
1. Confirm `COOLDOWN_DAYS` constant is used everywhere (label, sort, sub-line). Put a **comment with the source** of the interval you chose (confirm with your community/medical guidance; the guide says "~4 months" — whole-blood intervals differ by country/gender, so make it a documented single constant).
2. Show "আবার দিতে পারবেন: ১২ ডিসেম্বর" on cooling cards (computed date).
3. Donor edit page shows a helper under the date field explaining the effect: "৪ মাসের মধ্যে দিলে আপনি তালিকার নিচে থাকবেন।"
4. Pills never rely on colour alone (already text).

⚠️ Boundary days (0, 119, 120, 121), timezone, missing date, malformed date → covered by unit tests from M3; add tests for the new "next eligible" helper.

✅ Seed 6 docs by hand (all state combos) in the console; order and labels are correct.

---

### M9 — Share & shareable URLs (≈1.5 h)

🧱
1. `lib/share.ts`: `buildRequestMessage({group, district, url})` exactly as in guide §3 (Bangla, with link). `shareRequest()`:
   - `navigator.share` if available (`canShare` check) → catch `AbortError` silently (user cancelled is not an error).
   - Fallback: `navigator.clipboard.writeText` → toast "কপি হয়েছে! গ্রুপে পেস্ট করুন". **Never `alert()`** (guide uses it).
   - Final fallback if clipboard fails: open a `ConfirmDialog`-style sheet with the text in a readonly `<textarea>` pre-selected.
2. URL must be **canonical**: use `NEXT_PUBLIC_SITE_URL` (set in Vercel) rather than `location.href`, so shares don't leak `localhost`/preview URLs or extra params.
3. Open Graph tags so the pasted link previews nicely in Messenger/WhatsApp. Use `generateMetadata`-free approach: static OG title/description + an `opengraph-image` (one static branded 1200×630 image: wordmark + drop, no per-search image in MVP).
4. "Invite a friend to join" share after successful join (generic message + home URL).

⚠️
- `navigator.share` requires HTTPS + user gesture → call directly in the click handler (no `await` before it).
- Share text when no group selected: the button is hidden (nothing to share).
- Bangla text + emoji in URL fragments: `encodeURIComponent` for any manual links.
- In-app browsers where `share` is missing → covered by fallbacks.

✅ On Android: native sheet opens, Messenger receives message + working link that restores the same search; desktop: copy + toast.

---

### M10 — PWA, icons, error/offline/404 pages (≈1.5 h)

🧱
1. `app/manifest.ts` (typed `MetadataRoute.Manifest`): name, short_name, `start_url:"/"`, `display:"standalone"`, `background_color` = paper, `theme_color` = blood-600, `lang:"bn"`, icons 192/512 + a **maskable** 512 (safe zone ~80%).
2. Icons: simple drop mark on blood-600; `app/icon.png`, `app/apple-icon.png` (180), `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`. Replace default `favicon.ico`.
3. `app/not-found.tsx` (Bangla: "পাতাটি পাওয়া যায়নি" + home button), `app/error.tsx` + `app/global-error.tsx` (client; "কিছু একটা ভুল হয়েছে" + retry).
4. `app/loading.tsx` not needed — we have per-view skeletons.
5. `OfflineBanner`: slim sticky strip under top bar "ইন্টারনেট নেই — সংযোগ ফিরলে আবার চেষ্টা করুন".
6. iOS: `appleWebApp` metadata (`capable`, `title`) so "Add to Home Screen" is clean.

⚠️
- No service worker in MVP; install prompt works on Chrome with manifest + HTTPS. Don't promise offline use.
- Verify `themeColor` doesn't flash on first paint.

✅ Chrome DevTools → Application → Manifest shows no errors; installable on Android; opens without browser bar.

---

### M11 — Hardening: App Check, abuse, privacy pass (≈1.5 h)

🧱
1. Deploy to Vercel **preview** first (M12 order below), register domains in reCAPTCHA + Firebase authorised domains.
2. Turn App Check to **Monitor** → verify metrics show verified requests from the site → then **Enforce** for Firestore **and** Authentication. Keep a debug token for local dev.
3. Spam throttling inside rules is limited; accept. Note remedy path: delete from console. (Optional tiny guard: client-side cooldown of 10 s between saves.)
4. Privacy page-lite: a `/about` (or modal on footer link) in Bangla explaining: what's collected, that it's public, how to delete (button on `/join`), no NID/address/photo, community list not medical service, contact for removal. Link in footer on every page.
5. Security headers via `next.config.ts` `headers()`: `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (disable camera/mic/geo). **Do not** add a strict CSP in MVP (Firebase + reCAPTCHA needs many origins; risk of breaking prod) — put in Phase 2.
6. Ensure no PII in console logs or analytics. No third-party analytics in MVP (Vercel Web Analytics optional, cookie-less).

⚠️
- Enforcing App Check **before** the production domain is registered locks everyone out. Always: Monitor → verify → Enforce.
- reCAPTCHA failing (adblock, corporate DNS) → app must still try without hard crash; reads will fail once enforced — show the generic error card from M6.
- Firestore `get`/`list` split rule: confirm `limit(200)` queries pass.

✅ With enforcement on, the site works in prod; a `curl` against the Firestore REST API without an App Check token is rejected.

---

### M12 — QA, polish, deploy, launch (≈3 h)

🧱
1. Remove dev gallery and leftover boilerplate. `npm run lint`, `npm run build`, `npx tsc --noEmit` clean.
2. **Manual test matrix** (tick each):

| Scenario | Chrome Android | iPhone Safari | Messenger in-app | Desktop |
|---|---|---|---|---|
| Search each of 8 groups | ☐ | ☐ | ☐ | ☐ |
| Search + district; empty result | ☐ | ☐ | ☐ | ☐ |
| Open shared URL cold | ☐ | ☐ | ☐ | ☐ |
| Join (new) in ≤ 20 s | ☐ | ☐ | ☐ | ☐ |
| Edit, toggle availability, delete | ☐ | ☐ | ☐ | ☐ |
| Call / WhatsApp / copy | ☐ | ☐ | ☐ | ☐ |
| Share (native / fallback) | ☐ | ☐ | ☐ | ☐ |
| Add to Home Screen | ☐ | ☐ | – | – |
| Offline & slow 4G | ☐ | – | – | ☐ |

3. Run the guide's §4.8 checklist in full. Add: 200% browser text zoom still usable; TalkBack/VoiceOver reads the card, chips ("A+, নির্বাচিত") and form errors; keyboard-only complete flow on desktop.
4. Lighthouse Mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. First load JS target < 150 KB gzipped (firebase modular imports only; `firestore` + `auth` are the bulk — lazy-load `auth`/`app-check` on `/join` only, import `firebase/auth` dynamically so the **home page ships no Auth code**).
5. Seed ≥ 10 real/test donors (remove test ones before launch).
6. Vercel: env vars (incl. `NEXT_PUBLIC_SITE_URL`), deploy, authorised domains, reCAPTCHA domain, App Check enforce (M11).
7. Paste the launch message (guide §12) with the real URL; pin it.

✅ All boxes ticked; the first real donor from the group joins without help.

---

## 4. Cross-cutting checklists

### 4.1 Definition of done (every screen)
- [ ] Works at 320, 360, 412, 768, 1024; no horizontal scroll
- [ ] Loading, empty, error, offline, success states exist and are designed
- [ ] All text from `lib/messages.ts`, Bangla, no English leftovers
- [ ] Every tappable element ≥ 48px, visible focus ring, keyboard operable
- [ ] No colour-only meaning; contrast AA
- [ ] No `alert`/`confirm`/`prompt` (use Toast/ConfirmDialog)
- [ ] No `any`, no unhandled promise (`void` + catch), no console noise
- [ ] Reduced-motion respected

### 4.2 Things deliberately NOT done (stay disciplined)
Login/OTP, admin UI, request board, push, maps/GPS, i18n toggle, donation history, chat, ratings, dark mode, service worker/offline data, strict CSP, analytics. If a task tempts you toward any of these → write it in Phase 2 and move on.

### 4.3 Suggested commit sequence
`chore: clean boilerplate` → `feat: firebase + rules` → `feat: design system` → `feat: domain layer + tests` → `feat: join create` → `feat: join edit/delete` → `feat: search` → `feat: contact reveal` → `feat: eligibility polish` → `feat: share` → `feat: pwa + error pages` → `chore: hardening` → `chore: release`

### 4.4 Time estimate
M0 0.5h · M1 0.75h · M2 2h · M3 2h · M4 3h · M5 2.5h · M6 3.5h · M7 1.5h · M8 1h · M9 1.5h · M10 1.5h · M11 1.5h · M12 3h ≈ **24 hours** (3 focused days; the guide's "one weekend" is realistic only if you cut M8/M10 polish).

---

## Appendix A — Problems in the guide's sample code (fix while implementing)

| Where | Problem | Fix in this plan |
|---|---|---|
| §7.4 layout | `<main>` placed in root layout forces the same container everywhere | AppShell component |
| §7.5 `ui.ts` | Long class strings are hard to evolve; styles blood red as generic `red-600` | Tokens + components (§1.2, M2) |
| §7.6 `ensureUser` | Adds a new `onAuthStateChanged` listener per call; no error memoisation | Memoised promise (M3) |
| §7.7 `shareText` | Uses `alert()`; no clipboard fallback; `navigator.share` AbortError swallowed with empty catch only | M9 |
| §7.7 `isCoolingDown` | UTC date parsing off-by-one; bad data hides donors | M3 ⚠️ |
| §7.8 search `useEffect` | Race on rapid taps; no error handling (`.then` only → infinite skeleton on failure); doesn't reset on error | M6 |
| §7.8 | Client-side district filter after `limit(200)` hides local donors in big groups | Two-equality query (M3) |
| §7.8 | `text-left` button content + bare `<ul>` of buttons lacks `aria-expanded` | M6 |
| §7.8 | `location.href` in share message may include preview/localhost URL | `NEXT_PUBLIC_SITE_URL` (M9) |
| §7.9 join | Form starts blank then silently overwrites after async load; no loading state | Skeleton + gating (M5) |
| §7.9 | Uses `confirm()`; delete errors uncaught; `area` saved as `""` (rules allow, but clutter) | ConfirmDialog; omit empty (M5/M3) |
| §7.9 | Phone only strips non-digits → `+8801…` or Bangla digits fail | `normalizePhone` (M3) |
| §7.9 | Consent not required again on edit but also not shown; fine, but not communicated | Hidden w/ "আগেই সম্মতি দেওয়া" note |
| §7.10 rules | `createdAt` immutable not enforced; `list` unbounded; optional `area`/`lastDonated` types unchecked | M1 rules |
| §7.11 | Manifest in `public/` | Use `app/manifest.ts` (typed, Next-native) |
| Everywhere | Emoji as icons, red-600/red-50 default palette | SVG set + custom tokens (§1) |

## Appendix B — Config file `lib/config.ts`
```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
export const ADMIN_CONTACT = { label: "যোগাযোগ", href: "mailto:you@example.com" }; // set before launch
export const COOLDOWN_DAYS = 120; // document the source of this interval
export const SEARCH_LIMIT = 200;
```
Env keys to add to `.env.example`: the 5 Firebase/reCAPTCHA keys + `NEXT_PUBLIC_SITE_URL`.
