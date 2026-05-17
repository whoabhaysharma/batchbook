import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";

/**
 * Students: Creates a new student with a unique roll number.
 */
export const createStudent = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { tuitionId, studentData } = request.data;
  if (!tuitionId || !studentData) {
    throw new functions.https.HttpsError("invalid-argument", "Missing data.");
  }

  const tuitionRef = db.collection("tuitions").doc(tuitionId);
  const studentRef = db.collection("students").doc();

  try {
    return await db.runTransaction(async (transaction) => {
      const tuitionSnap = await transaction.get(tuitionRef);
      if (!tuitionSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Tuition not found.");
      }

      const tuitionData = tuitionSnap.data()!;
      const nextSeq = (tuitionData.currentStudentSequence || 0) + 1;
      const tuitionCode = tuitionData.code;

      const rollNumber = `${tuitionCode}${nextSeq.toString().padStart(3, "0")}`;

      const fullStudentData = {
        ...studentData,
        id: studentRef.id,
        tuitionId,
        rollNumber,
        rollSeq: nextSeq,
        createdAt: FieldValue.serverTimestamp(),
      };

      // Update sequence in tuition
      transaction.update(tuitionRef, { currentStudentSequence: nextSeq });

      // Save student
      transaction.set(studentRef, fullStudentData);

      return fullStudentData;
    });
  } catch (error: any) {
    console.error("CreateStudent Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Failed to create student.");
  }
});
