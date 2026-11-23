# 🩸 রক্তদাতা তালিকা — MVP Plan & Dev Guide (Mobile-First)

A tiny Bangla website where anyone can **add themselves as a blood donor in ~20 seconds** and anyone in need can **find a donor in 2 taps** — designed for **one-handed use on a phone**.

**Stack:** Next.js (App Router) + Tailwind + Firebase (Firestore + Anonymous Auth + App Check) + Vercel
**Language:** Bangla UI only
**Design priority:** 📱 Mobile first, desktop is just "the same thing, centered"
**Goal:** Weekend build. Zero login. Zero admin panel. Zero backend code.

---

## 1. The idea in one sentence

> Open link → pick blood group → see donors with a **Call** button. Want to be a donor? One short form, no signup.

Everything below is built to protect those two flows from getting longer.

---

## 2. Core design decisions (and why)

| Decision | Why |
|---|---|
| **Mobile-first UI** | Most users will arrive from a messenger link on a phone, often in a hurry. Design for a 360px-wide Android screen first; larger screens only get extra room. |
| **No login / no OTP** | OTP costs money and adds steps. We use Firebase *Anonymous Auth*: it silently gives each browser an ID so people can edit/delete **their own** entry later. The user never sees it. |
| **One entry per browser** (doc ID = anonymous uid) | Prevents spam duplicates, makes edit/delete trivial, and keeps rules tiny. |
| **Search shows blood group first, area second** | In an emergency, blood group is the only must-have filter. |
| **Query by blood group only, filter district on the client** | At this scale (hundreds of donors) it avoids Firestore composite indexes entirely. |
| **Search state lives in the URL** (`/?g=O%2B&d=রংপুর`) | Every search becomes a **shareable link** you can paste in any messenger group. No extra feature needed. |
| **Phone is hidden behind a tap** | Reduces casual scraping and shoulder-surfing. Tap shows number + Call + WhatsApp buttons. |
| **Native share sheet** (`navigator.share`) | On phones, one tap opens Messenger/WhatsApp share directly. Falls back to copy on desktop. |
| **Firebase App Check (reCAPTCHA v3)** | Blocks bots from reading/writing your database directly. Free and ~10 minutes of setup. |

---

## 3. MVP feature list (only these)

### Must have
1. **Search page (home)**
   - 8 big blood-group buttons: `A+ A- B+ B- AB+ AB- O+ O-`
   - Optional district dropdown (default: সব জেলা)
   - Results list: name, blood group, district/area, availability badge
   - Tap a card → reveals phone + **📞 কল করুন** + **💬 হোয়াটসঅ্যাপ**
   - Sticky bottom button: **❤️ নিজেকে যুক্ত করুন**
2. **Join page (`/join`)** — one screen, 5 fields:
   - নাম (nickname is fine)
   - রক্তের গ্রুপ (8 buttons)
   - মোবাইল নম্বর (`01XXXXXXXXX`, validated, number keypad)
   - জেলা (dropdown) + এলাকা (optional text)
   - Consent checkbox: *"আমি জানি আমার নাম ও ফোন নম্বর সবাই দেখতে পারবে"*
   - Sticky bottom **সংরক্ষণ করুন** button
3. **My entry** (same `/join` page, pre-filled if you already joined)
   - Edit anything
   - **Delete my info** button
4. **Availability toggle** — "এখন রক্ত দিতে পারি" on/off. Donors flip it off when sick/travelling.
5. **Last donation date** (optional) — see "smart features" below.
6. **Share button** on results — opens the phone's native share sheet with a ready-made Bangla message + link.
7. **PWA / Add to Home Screen** — a manifest + icon so it behaves like an app. Cheap and very handy in emergencies.

### Smart but free (no extra work for users)
- **Auto "eligible" status:** if `lastDonated` was less than ~4 months ago, the card shows *"সম্প্রতি রক্ত দিয়েছেন"* and sinks to the bottom of results. The donor does nothing; the list stays honest. (Set the day-count in one constant; confirm the exact interval you want to follow.)
- **Sort order:** available + eligible first, then the rest.
- **Ready-made request message:** after a search, the share button sends:
  ```
  🩸 জরুরি O+ রক্ত দরকার
  এলাকা: রংপুর
  দাতাদের তালিকা: https://your-site.vercel.app/?g=O%2B&d=রংপুর
  ```
