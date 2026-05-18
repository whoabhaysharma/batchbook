import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";

/**
 * Core business transaction to deactivate an active subject enrollment.
 */
export const deactivateSubjectHandler = async (data: any, auth: any) => {
  const { enrollmentId } = data;
  if (!enrollmentId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing enrollmentId.");
  }

  const docRef = db.collection("subject_enrollments").doc(enrollmentId);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Subject enrollment not found.");
    }

    const docData = snap.data()!;
    if (docData.status === "inactive") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This subject enrollment is already deactivated and cannot be modified."
      );
    }

    transaction.update(docRef, {
      status: "inactive",
      deactivateAt: FieldValue.serverTimestamp(),
    });

    return { id: enrollmentId, status: "inactive" };
  });
};

/**
 * Subject Enrollments: Deactivates an active subject enrollment.
 * Once deactivated, it cannot be reactivated.
 */
export const deactivateSubject = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }
  return deactivateSubjectHandler(request.data, request.auth);
});

/**
 * Firestore Trigger: Guarantees that once a subject enrollment status is 'inactive',
 * it cannot be changed back to 'active'.
 */
export const preventSubjectReactivation = functions.firestore.onDocumentUpdated("subject_enrollments/{enrollmentId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  // Reactivation check: if it was inactive and someone attempts to mark it as active again, force it back
  if (beforeData.status === "inactive" && afterData.status === "active") {
    console.warn(`Prevented forbidden attempt to reactivate subject enrollment ${event.params.enrollmentId}`);
    await event.data?.after.ref.update({
      status: "inactive",
    });
  }
});
