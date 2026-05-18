/**
 * Atomic Payment Recording & Receipt Acceptance
 * 
 * Exposes a Callable Cloud Function to record student payments securely.
 * Executes within a single database transaction to guarantee ACID compliance,
 * ensuring no race conditions occur when calculating and allocating payments.
 * 
 * Business Workflow:
 * 1. Read student and enrollments.
 * 2. Lazily create the current month's invoice if due but not yet created.
 * 3. Chronologically sort all unpaid invoices (FIFO).
 * 4. Apply incoming payment to settle oldest outstanding balances first.
 * 5. If an overpayment exists, absorb it by pre-generating future invoices.
 * 6. Audit log the transaction in the payments collection and return receipt details.
 */

import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";
import { getKolkataBillingPeriod } from "./billing-utils";
import {
  validatePaymentRequest,
  fetchLatestBillingPeriod,
  buildInvoicePayload,
  writeInvoice,
  applyPaymentToInvoice,
  sortInvoicesFIFO,
  nextBillingPeriod,
  isStudentBillableForPeriod,
  PaymentAllocation,
} from "./payment-helpers";

/**
 * Main transactional function to process and allocate student payment receipts.
 */
export const recordPayment = functions.https.onCall({ cors: true }, async (request) => {
  // 1. Authenticate user
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "Access Denied: Admin user must be authenticated."
    );
  }

  // 2. Validate input schema
  validatePaymentRequest(request.data);
  
  const { studentId, amount, paymentMode, remarks } = request.data;
  const adminUid = request.auth.uid;

  try {
    return await db.runTransaction(async (transaction) => {
      // ─── STEP 1: FETCH STUDENT PROFILE WITH TX LOCK ───
      const studentRef = db.collection("students").doc(studentId);
      const studentSnap = await transaction.get(studentRef);
      
      if (!studentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Student profile not found.");
      }
      
      const studentData = studentSnap.data()!;
      if (!studentData.tuitionId) {
        throw new functions.https.HttpsError(
          "failed-precondition", 
          "Student profile is missing tuitionId association."
        );
      }

      const tuitionId = studentData.tuitionId;

      // ─── STEP 2: FETCH ENROLLMENTS ───
      const enrollmentsSnap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();
      
      const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // ─── STEP 3: FETCH UNPAID INVOICES WITH TX LOCK ───
      const unpaidQuerySnap = await db.collection("invoice")
        .where("studentId", "==", studentId)
        .where("status", "in", ["pending", "partial", "overdue"])
        .get();

      const unpaidInvoices: any[] = [];
      for (const doc of unpaidQuerySnap.docs) {
        const lockedDoc = await transaction.get(doc.ref);
        if (lockedDoc.exists) {
          unpaidInvoices.push({ id: lockedDoc.id, ...lockedDoc.data() });
        }
      }

      // ─── STEP 4: LAZILY GENERATE CURRENT MONTH'S INVOICE IF MISSING ───
      const { billingPeriod, year, month } = getKolkataBillingPeriod();
      const currentMonthId = `${studentId}_${billingPeriod}`;
      
      let currentMonthInvoice = unpaidInvoices.find(inv => inv.id === currentMonthId);
      
      if (!currentMonthInvoice && isStudentBillableForPeriod(studentData, billingPeriod)) {
        const payload = buildInvoicePayload(
          studentId,
          tuitionId,
          billingPeriod,
          studentData.billingDay || 1,
          year,
          month,
          enrollments,
          0,
          "lazy"
        );

        if (payload) {
          writeInvoice(transaction, currentMonthId, payload);
          currentMonthInvoice = { id: currentMonthId, ...payload };
          unpaidInvoices.push(currentMonthInvoice);
        }
      }

      // ─── STEP 5: RUN FIFO PAYMENT ALLOCATION ───
      let remainingPayment = amount;
      const allocations: PaymentAllocation[] = [];
      const sortedUnpaid = sortInvoicesFIFO(unpaidInvoices);

      for (const invoice of sortedUnpaid) {
        if (remainingPayment <= 0) {
          break;
        }

        const owedAmount = invoice.amount - (invoice.paidAmount || 0);
        if (owedAmount <= 0) {
          continue;
        }

        const applyAmount = Math.min(remainingPayment, owedAmount);
        applyPaymentToInvoice(transaction, invoice, applyAmount, remarks);

        allocations.push({
          ledgerId: invoice.id,
          billingPeriod: invoice.billingPeriod,
          amount: applyAmount,
        });

        remainingPayment -= applyAmount;
      }

      // ─── STEP 6: ABSORB OVERPAYMENT / ADVANCE PAYMENTS ───
      if (remainingPayment > 0) {
        let pivotPeriod = await fetchLatestBillingPeriod(studentId, billingPeriod);

        while (remainingPayment > 0) {
          const { period, year, month } = nextBillingPeriod(pivotPeriod);
          pivotPeriod = period;

          // Stop pre-billing if student status has changed or period is not active
          if (!isStudentBillableForPeriod(studentData, period)) {
            break;
          }

          // Build preview invoice payload to get total fee
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

          if (!previewPayload) {
            break; // Stop if no fees are outstanding for future months (e.g. no subject enrollments)
          }

          const applyAmount = Math.min(remainingPayment, previewPayload.amount);
          
          // Re-build final invoice payload with the applied prepayment
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

          if (!finalPayload) {
            break;
          }

          writeInvoice(transaction, `${studentId}_${period}`, finalPayload);

          allocations.push({
            ledgerId: `${studentId}_${period}`,
            billingPeriod: period,
            amount: applyAmount,
          });

          remainingPayment -= applyAmount;
        }
      }

      // ─── STEP 7: AUDIT LOG TRANSACTION RECEIPT ───
      const paymentRef = db.collection("payments").doc();
      const paymentData = {
        studentId,
        tuitionId,
        amount,
        paymentMode,
        remarks: remarks || "",
        allocations,
        receivedBy: adminUid,
        paymentDate: Date.now(),
        createdAt: FieldValue.serverTimestamp(),
      };

      transaction.set(paymentRef, paymentData);

      return {
        success: true,
        paymentId: paymentRef.id,
        allocations,
      };
    });
  } catch (error: any) {
    console.error("❌ recordPayment Transaction Error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal", 
      error.message || "Failed to process and commit payment transaction."
    );
  }
});
