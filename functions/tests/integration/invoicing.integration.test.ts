/**
 * Full Lifecycle Integration Test Suite
 * 
 * Tests the complete BatchBook application flow inside the database (or emulator):
 * 1. Creates a new active Student profile in Firestore.
 * 2. Assigns multiple active Subject Enrollments with monthly fees.
 * 3. Simulates the automated sweep cycle to generate a monthly Invoice.
 * 4. Triggers a transaction to apply a partial payment and verify FIFO balances.
 * 5. Triggers a transaction to apply an overpayment and verify future-invoice pre-billing.
 * 
 * Safe Execution Guard:
 *   If the local Firestore emulator is not running, the test suite prints a warning
 *   and skips execution to prevent authentication credential crashes.
 * 
 * Running options:
 *   - Start emulators: npm run emulators
 *   - Run tests: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:backend
 */

import { db } from "../../src/admin";
import { enrollSubjectHandler } from "../../src/students/enroll-subject";
import { deactivateSubjectHandler } from "../../src/students/deactivate-subject";
import { getKolkataBillingPeriod, getActiveEnrollments } from "../../src/invoicing/invoicing-utils";
import { 
  buildInvoicePayload, 
  sortInvoicesFIFO, 
  applyPaymentToInvoice, 
  nextBillingPeriod, 
  isStudentBillableForPeriod,
  fetchLatestBillingPeriod
} from "../../src/invoicing/payment-helpers";

