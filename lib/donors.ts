import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import type { BloodGroup, Donor } from "./data";
import { isBloodGroup, sortDonors } from "./data";
import { PAGE_SIZE } from "./config";
import { getDb } from "./firebase";
import { M } from "./messages";
import type { DonorInput } from "./validation";

export type DonorErrorCode =
  | "permission-denied"
  | "unavailable"
  | "unauthenticated"
  | "resource-exhausted"
  | "unknown";

export class DonorError extends Error {
  readonly code: DonorErrorCode;

  constructor(code: DonorErrorCode, message: string) {
    super(message);
    this.name = "DonorError";
    this.code = code;
  }
}

const codeMessages: Record<DonorErrorCode, string> = {
  "permission-denied": M.errors.permissionDenied,
  unavailable: M.errors.offline,
  unauthenticated: M.errors.authFailed,
  "resource-exhausted": M.errors.busy,
  unknown: M.errors.loadFailed,
};

function normalizeErrorCode(error: unknown): DonorErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    const raw = (error as { code: unknown }).code;
    if (typeof raw === "string") {
      const code = raw.includes("/") ? raw.split("/").pop() : raw;
      if (
        code === "permission-denied" ||
        code === "unavailable" ||
        code === "unauthenticated" ||
        code === "resource-exhausted"
      ) {
        return code;
      }
    }
  }
  return "unknown";
}

function toDonorError(error: unknown, fallback: string): DonorError {
  const code = normalizeErrorCode(error);
  return new DonorError(code, code === "unknown" ? fallback : codeMessages[code]);
}

function toDonor(id: string, data: DocumentData): Donor | null {
  if (!isBloodGroup(data.bloodGroup)) return null;

  return {
    uid: typeof data.uid === "string" && data.uid ? data.uid : id,
    name: typeof data.name === "string" ? data.name : "",
    bloodGroup: data.bloodGroup,
    phone: typeof data.phone === "string" ? data.phone : "",
    district: typeof data.district === "string" ? data.district : "",
    area: typeof data.area === "string" && data.area ? data.area : undefined,
    available: data.available === true,
    lastDonated: typeof data.lastDonated === "string" ? data.lastDonated : null,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

type FirestoreApi = typeof import("firebase/firestore");

let firestoreApi: Promise<FirestoreApi> | null = null;

function getFirestoreApi(): Promise<FirestoreApi> {
  if (!firestoreApi) firestoreApi = import("firebase/firestore");
  return firestoreApi;
}

export type DonorPageCursor = {
  phase: "available" | "unavailable";
  last: QueryDocumentSnapshot | null;
};

export type DonorPage = {
  donors: Donor[];
  /** null when there is nothing more to load. */
  next: DonorPageCursor | null;
};

/**
 * Pages donors with Firestore cursors. Available donors come first, then the rest.
 * Only equality filters + the default document-id order are used, so no composite
 * index is needed. Each page costs at most PAGE_SIZE reads.
 */
export async function fetchDonorPage(
  bloodGroup: BloodGroup,
  district: string | undefined,
  cursor: DonorPageCursor | null,
): Promise<DonorPage> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const ref = fs.collection(db, "donors");
    let phase: DonorPageCursor["phase"] = cursor?.phase ?? "available";
    let last = cursor?.last ?? null;
    const donors: Donor[] = [];

    while (donors.length < PAGE_SIZE) {
      const remaining = PAGE_SIZE - donors.length;
      const constraints = [
        fs.where("bloodGroup", "==", bloodGroup),
        ...(district ? [fs.where("district", "==", district)] : []),
        fs.where("available", "==", phase === "available"),
        ...(last ? [fs.startAfter(last)] : []),
        fs.limit(remaining),
      ];
      const snapshot = await fs.getDocs(fs.query(ref, ...constraints));

      for (const entry of snapshot.docs) {
        const donor = toDonor(entry.id, entry.data());
        if (donor) donors.push(donor);
      }

      if (snapshot.size < remaining) {
        if (phase === "available") {
          phase = "unavailable";
          last = null;
          continue;
        }
        return { donors: sortDonors(donors), next: null };
      }
      last = snapshot.docs[snapshot.docs.length - 1];
    }

    return { donors: sortDonors(donors), next: { phase, last } };
  } catch (error) {
    throw toDonorError(error, M.errors.loadFailed);
  }
}

