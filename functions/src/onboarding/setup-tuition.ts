import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";

/**
 * Onboarding: Sets up user profile and their tuition center.
 */
export const setupTuition = functions.https.onCall({ cors: true }, async (request) => {
  console.log("🚀 setupTuition called with data:", JSON.stringify(request.data));
  console.log("👤 Auth context:", request.auth ? `UID: ${request.auth.uid}` : "NO AUTH");

  // Check if user is authenticated
  if (!request.auth) {
    console.warn("❌ Unauthenticated access attempt");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in."
    );
  }


  const { tuitionName, tuitionCode, userName } = request.data;
  const uid = request.auth.uid;
  const email = request.auth.token.email;

  if (!tuitionName || !tuitionCode || tuitionCode.length !== 3) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid tuition name or code."
    );
  }

  const normalizedCode = tuitionCode.toUpperCase();
  const userRef = db.collection("users").doc(uid);
  const tuitionRef = db.collection("tuitions").doc();
  const tuitionId = tuitionRef.id;

  try {
    return await db.runTransaction(async (transaction) => {
      // 1. Verify code uniqueness
      const codeQuery = db
        .collection("tuitions")
        .where("code", "==", normalizedCode)
        .limit(1);
      const codeSnapshot = await transaction.get(codeQuery);

      if (!codeSnapshot.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "This tuition code is already taken globally."
        );
      }

      // 2. Create User Profile
      transaction.set(userRef, {
        uid,
        name: userName || "Owner",
        email,
        role: "owner",
        tuitionId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 3. Create Tuition Center
      transaction.set(tuitionRef, {
        id: tuitionId,
        name: tuitionName,
        code: normalizedCode,
        ownerId: uid,
        currentStudentSequence: 0,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { success: true, tuitionId };
    });
  } catch (error: any) {
    console.error("SetupTuition Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Failed to setup tuition.");
  }
});