- **Empty-result fallback:** if no donor matches, show *"এই গ্রুপের দাতা নেই — শেয়ার করুন"* instead of a dead end.

### Deliberately NOT in MVP
Login / OTP, admin dashboard, blood request board, push notifications, maps, GPS "near me", ratings/comments, English toggle, donation history, user profiles, chat.

### Phase 2 (only if people actually use it)
- Request board with urgency + hospital (plus FCM push to matching donors)
- "Report wrong number" button
- Reminder link after 4 months ("আবার দিতে পারবেন")
- Admin delete via a simple `?admin` page (until then, delete from Firebase Console)
- Upazila-level filter

---

## 4. 📱 Mobile-first UI guidelines

### 4.1 The golden rules

1. **Design at 360 × 800 first.** That is a very common Android size. Then check 320px (small phones) and 412px (large phones). Only after that look at tablet/desktop.
2. **Write base Tailwind classes for mobile, add `md:` / `lg:` only to enhance.** Tailwind is mobile-first by default: `grid-cols-4 lg:grid-cols-8` means "4 columns on phone, 8 on large screens".
3. **One column, one job per screen.** Home = search. Join = form. No tabs, no hamburger menu, no sidebar.
4. **Primary action lives in the thumb zone** (bottom of the screen), not at the top.
5. **No hover, no tiny targets, no horizontal scroll.** Everything must work with a thumb and a slow network.
6. **Use native controls** (`<select>`, `type="date"`, `type="tel"`) — they open the phone's own pickers and keypads, which are faster than any custom component.

### 4.2 Thumb zone layout

```
┌──────────────────────┐
│  🩸 রক্তদাতা খুঁজুন    │  ← hard to reach: title only
│                      │
│  [A+][A-][B+][B-]    │  ← reachable: main choices
│  [AB+][AB-][O+][O-]  │
│  [ জেলা ▼          ] │
│  ───────────────     │
│  ৫ জন দাতা   📤 শেয়ার │
│  ┌────────────────┐  │  ← results scroll in the middle
│  │ রাহিম      O+  │  │
│  └────────────────┘  │
│                      │
├──────────────────────┤
│ ❤️ নিজেকে যুক্ত করুন   │  ← easiest zone: sticky primary button
└──────────────────────┘
```

### 4.3 Size cheat-sheet

| Element | Mobile rule | Tailwind |
|---|---|---|
| Touch target (any tappable thing) | **≥ 48 × 48 px**, ≥ 8px gap between targets | `h-12` (48px), `gap-2` |
| Blood group buttons | Big and easy to hit | `h-14 text-xl font-bold` |
| Input text size | **≥ 16px** (smaller makes iPhones auto-zoom on focus) | `text-base` |
| Primary button | Full width, tall | `h-14 w-full text-lg` |
| Body text | 16px | `text-base` |
| Secondary text | 14px minimum | `text-sm` |
| Page side padding | 16px | `px-4` |
| Line height for Bangla | Generous — Bangla glyphs have tall matras and need room | `leading-relaxed` |
| Screen height | Use dynamic viewport so mobile browser bars don't cut layout | `min-h-dvh` (not `min-h-screen`) |

### 4.4 Form rules (the most important screen for conversion)

- **One field per row**, full width, labels **above** inputs (placeholders disappear while typing).
- Right keyboard for each field:

| Field | Attributes |
|---|---|
| নাম | `autoComplete="name"` |
| মোবাইল | `type="tel"` `inputMode="numeric"` `autoComplete="tel"` `maxLength={11}` |
| জেলা | native `<select>` |
| সর্বশেষ রক্ত | `type="date"` (native calendar) |