const isEmulatorRunning = process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (!isEmulatorRunning) {
  describe("BatchBook Billing & Payment Full Lifecycle Integration Flow", () => {
    it("Skipped integration tests (no local Firestore emulator detected)", () => {
      console.warn(
        "⚠️  Skipping Integration Tests: FIRESTORE_EMULATOR_HOST is not defined.\n" +
        "   To run full database lifecycle integration tests, start the emulators and run:\n" +
        "   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:backend"
      );
    });
  });
} else {
  describe("BatchBook Billing & Payment Full Lifecycle Integration Flow", () => {
    const studentId = "integration_test_student_999";
    const tuitionId = "integration_test_tuition_777";
    
    // Clean up any old integration test records before starting
    beforeAll(async () => {
      const studentRef = db.collection("students").doc(studentId);
      await studentRef.delete();

      // Remove subject enrollments
      const enrollmentsSnap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();
      const enrollmentsBatch = db.batch();
      enrollmentsSnap.docs.forEach(doc => enrollmentsBatch.delete(doc.ref));
      await enrollmentsBatch.commit();

      // Remove invoices
      const invoicesSnap = await db.collection("invoice")
        .where("studentId", "==", studentId)
        .get();
      const invoicesBatch = db.batch();
      invoicesSnap.docs.forEach(doc => invoicesBatch.delete(doc.ref));
      await invoicesBatch.commit();

      // Remove payment receipts
      const paymentsSnap = await db.collection("payments")
        .where("studentId", "==", studentId)
        .get();
      const paymentsBatch = db.batch();
      paymentsSnap.docs.forEach(doc => paymentsBatch.delete(doc.ref));
      await paymentsBatch.commit();
    });

    it("Step 1: Successfully creates a new active Student profile in the database", async () => {
      const studentRef = db.collection("students").doc(studentId);
      const newStudent = {
        name: "John Doe (Integration Test)",
        status: "active",
        billingDay: 10,
        billingActiveFrom: "2026-05",
        tuitionId,
        createdAt: new Date().toISOString()
      };

      await studentRef.set(newStudent);

      const docSnap = await studentRef.get();
      expect(docSnap.exists).toBe(true);
      expect(docSnap.data()?.name).toBe("John Doe (Integration Test)");
      expect(docSnap.data()?.status).toBe("active");
    });

    it("Step 2: Assigns active Subject Enrollments to the student profile", async () => {
      // 1. Enroll Mathematics using our secure Cloud Function!
      const mathResult = await enrollSubjectHandler({
        studentId,
        tuitionId,
        subject: "Mathematics",
        monthlyFee: 2000
      }, { uid: "test_admin", token: {} } as any);
      expect(mathResult.id).toBeDefined();

      // 2. Enroll Physics using our secure Cloud Function!
      const physicsResult = await enrollSubjectHandler({
        studentId,
        tuitionId,
        subject: "Physics",
        monthlyFee: 1500
      }, { uid: "test_admin", token: {} } as any);
      expect(physicsResult.id).toBeDefined();

      // 3. Enroll Chemistry using our secure Cloud Function!
      const chemistryResult = await enrollSubjectHandler({
        studentId,
        tuitionId,
        subject: "Chemistry",
        monthlyFee: 1200
      }, { uid: "test_admin", token: {} } as any);
      expect(chemistryResult.id).toBeDefined();

      // 4. Deactivate Chemistry using our secure Cloud Function!
      await deactivateSubjectHandler({
        enrollmentId: chemistryResult.id
      }, { uid: "test_admin", token: {} } as any);

      const snap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();

      expect(snap.size).toBe(3);
      const activeCount = snap.docs.filter(doc => doc.data().status === "active").length;
      expect(activeCount).toBe(2);
    });

    it("Step 3: Simulates the Automated Billing Sweep (generates initial monthly invoice)", async () => {
      // 1. Fetch student and enrollments
      const studentSnap = await db.collection("students").doc(studentId).get();
      const studentData = studentSnap.data()!;

      const enrollmentsSnap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();
      const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Determine Kolkata billing day eligibility
      const mockToday = new Date("2026-05-18T10:00:00Z"); // Day 18 in Kolkata timezone
      const { billingPeriod, year, month } = getKolkataBillingPeriod(mockToday);
      
      expect(billingPeriod).toBe("2026-05");
      expect(isStudentBillableForPeriod(studentData, billingPeriod)).toBe(true);

      const billingDay = studentData.billingDay || 1;
      const dueDate = new Date(year, month - 1, billingDay);

      // 3. Resolve active enrollments and build payload
      const activeEnrollments = getActiveEnrollments(enrollments, dueDate.getTime());
      expect(activeEnrollments.length).toBe(2); // Mathematics & Physics

      const payload = buildInvoicePayload(
        studentId,
        tuitionId,
        billingPeriod,
        billingDay,
        year,
        month,
        activeEnrollments
      );

      expect(payload).not.toBeNull();
      if (payload) {
        expect(payload.amount).toBe(3500); // 2000 Maths + 1500 Physics

        // 4. Save generated invoice
        const invoiceId = `${studentId}_${billingPeriod}`;
        await db.collection("invoice").doc(invoiceId).set({
          ...payload,
          createdAt: new Date()
        });

        const invoiceSnap = await db.collection("invoice").doc(invoiceId).get();
        expect(invoiceSnap.exists).toBe(true);
        expect(invoiceSnap.data()?.amount).toBe(3500);
        expect(invoiceSnap.data()?.status).toBe("pending");
      }
    });

    it("Step 4: Executes a transactional FIFO payment (partial receipt of ₹1500)", async () => {
      const paymentAmount = 1500;

      await db.runTransaction(async (transaction) => {
        // 1. Fetch unpaid invoices for student
        const querySnap = await db.collection("invoice")
          .where("studentId", "==", studentId)
          .where("status", "in", ["pending", "partial"])
          .get();

        const unpaidInvoices = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        expect(unpaidInvoices.length).toBe(1);

        // 2. Allocate payment chronologically (FIFO)
        const sorted = sortInvoicesFIFO(unpaidInvoices);
        let remaining = paymentAmount;

        for (const invoice of sorted) {
          if (remaining <= 0) break;

          const owed = invoice.amount - (invoice.paidAmount || 0);
          const applyAmount = Math.min(remaining, owed);

          applyPaymentToInvoice(transaction, invoice, applyAmount, "Partial payment verification");
          remaining -= applyAmount;
        }

        expect(remaining).toBe(0); // Fully allocated
      });

      // Verify invoice update in the database
      const invoiceId = `${studentId}_2026-05`;
      const invoiceSnap = await db.collection("invoice").doc(invoiceId).get();
      
      expect(invoiceSnap.data()?.paidAmount).toBe(1500);
      expect(invoiceSnap.data()?.remainingAmount).toBe(2000);
      expect(invoiceSnap.data()?.status).toBe("partial");
    });

    it("Step 5: Executes a transactional overpayment (₹5000) with future roll-forward prepayments", async () => {
      // Remaining balance for 2026-05 invoice is ₹2000.
      // Paying ₹5000 will settle 2026-05 (₹2000) and leave an overpayment of ₹3000.
      // The overpayment of ₹3000 will roll forward to June 2026 (₹3500 total fee, partial paid ₹3000).
      const paymentAmount = 5000;

      await db.runTransaction(async (transaction) => {
        // 1. Fetch student and enrollments
        const studentSnap = await transaction.get(db.collection("students").doc(studentId));
        const studentData = studentSnap.data()!;

        const enrollmentsSnap = await db.collection("subject_enrollments")
          .where("studentId", "==", studentId)
          .get();
        const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch locked unpaid invoices
        const querySnap = await db.collection("invoice")
          .where("studentId", "==", studentId)
          .where("status", "in", ["pending", "partial"])
          .get();

        const unpaidInvoices: any[] = [];
        for (const doc of querySnap.docs) {
          const lockedDoc = await transaction.get(doc.ref);
          unpaidInvoices.push({ id: lockedDoc.id, ...lockedDoc.data() });
        }

        // 3. FIFO Allocation on current outstanding invoice (May 2026)
        let remaining = paymentAmount;
        const sorted = sortInvoicesFIFO(unpaidInvoices);

        for (const invoice of sorted) {
          if (remaining <= 0) break;
          const owed = invoice.amount - (invoice.paidAmount || 0);
          const applyAmount = Math.min(remaining, owed);

          applyPaymentToInvoice(transaction, invoice, applyAmount, "Full payout via overpayment");
          remaining -= applyAmount;
        }

        expect(remaining).toBe(3000); // Overpayment remainder

        // 4. Overpayment absorption: Pre-billing future month (June 2026)
        let pivotPeriod = await fetchLatestBillingPeriod(studentId, "2026-05");
        expect(pivotPeriod).toBe("2026-05");

        const { period, year, month } = nextBillingPeriod(pivotPeriod);
        expect(period).toBe("2026-06");

        if (isStudentBillableForPeriod(studentData, period)) {
          // Build preview payload to resolve fee
          const previewPayload = buildInvoicePayload(
            studentId,
            tuitionId,
            period,
            studentData.billingDay || 1,
            year,
            month,
            enrollments,
            0,
            "lazy"
          );

          expect(previewPayload).not.toBeNull();
          if (previewPayload) {
            expect(previewPayload.amount).toBe(3500);

            const applyAmount = Math.min(remaining, previewPayload.amount);
            expect(applyAmount).toBe(3000);

            // Build final payload with prepayed amount
            const finalPayload = buildInvoicePayload(
              studentId,
              tuitionId,
              period,
              studentData.billingDay || 1,
              year,
              month,
              enrollments,
              applyAmount,
              "lazy"
            );

            if (finalPayload) {
              const nextLedgerId = `${studentId}_${period}`;
              transaction.set(db.collection("invoice").doc(nextLedgerId), {
                ...finalPayload,
                createdAt: new Date()
              });
              remaining -= applyAmount;
            }
          }
        }

        expect(remaining).toBe(0); // Overpayment fully absorbed
      });

      // ─── POST-TRANSACTION ASSERTIONS IN DATABASE ───

      // May 2026 invoice: Should be fully paid
      const mayInvoice = await db.collection("invoice").doc(`${studentId}_2026-05`).get();
      expect(mayInvoice.data()?.paidAmount).toBe(3500);
      expect(mayInvoice.data()?.remainingAmount).toBe(0);
      expect(mayInvoice.data()?.status).toBe("paid");

      // June 2026 invoice: Should be pre-generated and partially paid by overpayment
      const juneInvoice = await db.collection("invoice").doc(`${studentId}_2026-06`).get();
      expect(juneInvoice.exists).toBe(true);
      expect(juneInvoice.data()?.amount).toBe(3500);
      expect(juneInvoice.data()?.paidAmount).toBe(3000);
      expect(juneInvoice.data()?.remainingAmount).toBe(500);
      expect(juneInvoice.data()?.status).toBe("partial");
    });
  });
}
