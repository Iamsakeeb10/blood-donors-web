import type { DocumentData } from "firebase/firestore";
import type { BloodGroup, Donor } from "./data";
import { isBloodGroup, sortDonors } from "./data";
import { SEARCH_LIMIT } from "./config";
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

export type DonorQueryResult = { donors: Donor[]; truncated: boolean };

export async function queryDonors(
  bloodGroup: BloodGroup,
  district?: string,
): Promise<DonorQueryResult> {
  try {
    const [fs, db] = await Promise.all([getFirestoreApi(), getDb()]);
    const ref = fs.collection(db, "donors");
    const snapshot = district
      ? await fs.getDocs(
          fs.query(
            ref,
            fs.where("bloodGroup", "==", bloodGroup),
            fs.where("district", "==", district),
            fs.limit(SEARCH_LIMIT),
          ),
        )
      : await fs.getDocs(
          fs.query(
            ref,
            fs.where("bloodGroup", "==", bloodGroup),
            fs.limit(SEARCH_LIMIT),
          ),
        );

    const donors = snapshot.docs
      .map((entry) => toDonor(entry.id, entry.data()))
      .filter((donor): donor is Donor => donor !== null);

    return { donors: sortDonors(donors), truncated: snapshot.size >= SEARCH_LIMIT };
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