- Keep the form inside a real `<form>` so the keyboard's **Go/Done** key submits it.
- **Sticky save button** at the bottom of the form (inside the flow, not `fixed`, so the on-screen keyboard doesn't push it around).
- Validate **inline and in Bangla** ("সঠিক মোবাইল নম্বর দিন"), never with a technical error.
- Never ask for anything you don't need. Every extra field costs sign-ups.

### 4.5 Responsive behaviour (what changes on bigger screens)

Mobile is the real design. Larger screens just get breathing room:

| Breakpoint | Tailwind prefix | Min width | What we change |
|---|---|---|---|
| Phone (default) | *(none)* | 0 | Single column, `max-w-md` container, 4-column blood buttons, full-width cards |
| Tablet | `md:` | 768px | Container grows to `max-w-2xl`, results become **2 columns** |
| Laptop | `lg:` | 1024px | Blood group buttons become **8 in one row** |

That's all. Do **not** build a separate desktop layout. If you catch yourself writing more than 3–4 `md:`/`lg:` classes per screen, you're over-building.

Container pattern used everywhere:

```tsx
<main className="mx-auto w-full max-w-md px-4 pt-4 pb-32 md:max-w-2xl md:pt-8">
```
(`pb-32` leaves room so the sticky bottom bar never covers content.)

### 4.6 Performance for real-world phones & networks

- Many users will be on mid/low-range Android and mobile data. Keep the page light.
- Use **only** `next/font` for Noto Sans Bengali, with `subsets: ["bengali", "latin"]` and only the weights you use (400/600/700).
- **No UI library, no icon library, no animation library.** Tailwind + emoji icons is enough.
- Fetch **only** by blood group, with a safety `limit(200)`; don't download the whole collection.
- Show **skeleton cards** (grey pulsing boxes) while loading so it feels instant.
- No images on the home page except the PWA icon.
- Run **Lighthouse (Mobile)** in Chrome and aim for green on Performance and Accessibility.

### 4.7 Accessibility & readability basics

- Text contrast: dark text on white/very light background. Don't use light grey for important text.
- Don't rely on color alone: availability is shown with **words** ("এখন দিতে পারবেন না"), not just grey.
- Don't disable pinch-zoom (never set `maximum-scale=1`).
- Use `lang="bn"` on `<html>` so screen readers and browsers handle Bangla properly.
- Every button has visible text (emoji + Bangla label), not an icon alone.

### 4.8 Mobile test checklist (do before sharing the link)

- [ ] Chrome DevTools → Device toolbar → test **360×800**, **320×568**, **412×915**
- [ ] No horizontal scrolling at 320px width
- [ ] Every button/link is at least 48px tall
- [ ] Tapping a phone field opens the **number keypad**
- [ ] Focusing an input does **not** zoom the page (iPhone)
- [ ] Sticky buttons are not hidden by the keyboard or the phone's bottom bar
- [ ] DevTools → Network → throttle **Slow 4G**: search still feels fine
- [ ] Open the link inside **Messenger / WhatsApp's in-app browser** (that's how most people will arrive)
- [ ] Test on **at least one real Android phone and one iPhone** if possible
- [ ] "Add to Home Screen" works and the app opens without the browser bar

---

## 5. Privacy & trust (do this, it's small)

- Public directory means **phone numbers are public**. Say it plainly on the Join page (consent checkbox above).
- Add a one-line footer: *"এই তালিকা স্বেচ্ছাসেবী। ভুল তথ্য পেলে জানান।"*
- Never collect: NID, exact address, age, photo.
- Anyone can delete their entry anytime (button on the Join page).
- Turn on **App Check** so only your site can talk to Firestore.
- Be honest in the group message that this is a community list, not a verified medical service. Donors/recipients should always confirm availability by phone and follow hospital guidance.

---

## 6. Data model (one collection)

```
donors/{uid}
  uid:          string   // anonymous auth uid (same as doc id)
  name:         string   // max 40
  bloodGroup:   "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
  phone:        string   // 01XXXXXXXXX
  district:     string   // from fixed list
  area:         string   // optional, max 60
  available:    boolean
  lastDonated:  string | null   // "YYYY-MM-DD"
  createdAt:    number   // Date.now()
  updatedAt:    number
```

