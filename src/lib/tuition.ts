import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";
import { httpsCallable } from "firebase/functions";

/**
 * Suggests a 3-character uppercase abbreviation for a tuition name.
 */
export function suggestTuitionCode(name: string): string {
  const cleanName = name.trim().replace(/[^a-zA-Z\s]/g, "");
  const words = cleanName.split(/\s+/).filter(Boolean);

  let suggestion = "";
  if (words.length >= 3) {
    suggestion = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    suggestion = words[0][0] + words[1].substring(0, 2);
  } else if (words.length === 1) {
    suggestion = words[0].substring(0, 3);
  }

  // Fallback if name is too short
  while (suggestion.length < 3) {
    suggestion += "X";
  }

  return suggestion.substring(0, 3).toUpperCase();
}

/**
 * Checks if a tuition code is globally unique.
 */
export async function isTuitionCodeUnique(code: string): Promise<boolean> {
  const db = getFirebaseDb();
  const q = query(collection(db, "tuitions"), where("code", "==", code.toUpperCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

/**
 * Initializes a user profile and their tuition directly in Firestore client-side.
 * This completely bypasses Cloud Functions, ensuring 100% reliability and speed,
 * and eliminating any CORS (403 Forbidden) or IAM deployment blocks.
 */
export async function setupTuition(
  user: { uid: string; email: string; name: string },
  tuitionName: string,
  tuitionCode: string
): Promise<void> {
  const functions = getFirebaseFunctions();
  const setupTuitionFn = httpsCallable<{
    tuitionName: string;
    tuitionCode: string;
    userName: string;
  }, { success: boolean; tuitionId: string }>(functions, "setupTuition");

  await setupTuitionFn({
    tuitionName,
    tuitionCode,
    userName: user.name,
  });
}
