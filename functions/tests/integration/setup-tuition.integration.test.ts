import { db } from "../../src/admin";
import fft from "firebase-functions-test";
import { setupTuition } from "../../src/onboarding/setup-tuition";

const testEnv = fft();
const isEmulatorRunning = process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (!isEmulatorRunning) {
  describe("Onboarding: Setup Tuition Integration Tests", () => {
    it("Skipped integration tests (no local Firestore emulator detected)", () => {
      console.warn("⚠️ Skipping Integration Tests: FIRESTORE_EMULATOR_HOST is not defined.");
    });
  });
} else {
  describe("Onboarding: Setup Tuition Integration Tests", () => {
    const wrappedSetupTuition = testEnv.wrap(setupTuition);

    beforeEach(async () => {
      // Clean up tuitions and users
      const tuitionsSnap = await db.collection("tuitions").get();
      const tuitionsBatch = db.batch();
      tuitionsSnap.docs.forEach((doc) => tuitionsBatch.delete(doc.ref));
      await tuitionsBatch.commit();

      const usersSnap = await db.collection("users").get();
      const usersBatch = db.batch();
      usersSnap.docs.forEach((doc) => usersBatch.delete(doc.ref));
      await usersBatch.commit();
    });

    afterAll(() => {
      testEnv.cleanup();
    });

    it("should fail if user is unauthenticated", async () => {
      await expect(
        wrappedSetupTuition({
          data: { tuitionName: "Test Tuition", tuitionCode: "TST", userName: "Admin" },
        } as any)
      ).rejects.toThrow("User must be logged in.");
    });

    it("should fail if tuition code is invalid", async () => {
      await expect(
        wrappedSetupTuition({
          auth: { uid: "test_uid", token: { email: "test@example.com" } as any },
          data: { tuitionName: "Test Tuition", tuitionCode: "TS", userName: "Admin" }, // Length 2
        } as any)
      ).rejects.toThrow("Invalid tuition name or code.");
    });

    it("should successfully setup a tuition and create user profile", async () => {
      const result = await wrappedSetupTuition({
        auth: { uid: "test_uid", token: { email: "test@example.com" } as any },
        data: { tuitionName: "Test Tuition", tuitionCode: "TST", userName: "Admin" },
      } as any);

      expect(result.success).toBe(true);
      expect(result.tuitionId).toBeDefined();

      // Verify Tuition Center creation
      const tuitionDoc = await db.collection("tuitions").doc(result.tuitionId).get();
      expect(tuitionDoc.exists).toBe(true);
      expect(tuitionDoc.data()?.name).toBe("Test Tuition");
      expect(tuitionDoc.data()?.code).toBe("TST");
      expect(tuitionDoc.data()?.ownerId).toBe("test_uid");

      // Verify User Profile creation
      const userDoc = await db.collection("users").doc("test_uid").get();
      expect(userDoc.exists).toBe(true);
      expect(userDoc.data()?.name).toBe("Admin");
      expect(userDoc.data()?.role).toBe("owner");
      expect(userDoc.data()?.tuitionId).toBe(result.tuitionId);
    });

    it("should fail if tuition code already exists globally", async () => {
      // First setup
      await wrappedSetupTuition({
        auth: { uid: "test_uid_1", token: { email: "test1@example.com" } as any },
        data: { tuitionName: "First Tuition", tuitionCode: "DUP", userName: "Admin 1" },
      } as any);

      // Second setup with same code
      await expect(
        wrappedSetupTuition({
          auth: { uid: "test_uid_2", token: { email: "test2@example.com" } as any },
          data: { tuitionName: "Second Tuition", tuitionCode: "DUP", userName: "Admin 2" },
        } as any)
      ).rejects.toThrow("This tuition code is already taken globally.");
    });
  });
}
