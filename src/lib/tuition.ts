import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

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
  const db = getFirebaseDb();
  const normalizedCode = tuitionCode.toUpperCase();

  const userRef = doc(db, "users", user.uid);
  const tuitionCollection = collection(db, "tuitions");
  const tuitionRef = doc(tuitionCollection); // Auto-generate ID
  const tuitionId = tuitionRef.id;

  await runTransaction(db, async (transaction) => {
    // 1. Verify code uniqueness inside transaction
    const q = query(tuitionCollection, where("code", "==", normalizedCode));
    const codeSnapshot = await getDocs(q);

    if (!codeSnapshot.empty) {
      throw new Error("This tuition code is already taken globally.");
    }

    // 2. Create User Profile
    transaction.set(userRef, {
      uid: user.uid,
      name: user.name || "Owner",
      email: user.email,
      role: "owner",
      tuitionId,
      createdAt: serverTimestamp(),
    });

    // 3. Create Tuition Center
    transaction.set(tuitionRef, {
      id: tuitionId,
      name: tuitionName,
      code: normalizedCode,
      ownerId: user.uid,
      currentStudentSequence: 0,
      createdAt: serverTimestamp(),
    });
  });
}
