import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../admin";

/**
 * Triggered automatically when a new student document is created.
 * Generates a memorable, unique roll number based on the tuition's abbreviation
 * and an incrementing sequence number.
 */
export const onStudentCreate = onDocumentCreated("students/{studentId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No student data found in event.");
    return;
  }

  const studentData = snapshot.data();
  const studentId = event.params.studentId;
  const tuitionId = studentData.tuitionId;

  // If the student already has a valid roll number, do not overwrite it
  if (studentData.rollNumber && studentData.rollNumber !== "PENDING ID") {
    console.log(`Student ${studentId} already has roll number: ${studentData.rollNumber}`);
    return;
  }

  if (!tuitionId) {
    console.error(`Student ${studentId} is missing tuitionId.`);
    return;
  }

  const tuitionRef = db.collection("tuitions").doc(tuitionId);
  const studentRef = db.collection("students").doc(studentId);

  try {
    await db.runTransaction(async (transaction) => {
      const tuitionSnap = await transaction.get(tuitionRef);
      if (!tuitionSnap.exists) {
        throw new Error(`Tuition ${tuitionId} not found.`);
      }

      const tuitionData = tuitionSnap.data()!;
      const tuitionName = tuitionData.name || "Tuition";
      
      // Calculate tuition code/abbreviation
      let tuitionCode = tuitionData.code;
      if (!tuitionCode) {
        // Fallback: Generate abbreviation from tuition name (e.g. "Aura Academy" -> "AA")
        tuitionCode = tuitionName
          .split(" ")
          .map((word: string) => word.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 3); // max 3 characters
      }
      
      if (!tuitionCode) {
        tuitionCode = "BB"; // Default fallback
      }

      const nextSeq = (tuitionData.currentStudentSequence || 0) + 1;
      const rollNumber = `${tuitionCode}-${nextSeq.toString().padStart(3, "0")}`;

      // Update sequence in tuition document
      transaction.update(tuitionRef, { currentStudentSequence: nextSeq });

      // Update roll number in student document
      transaction.update(studentRef, {
        rollNumber,
        rollSeq: nextSeq,
      });

      console.log(`Generated roll number ${rollNumber} for student ${studentId} (Seq: ${nextSeq})`);
    });
  } catch (error) {
    console.error(`Failed to generate roll number for student ${studentId}:`, error);
  }
});