> **Limitation to accept in MVP:** one entry per browser. Someone registering a family member from the same phone will overwrite their own entry. For that, use another browser, or you seed entries yourself (see §10).

---

## 7. Setup — start right now

### 7.1 Create the project
```bash
npx create-next-app@latest blood-donors --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"
cd blood-donors
npm i firebase
```

### 7.2 Firebase console
1. Create project → add a **Web app** → copy the config.
2. **Build → Firestore Database** → create (production mode, region near you).
3. **Build → Authentication → Sign-in method → Anonymous → Enable.**
4. **Build → App Check** → register web app with **reCAPTCHA v3** (get a site key) → later switch on *Enforce* for Firestore (after you confirm the site works).

### 7.3 Env vars — `.env.local`
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
```
Add the same keys in **Vercel → Project → Settings → Environment Variables**.

### 7.4 Root layout (mobile viewport + Bangla font) — `app/layout.tsx`
```tsx
import type { Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const font = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "রক্তদাতা তালিকা",
  description: "রক্ত দরকার? দাতা খুঁজুন। রক্ত দিতে চান? নিজেকে যুক্ত করুন।",
  manifest: "/manifest.webmanifest",
};

// Mobile viewport. viewportFit "cover" lets us use env(safe-area-inset-*) for notches/home bars.
// Do NOT disable zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#dc2626",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={`${font.className} min-h-dvh bg-red-50 text-base leading-relaxed text-gray-900 antialiased`}>
        <main className="mx-auto w-full max-w-md px-4 pt-4 pb-32 md:max-w-2xl md:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### 7.5 Shared mobile UI classes — `app/ui.ts`
One place to keep touch-friendly sizes consistent. (Kept inside `app/` so Tailwind picks the classes up.)
```ts
export const ui = {
  // 48px tall, 16px text → no iOS zoom, easy to tap
  input:
    "w-full h-12 rounded-xl border border-gray-300 bg-white px-4 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200",
  // blood group chips
  chip: "h-14 rounded-xl border text-xl font-bold transition active:scale-95",
  chipOn: "bg-red-600 border-red-600 text-white",
  chipOff: "bg-white border-gray-300",
  // buttons
  primary: "h-14 w-full rounded-xl bg-red-600 text-lg font-bold text-white active:bg-red-700",
  secondary: "h-12 rounded-xl border border-red-600 px-4 font-semibold text-red-700 active:bg-red-50",
  // fixed bottom bar that respects the iPhone home indicator
  bar: "fixed inset-x-0 bottom-0 z-10 border-t bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur",
  // blood group grid: 4 cols on phone, 8 on large screens
  chipGrid: "grid grid-cols-4 gap-2 lg:grid-cols-8",
};
```

### 7.6 Firebase init — `lib/firebase.ts`
```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const app = getApps()[0] ?? initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {} // already initialised (hot reload)
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Resolves with the signed-in (anonymous) user. Called only when needed (Join page).
export function ensureUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, async (u) => {
      off();
      if (u) return resolve(u);
      try { resolve((await signInAnonymously(auth)).user); } catch (e) { reject(e); }
    });
  });
}
```
> Searching needs **no auth** (public read). We sign in anonymously only on `/join`, so the home page stays fast.

### 7.7 Constants & helpers — `lib/data.ts`
```ts
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const DISTRICTS = [
  "ঢাকা","চট্টগ্রাম","রাজশাহী","খুলনা","বরিশাল","সিলেট","রংপুর","ময়মনসিংহ",
  // ...add all 64 districts here
];

export const COOLDOWN_DAYS = 120; // change to the interval you want to follow

export type Donor = {
  uid: string; name: string; bloodGroup: BloodGroup; phone: string;
  district: string; area?: string; available: boolean;
  lastDonated: string | null; createdAt: number; updatedAt: number;
};

export function isCoolingDown(lastDonated: string | null) {
  if (!lastDonated) return false;
  const days = (Date.now() - new Date(lastDonated).getTime()) / 86_400_000;
  return days < COOLDOWN_DAYS;
}

// Smaller number = shown higher
export function rank(d: Donor) {
  if (!d.available) return 2;
  return isCoolingDown(d.lastDonated) ? 1 : 0;
}

export const isValidBDPhone = (p: string) => /^01[3-9]\d{8}$/.test(p);

// Native share sheet on phones (Messenger/WhatsApp in one tap), copy on desktop
export async function shareText(text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try { await navigator.share({ text }); } catch {}
  } else {
    await navigator.clipboard.writeText(text);
    alert("কপি হয়েছে! গ্রুপে পেস্ট করুন");
  }
}
```

