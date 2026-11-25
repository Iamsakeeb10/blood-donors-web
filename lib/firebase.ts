import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured. Fill in .env.local from .env.example.");
    this.name = "FirebaseNotConfiguredError";
  }
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let dbPromise: Promise<Firestore> | null = null;
let appCheckPromise: Promise<void> | null = null;
let userPromise: Promise<User> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new FirebaseNotConfiguredError();
  }

  app = initializeApp(firebaseConfig);
  return app;
}

/**
 * Firestore is a large module, so it is loaded on demand the first time a donor
 * query runs rather than being part of the home page's first load.
 */
export function getDb(): Promise<Firestore> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = import("firebase/firestore")
    .then(({ getFirestore }) => {
      db = getFirestore(getFirebaseApp());
      return db;
    })
    .catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });

  return dbPromise;
}

/**
 * App Check is loaded lazily (after hydration) so it stays out of the first-load
 * bundle, then protects every Firestore/Auth request that follows.
 */
export function ensureAppCheck(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (appCheckPromise) return appCheckPromise;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return Promise.resolve();

  appCheckPromise = (async () => {
    try {
      if (process.env.NODE_ENV === "development") {
        (
          globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }
        ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
      initializeAppCheck(getFirebaseApp(), {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Already initialised (hot reload) or blocked by an extension. Requests will
      // surface a normal Firestore error if App Check is enforced.
    }
  })();

  return appCheckPromise;
}

/**
 * Resolves the anonymous signed-in user, creating one on first use. The promise is
 * memoised so concurrent callers share one sign-in and no auth listeners leak.
 * Auth is a dynamic import so the home page ships no auth code.
 */
export function ensureUser(): Promise<User> {
  if (typeof window === "undefined") {
    return Promise.reject(new FirebaseNotConfiguredError());
  }
  if (userPromise) return userPromise;

  userPromise = (async () => {
    await ensureAppCheck();
    const { getAuth, signInAnonymously } = await import("firebase/auth");
    const auth = getAuth(getFirebaseApp());
    await auth.authStateReady();
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        return auth.currentUser;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? "";
        const message = (err as { message?: string })?.message ?? "";
        if (
          code === "auth/user-not-found" ||
          code === "auth/user-token-expired" ||
          code === "auth/user-disabled" ||
          code === "auth/invalid-user-token" ||
          message.includes("user-not-found") ||
          message.includes("USER_NOT_FOUND") ||
          message.includes("TOKEN_EXPIRED") ||
          message.includes("USER_DISABLED")
        ) {
          try {
            await auth.signOut();
          } catch {
            // ignore sign out error
          }
          const credential = await signInAnonymously(auth);
          return credential.user;
        }
        return auth.currentUser;
      }
    }
    const credential = await signInAnonymously(auth);
    return credential.user;
  })().catch((error: unknown) => {
    userPromise = null;
    throw error;
  });

  return userPromise;
}

/** Clears the memoised anonymous session so a later page re-authenticates. */
function resetAnonymousUser(): void {
  userPromise = null;
}

/**
 * Admin-only auth helpers. These deliberately do not reuse `ensureUser`, which
 * creates an anonymous account; signing in with email/password replaces it.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  await ensureAppCheck();
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth(getFirebaseApp());
  await auth.authStateReady();
  return auth.currentUser;
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  await ensureAppCheck();
  const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
  const auth = getAuth(getFirebaseApp());
  const credential = await signInWithEmailAndPassword(auth, email, password);
  resetAnonymousUser();
  return credential.user;
}

export async function signOutCurrentUser(): Promise<void> {
  const { getAuth, signOut } = await import("firebase/auth");
  const auth = getAuth(getFirebaseApp());
  await signOut(auth);
  resetAnonymousUser();
}
