import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";

/**
 * Core business transaction to enroll a student in a new subject.
 */
export const enrollSubjectHandler = async (data: any, auth: any) => {
  const { studentId, tuitionId, subject, monthlyFee } = data;
  if (!studentId || !tuitionId || !subject || monthlyFee === undefined) {
    throw new functions.https.HttpsError("invalid-argument", "Missing enrollment parameters.");
  }

  const enrollmentRef = db.collection("subject_enrollments").doc();

  return await db.runTransaction(async (transaction) => {
    // 1. Verify student exists
    const studentSnap = await transaction.get(db.collection("students").doc(studentId));
    if (!studentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Student not found.");
    }

    // 2. Verify student is not already actively enrolled in the exact same subject
    const existingSnap = await db.collection("subject_enrollments")
      .where("studentId", "==", studentId)
      .where("subject", "==", subject)
      .where("status", "==", "active")
      .get();

    if (!existingSnap.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        `Student is already actively enrolled in ${subject}.`
      );
    }

    const fullEnrollmentData = {
      id: enrollmentRef.id,
      studentId,
      tuitionId,
      subject,
      monthlyFee: Number(monthlyFee),
      status: "active",
      activateAt: FieldValue.serverTimestamp(),
      deactivateAt: null,
    };

    transaction.set(enrollmentRef, fullEnrollmentData);

    return { id: enrollmentRef.id };
  });
};

/**
 * Subject Enrollments: Securely enrolls a student in a new subject.
 * Validates that the student exists and is not already actively enrolled in the same subject.
 */
export const enrollSubject = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }
  return enrollSubjectHandler(request.data, request.auth);
});
