# রক্তদাতা তালিকা — Blood Donor Directory

A tiny Bangla, mobile-first blood donor directory. Pick a blood group, find a donor, call
them. Join yourself in one short form — no login, no OTP.

## Run

```bash
cp .env.example .env.local   # fill in the Firebase keys (see below)
npm install
npm run dev                  # http://localhost:3000
npm run build                # production check
npm run lint
npm run test                 # unit tests (pure functions)
```

Firebase keys live in `.env.local` (never committed). See `.env.example` for the required
keys. The Firebase project, Anonymous Auth, App Check and Firestore rules are set up manually
in the Firebase Console — see [`firestore.rules`](./firestore.rules).

## Where everything lives

- **Plan & build order:** [`MVP_IMPLEMENTATION_PLAN.md`](./MVP_IMPLEMENTATION_PLAN.md)
- **Product/design rationale:** [`FEATURE_AND_DEV_GUIDE.md`](./FEATURE_AND_DEV_GUIDE.md)
- `app/` — routes (App Router), `components/` — UI, `lib/` — data & logic.