export async function getMyDonor(uid: string): Promise<Donor | null> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const snapshot = await fs.getDoc(fs.doc(db, "donors", uid));
    if (!snapshot.exists()) return null;
    return toDonor(snapshot.id, snapshot.data());
  } catch (error) {
    throw toDonorError(error, M.errors.loadFailed);
  }
}

export async function saveMyDonor(
  uid: string,
  input: DonorInput,
  createdAt?: number,
): Promise<Donor> {
  const now = Date.now();
  const donor: Donor = {
    uid,
    name: input.name,
    bloodGroup: input.bloodGroup,
    phone: input.phone,
    district: input.district,
    available: input.available,
    lastDonated: input.lastDonated,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
  if (input.area) donor.area = input.area;

  const payload: Record<string, unknown> = { ...donor };
  if (!input.lastDonated) delete payload.lastDonated;
  if (!input.area) delete payload.area;

  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    await fs.setDoc(fs.doc(db, "donors", uid), payload);
    return donor;
  } catch (error) {
    throw toDonorError(error, M.errors.saveFailed);
  }
}

export async function deleteMyDonor(uid: string): Promise<void> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    await fs.deleteDoc(fs.doc(db, "donors", uid));
  } catch (error) {
    throw toDonorError(error, M.errors.deleteFailed);
  }
}

export async function findDonorsByPhone(phone: string): Promise<Donor[]> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const snapshot = await fs.getDocs(
      fs.query(
        fs.collection(db, "donors"),
        fs.where("phone", "==", phone),
        fs.limit(5),
      ),
    );
    return snapshot.docs
      .map((entry) => toDonor(entry.id, entry.data()))
      .filter((donor): donor is Donor => donor !== null);
  } catch (error) {
    throw toDonorError(error, M.errors.loadFailed);
  }
}

/** A donor plus the Firestore document id, which may differ from `uid` for legacy rows. */
export type AdminDonor = Donor & { docId: string };

function toAdminDonor(id: string, data: DocumentData): AdminDonor | null {
  const donor = toDonor(id, data);
  return donor ? { ...donor, docId: id } : null;
}

/** Checks the admins/{uid} marker managed from the Firebase Console. */
export async function isAdminUser(uid: string): Promise<boolean> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const snapshot = await fs.getDoc(fs.doc(db, "admins", uid));
    return snapshot.exists();
  } catch (error) {
    throw toDonorError(error, M.errors.loadFailed);
  }
}

/**
 * Loads every donor for the admin table. The collection is small for this app;
 * if it grows, replace this with cursor pagination plus a count aggregation.
 */
export async function listAllDonors(): Promise<AdminDonor[]> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const snapshot = await fs.getDocs(fs.collection(db, "donors"));
    return snapshot.docs
      .map((entry) => toAdminDonor(entry.id, entry.data()))
      .filter((donor): donor is AdminDonor => donor !== null);
  } catch (error) {
    throw toDonorError(error, M.errors.loadFailed);
  }
}

export async function adminSaveDonor(
  input: DonorInput,
  existing: AdminDonor | null,
): Promise<AdminDonor> {
  const now = Date.now();
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const ref = existing
      ? fs.doc(db, "donors", existing.docId)
      : fs.doc(fs.collection(db, "donors"));
    const donor: Donor = {
      uid: existing ? existing.uid : ref.id,
      name: input.name,
      bloodGroup: input.bloodGroup,
      phone: input.phone,
      district: input.district,
      available: input.available,
      lastDonated: input.lastDonated,
      createdAt: existing && existing.createdAt > 0 ? existing.createdAt : now,
      updatedAt: now,
    };
    if (input.area) donor.area = input.area;

    const payload: Record<string, unknown> = { ...donor };
    if (!input.lastDonated) delete payload.lastDonated;
    if (!input.area) delete payload.area;

    await fs.setDoc(ref, payload);
    return { ...donor, docId: ref.id };
  } catch (error) {
    throw toDonorError(error, M.errors.saveFailed);
  }
}

export async function adminDeleteDonor(docId: string): Promise<void> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    await fs.deleteDoc(fs.doc(db, "donors", docId));
  } catch (error) {
    throw toDonorError(error, M.errors.deleteFailed);
  }
}