### 7.8 Search page (mobile-first) — `app/page.tsx`
```tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BLOOD_GROUPS, DISTRICTS, Donor, isCoolingDown, rank, shareText } from "@/lib/data";
import { ui } from "./ui";

function Search() {
  const router = useRouter();
  const sp = useSearchParams();
  const g = sp.get("g") ?? "";
  const d = sp.get("d") ?? "";
  const [donors, setDonors] = useState<Donor[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const setParam = (k: "g" | "d", v: string) => {
    const p = new URLSearchParams(sp.toString());
    v ? p.set(k, v) : p.delete(k);
    router.replace("/?" + p.toString(), { scroll: false });
  };

  useEffect(() => {
    if (!g) { setDonors(null); return; }
    setDonors(null);
    getDocs(query(collection(db, "donors"), where("bloodGroup", "==", g), limit(200))).then((snap) => {
      let list = snap.docs.map((x) => x.data() as Donor);
      if (d) list = list.filter((x) => x.district === d);
      list.sort((a, b) => rank(a) - rank(b));
      setDonors(list);
    });
  }, [g, d]);

  const message = `🩸 জরুরি ${g} রক্ত দরকার${d ? `\nএলাকা: ${d}` : ""}\nদাতাদের তালিকা: ${typeof window !== "undefined" ? location.href : ""}`;

  return (
    <>
      <h1 className="text-2xl font-bold leading-snug text-red-700">🩸 রক্তদাতা খুঁজুন</h1>

      {/* 1. Blood group — the only required choice */}
      <div className={`mt-4 ${ui.chipGrid}`}>
        {BLOOD_GROUPS.map((b) => (
          <button key={b} onClick={() => setParam("g", b)}
            className={`${ui.chip} ${g === b ? ui.chipOn : ui.chipOff}`}>
            {b}
          </button>
        ))}
      </div>

      {/* 2. Optional district */}
      <select value={d} onChange={(e) => setParam("d", e.target.value)} className={`mt-3 ${ui.input}`}>
        <option value="">সব জেলা</option>
        {DISTRICTS.map((x) => <option key={x}>{x}</option>)}
      </select>

      {/* 3. Results */}
      {g && (
        <div className="mt-5 flex items-center justify-between">
          <span className="font-semibold">
            {donors ? `${donors.length.toLocaleString("bn-BD")} জন দাতা` : "খোঁজা হচ্ছে…"}
          </span>
          <button onClick={() => shareText(message)} className={ui.secondary}>📤 শেয়ার করুন</button>
        </div>
      )}

      {g && donors === null && (
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {[0, 1, 2].map((i) => <li key={i} className="h-16 animate-pulse rounded-xl bg-white" />)}
        </ul>
      )}

      {donors?.length === 0 && (
        <p className="mt-6 text-center">এই গ্রুপের কোনো দাতা পাওয়া যায়নি। উপরের বাটনে শেয়ার করুন।</p>
      )}

      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {donors?.map((x) => {
          const cooling = isCoolingDown(x.lastDonated);
          const dim = !x.available || cooling;
          return (
            <li key={x.uid} className={`rounded-xl border bg-white ${dim ? "opacity-60" : ""}`}>
              {/* whole card is the tap target */}
              <button className="block min-h-16 w-full p-3 text-left" onClick={() => setOpen(open === x.uid ? null : x.uid)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{x.name}</span>
                  <span className="text-lg font-bold text-red-600">{x.bloodGroup}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {x.district}{x.area ? `, ${x.area}` : ""}
                  {!x.available && " · এখন দিতে পারবেন না"}
                  {x.available && cooling && " · সম্প্রতি রক্ত দিয়েছেন"}
                </div>
              </button>
              {open === x.uid && (
                <div className="flex gap-2 px-3 pb-3">
                  <a href={`tel:${x.phone}`} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-green-600 font-semibold text-white">
                    📞 {x.phone}
                  </a>
                  <a href={`https://wa.me/88${x.phone}`} target="_blank" rel="noopener"
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-500 font-semibold text-white">
                    💬 হোয়াটসঅ্যাপ
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-sm text-gray-500">এই তালিকা স্বেচ্ছাসেবী। ভুল তথ্য পেলে জানান।</p>

      {/* Sticky thumb-zone CTA */}
      <div className={ui.bar}>
        <div className="mx-auto max-w-md md:max-w-2xl">
          <Link href="/join" className={`${ui.primary} flex items-center justify-center`}>
            ❤️ আমি রক্ত দিতে চাই — যুক্ত হোন
          </Link>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense><Search /></Suspense>;
}
```
> `useSearchParams` must be wrapped in `Suspense` for the production build.

### 7.9 Join / edit page (mobile form) — `app/join/page.tsx`
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, ensureUser } from "@/lib/firebase";
import { BLOOD_GROUPS, DISTRICTS, Donor, isValidBDPhone } from "@/lib/data";
import { ui } from "../ui";

function Label({ text }: { text: string }) {
  return <span className="mb-1 block text-sm font-semibold">{text}</span>;
}

export default function Join() {
  const [uid, setUid] = useState<string | null>(null);
  const [existing, setExisting] = useState<Donor | null>(null);
  const [name, setName] = useState("");
  const [bg, setBg] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [available, setAvailable] = useState(true);
  const [last, setLast] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureUser().then(async (u) => {
      setUid(u.uid);
      const s = await getDoc(doc(db, "donors", u.uid));
      if (s.exists()) {
        const x = s.data() as Donor;
        setExisting(x); setName(x.name); setBg(x.bloodGroup); setPhone(x.phone);
        setDistrict(x.district); setArea(x.area ?? ""); setAvailable(x.available);
        setLast(x.lastDonated ?? ""); setConsent(true);
      }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); // keyboard "Go" submits the form
    if (!uid) return setMsg("একটু অপেক্ষা করুন…");
    if (!name.trim() || !bg || !district) return setMsg("নাম, গ্রুপ ও জেলা দিন");
    if (!isValidBDPhone(phone)) return setMsg("সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)");
    if (!consent) return setMsg("সম্মতির বক্সে টিক দিন");
    setSaving(true);
    try {
      const now = Date.now();
      const data: Donor = {
        uid, name: name.trim().slice(0, 40), bloodGroup: bg as Donor["bloodGroup"], phone,
        district, area: area.trim().slice(0, 60), available, lastDonated: last || null,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      await setDoc(doc(db, "donors", uid), data);
      setExisting(data);
      setMsg("✅ সংরক্ষিত হয়েছে। ধন্যবাদ!");
    } catch {
      setMsg("সংরক্ষণ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!uid || !confirm("আপনার তথ্য মুছে ফেলবেন?")) return;
    await deleteDoc(doc(db, "donors", uid));
    setExisting(null); setName(""); setBg(""); setPhone(""); setConsent(false);
    setMsg("তথ্য মুছে ফেলা হয়েছে");
  }

  return (
    <>
      <Link href="/" className="inline-flex h-12 items-center text-red-700">← খুঁজুন</Link>
      <h1 className="text-2xl font-bold leading-snug text-red-700">
        {existing ? "আমার তথ্য" : "রক্তদাতা হিসেবে যুক্ত হোন"}
      </h1>

      <form onSubmit={save} className="mt-4 space-y-4">
        <label className="block">
          <Label text="নাম" />
          <input className={ui.input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div>
          <Label text="রক্তের গ্রুপ" />
          <div className={ui.chipGrid}>
            {BLOOD_GROUPS.map((b) => (
              <button key={b} type="button" onClick={() => setBg(b)}
                className={`${ui.chip} ${bg === b ? ui.chipOn : ui.chipOff}`}>{b}</button>
            ))}
          </div>
        </div>

        <label className="block">
          <Label text="মোবাইল নম্বর" />
          <input className={ui.input} type="tel" inputMode="numeric" autoComplete="tel" maxLength={11}
            placeholder="01XXXXXXXXX" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
        </label>

        <label className="block">
          <Label text="জেলা" />
          <select className={ui.input} value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">বাছাই করুন</option>
            {DISTRICTS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>

        <label className="block">
          <Label text="এলাকা (ঐচ্ছিক)" />
          <input className={ui.input} value={area} onChange={(e) => setArea(e.target.value)} />
        </label>

        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-red-600" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          এখন রক্ত দিতে পারি
        </label>

        <label className="block">
          <Label text="সর্বশেষ রক্ত দিয়েছেন (ঐচ্ছিক)" />
          <input type="date" className={ui.input} value={last} onChange={(e) => setLast(e.target.value)} />
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-red-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          আমি জানি আমার নাম ও ফোন নম্বর সবাই দেখতে পারবে।
        </label>

        {msg && <p className="text-center font-semibold">{msg}</p>}

        {existing && (
          <button type="button" onClick={remove} className={`${ui.secondary} w-full`}>আমার তথ্য মুছে ফেলুন</button>
        )}

        {/* Sticky inside the form (not fixed) so the on-screen keyboard behaves */}
        <div className="sticky bottom-0 -mx-4 border-t bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <button type="submit" disabled={saving} className={`${ui.primary} disabled:opacity-60`}>
            {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
          </button>
        </div>
      </form>
    </>
  );
}
```

