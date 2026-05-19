import { db } from "../../src/admin";
import fft from "firebase-functions-test";
import { createStudent } from "../../src/students/create-student";
import { enrollSubject } from "../../src/students/enroll-subject";
import { deactivateSubject } from "../../src/students/deactivate-subject";

const testEnv = fft();
const isEmulatorRunning = process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (!isEmulatorRunning) {
  describe("Students Integration Tests", () => {
    it("Skipped integration tests (no local Firestore emulator detected)", () => {
      console.warn("⚠️ Skipping Integration Tests: FIRESTORE_EMULATOR_HOST is not defined.");
    });
  });
} else {
  describe("Students Integration Tests", () => {
    const wrappedCreateStudent = testEnv.wrap(createStudent);
    const wrappedEnrollSubject = testEnv.wrap(enrollSubject);
    const wrappedDeactivateSubject = testEnv.wrap(deactivateSubject);

    const tuitionId = "test_tuition_student_integration";
    const tuitionCode = "ABC";
    
    beforeAll(async () => {
      // Create a test tuition center
      await db.collection("tuitions").doc(tuitionId).set({
        id: tuitionId,
        name: "Student Integration Tuition",
        code: tuitionCode,
        currentStudentSequence: 0
      });
    });

    beforeEach(async () => {
      // Clean up students and enrollments
      const studentsSnap = await db.collection("students").get();
      const studentsBatch = db.batch();
      studentsSnap.docs.forEach(doc => studentsBatch.delete(doc.ref));
      await studentsBatch.commit();

      const enrollmentsSnap = await db.collection("subject_enrollments").get();
      const enrollmentsBatch = db.batch();
      enrollmentsSnap.docs.forEach(doc => enrollmentsBatch.delete(doc.ref));
      await enrollmentsBatch.commit();

      // Reset tuition sequence
      await db.collection("tuitions").doc(tuitionId).update({
        currentStudentSequence: 0
      });
    });

    afterAll(async () => {
      // Clean up the tuition
      await db.collection("tuitions").doc(tuitionId).delete();
      testEnv.cleanup();
    });

    describe("1. createStudent", () => {
      it("should create a student with a unique roll number", async () => {
        const studentData = { name: "Test Student", grade: "10" };

        const result = await wrappedCreateStudent({
          auth: { uid: "test_admin", token: {} as any },
          data: { tuitionId, studentData }
        } as any);

        expect(result.id).toBeDefined();
        expect(result.rollNumber).toBe("ABC001");
        expect(result.rollSeq).toBe(1);

        const tuitionDoc = await db.collection("tuitions").doc(tuitionId).get();
        expect(tuitionDoc.data()?.currentStudentSequence).toBe(1);

        const studentDoc = await db.collection("students").doc(result.id).get();
        expect(studentDoc.exists).toBe(true);
        expect(studentDoc.data()?.rollNumber).toBe("ABC001");
        expect(studentDoc.data()?.name).toBe("Test Student");
      });

      it("should increment the roll number sequence for multiple students", async () => {
        const student1 = await wrappedCreateStudent({
          auth: { uid: "test_admin", token: {} as any },
          data: { tuitionId, studentData: { name: "Student 1" } }
        } as any);
        
        const student2 = await wrappedCreateStudent({
          auth: { uid: "test_admin", token: {} as any },
          data: { tuitionId, studentData: { name: "Student 2" } }
        } as any);

        expect(student1.rollNumber).toBe("ABC001");
        expect(student2.rollNumber).toBe("ABC002");
      });

      it("should fail if unauthenticated", async () => {
        await expect(
          wrappedCreateStudent({ data: { tuitionId, studentData: {} } } as any)
        ).rejects.toThrow("User must be logged in.");
      });
    });

    describe("2. enrollSubject & deactivateSubject", () => {
      let studentId: string;

      beforeEach(async () => {
        const result = await wrappedCreateStudent({
          auth: { uid: "test_admin", token: {} as any },
          data: { tuitionId, studentData: { name: "Test Student" } }
        } as any);
        studentId = result.id;
      });

      it("should successfully enroll a student in a subject", async () => {
        const result = await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "Math", monthlyFee: 1000 }
        } as any);

        expect(result.id).toBeDefined();

        const enrollmentDoc = await db.collection("subject_enrollments").doc(result.id).get();
        expect(enrollmentDoc.exists).toBe(true);
        expect(enrollmentDoc.data()?.status).toBe("active");
        expect(enrollmentDoc.data()?.subject).toBe("Math");
        expect(enrollmentDoc.data()?.monthlyFee).toBe(1000);
      });

      it("should prevent duplicate active enrollments in the same subject", async () => {
        await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "Science", monthlyFee: 1200 }
        } as any);

        await expect(
          wrappedEnrollSubject({
            auth: { uid: "test_admin", token: {} as any },
            data: { studentId, tuitionId, subject: "Science", monthlyFee: 1500 }
          } as any)
        ).rejects.toThrow("Student is already actively enrolled in Science.");
      });

      it("should successfully deactivate an active enrollment", async () => {
        const enrollResult = await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "History", monthlyFee: 800 }
        } as any);

        const deactivateResult = await wrappedDeactivateSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { enrollmentId: enrollResult.id }
        } as any);

        expect(deactivateResult.status).toBe("inactive");

        const enrollmentDoc = await db.collection("subject_enrollments").doc(enrollResult.id).get();
        expect(enrollmentDoc.data()?.status).toBe("inactive");
        expect(enrollmentDoc.data()?.deactivateAt).toBeDefined();
      });

      it("should prevent deactivating an already inactive enrollment", async () => {
        const enrollResult = await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "Geography", monthlyFee: 800 }
        } as any);

        // First deactivation
        await wrappedDeactivateSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { enrollmentId: enrollResult.id }
        } as any);

        // Second deactivation
        await expect(
          wrappedDeactivateSubject({
            auth: { uid: "test_admin", token: {} as any },
            data: { enrollmentId: enrollResult.id }
          } as any)
        ).rejects.toThrow("This subject enrollment is already deactivated and cannot be modified.");
      });
      
      it("should allow enrolling in the same subject after previous is deactivated", async () => {
        const enrollResult1 = await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "English", monthlyFee: 500 }
        } as any);

        await wrappedDeactivateSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { enrollmentId: enrollResult1.id }
        } as any);

        // Should succeed because previous one is inactive
        const enrollResult2 = await wrappedEnrollSubject({
          auth: { uid: "test_admin", token: {} as any },
          data: { studentId, tuitionId, subject: "English", monthlyFee: 600 }
        } as any);

        expect(enrollResult2.id).toBeDefined();
        expect(enrollResult2.id).not.toBe(enrollResult1.id);
      });
    });
  });
}