### 7.10 Firestore security rules
Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function valid(d) {
      return d.keys().hasOnly(['uid','name','bloodGroup','phone','district','area',
                               'available','lastDonated','createdAt','updatedAt'])
        && d.keys().hasAll(['uid','name','bloodGroup','phone','district','available'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 40
        && d.bloodGroup in ['A+','A-','B+','B-','AB+','AB-','O+','O-']
        && d.phone.matches('^01[3-9][0-9]{8}$')
        && d.district is string && d.district.size() <= 40
        && d.available is bool;
    }

    match /donors/{id} {
      allow read: if true;
      allow create, update: if request.auth != null
                            && request.auth.uid == id
                            && request.resource.data.uid == id
                            && valid(request.resource.data);
      allow delete: if request.auth != null && request.auth.uid == id;
    }
  }
}
```
This means: anyone can search; only the owner browser can create/edit/delete **its own** entry; data shape is validated.

### 7.11 PWA basics
`public/manifest.webmanifest`:
```json
{
  "name": "রক্তদাতা তালিকা",
  "short_name": "রক্তদাতা",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fef2f2",
  "theme_color": "#dc2626",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Add two PNG icons (a red drop works) to `public/`. No service worker needed for MVP.

---

## 8. Deploy to Vercel
```bash
git init && git add . && git commit -m "mvp"
# push to GitHub, then on vercel.com → Add New → Project → import repo
```
1. Add the env vars from §7.3.
2. Deploy.
3. In **Firebase Console → Authentication → Settings → Authorized domains**, add your `*.vercel.app` domain (and custom domain later).
4. In **reCAPTCHA admin**, add the same domain.
5. Run the **mobile test checklist (§4.8)** on a real phone.
6. Turn **App Check → Enforce** on Firestore (and Authentication) once everything works.

---

## 9. Build order (about one weekend)

- [ ] Firebase project + Anonymous Auth + Firestore
- [ ] Next.js app, `layout.tsx` (viewport + Bangla font), `ui.ts`
- [ ] `/join` — save + edit + delete
- [ ] `/` — blood group buttons + list + tap-to-call
- [ ] Security rules
- [ ] District filter + sorting + cooldown badge
- [ ] Native share + URL params
- [ ] Manifest + icons
- [ ] Mobile test checklist (§4.8)
- [ ] Deploy to Vercel, test on 2 real phones
- [ ] App Check enforce
- [ ] Post the launch message in the group

---

## 10. Getting the first 50 entries (the cold-start problem)

An empty directory is useless, so seed it fast:
- Post the link in the group and ask everyone to join once. Pin it.
- Ask members to **change their nickname back** after joining, so the list is the single source of truth.
- If some people won't do it, you can add them yourself with their consent from the Firebase Console (create a doc manually with the same fields), or a one-off script with the Firebase Admin SDK.
- Ask each member to share the link with one outsider donor they trust.

---

## 11. Cost & limits

Firebase Spark (free) and Vercel Hobby are very likely enough for a community of this size, since searches are a single small read per blood group. Check the current free-tier limits on each pricing page before launch, and note Vercel's Hobby plan is meant for non-commercial use, which fits this project. Don't add SMS/OTP without checking pricing first.

---

## 12. Launch message to paste in the group (Bangla)

```
🩸 আমাদের গ্রুপের জন্য রক্তদাতা তালিকা ওয়েবসাইট তৈরি হয়েছে!

এখন আর নিকনেমে ব্লাড গ্রুপ লিখতে হবে না।

✅ রক্ত লাগলে → গ্রুপ বাছাই করুন → সরাসরি কল করুন
✅ দাতা হতে চাইলে → মাত্র ২০ সেকেন্ডে নিজেকে যুক্ত করুন
✅ গ্রুপের বাইরের যে কেউ যুক্ত হতে পারবেন
✅ লগইন লাগবে না, যেকোনো সময় তথ্য বদলানো বা মুছে ফেলা যাবে
📱 মোবাইলে খুলুন, "Add to Home Screen" দিয়ে রেখে দিন

👉 লিংক: https://YOUR-SITE.vercel.app

সবাই একবার করে নিজের তথ্য দিন। আপনার এক মিনিট কারও জীবন বাঁচাতে পারে। 🙏

(নোট: এখানে নাম ও ফোন নম্বর সবাই দেখতে পাবেন। এটি একটি স্বেচ্ছাসেবী তালিকা, রক্ত দেওয়া-নেওয়ার আগে ফোনে নিশ্চিত হয়ে নিন।)
```

---

## 13. Bangla UI text cheat-sheet

| English | Bangla |
|---|---|
| Find donors | রক্তদাতা খুঁজুন |
| Blood group | রক্তের গ্রুপ |
| District / Area | জেলা / এলাকা |
| Name | নাম |
| Mobile number | মোবাইল নম্বর |
| Join as donor | রক্তদাতা হিসেবে যুক্ত হোন |
| Available now | এখন রক্ত দিতে পারি |
| Last donated | সর্বশেষ রক্ত দিয়েছেন |
| Recently donated | সম্প্রতি রক্ত দিয়েছেন |
| Call | কল করুন |
| Share request | শেয়ার করুন |
| Save | সংরক্ষণ করুন |
| Delete my info | আমার তথ্য মুছে ফেলুন |
| No donors found | কোনো দাতা পাওয়া যায়নি |

---

## 14. Quick re-check of your constraints

- **Mobile first?** 360px base design, 48px touch targets, thumb-zone sticky buttons, native keypads/pickers, native share sheet. ✔
- **Minimal steps to enter?** One screen, 5 fields, no login. ✔
- **Minimal steps to find?** 1 tap (group) → 1 tap (reveal number) → call. ✔
- **Outsiders can join?** Yes, just a link. ✔
- **Easy to maintain?** Donors self-manage; you only touch Firebase Console to remove abuse. ✔
- **Small plan / free-tier?** Lightweight Next.js on Vercel + Firestore reads by blood group. ✔
- **Bangla?** All UI strings above, `lang="bn"`, Noto Sans Bengali with relaxed line height. ✔
- **Not feature-bloated?** Only search, join/edit/delete, availability, last-donated, share. Everything else waits for real usage.