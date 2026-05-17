import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";
import { getKolkataBillingPeriod } from "./billing-utils";
import {
  validatePaymentRequest,
  fetchUnpaidInvoices,
  fetchLatestBillingPeriod,
  buildInvoicePayload,
  writeInvoice,
  sortInvoicesFIFO,
  allocateToInvoice,
  nextBillingPeriod,
  isStudentBillableForPeriod,
  PaymentAllocation,
} from "./payment-helpers";

// ─── Step Functions ────────────────────────────────────────────────────────────

/** Fetches the student document inside the transaction. Throws if not found. */
async function fetchStudent(transaction: any, studentId: string) {
  const studentRef = db.collection("students").doc(studentId);
  const snap = await transaction.get(studentRef);
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Student not found.");
  }
  const data = snap.data()!;
  if (!data.tuitionId) {
    throw new functions.https.HttpsError("failed-precondition", "Student is missing tuitionId.");
  }
  return data;
}

/** Fetches all enrollments for a student. */
async function fetchEnrollments(studentId: string) {
  const snap = await db.collection("subject_enrollments")
    .where("studentId", "==", studentId)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Lazily creates the current month's invoice if it doesn't exist yet.
 * Appends it to the unpaid list so FIFO allocation can immediately use it.
 */
function ensureCurrentMonthInvoice(
  transaction: any,
  studentId: string,
  studentData: any,
  billingPeriod: string,
  year: number,
  month: number,
  enrollments: any[],
  unpaidInvoices: any[]
) {
  const alreadyExists = unpaidInvoices.some(inv => inv.id === `${studentId}_${billingPeriod}`);
  if (alreadyExists) return;
  if (!isStudentBillableForPeriod(studentData, billingPeriod)) return;

  const payload = buildInvoicePayload(
    studentId, studentData.tuitionId, billingPeriod,
    studentData.billingDay || 1, year, month, enrollments
  );
  if (!payload) return;

  const ledgerId = `${studentId}_${billingPeriod}`;
  writeInvoice(transaction, ledgerId, payload);
  unpaidInvoices.push({ id: ledgerId, ...payload });
}

/**
 * Applies payment across unpaid invoices in chronological FIFO order.
 * Returns the leftover amount after all existing invoices are settled.
 */
function applyFIFOPayment(
  transaction: any,
  unpaidInvoices: any[],
  amount: number,
  remarks: string,
  allocations: PaymentAllocation[]
): number {
  let remaining = amount;
  for (const invoice of sortInvoicesFIFO(unpaidInvoices)) {
    if (remaining <= 0) break;
    remaining = allocateToInvoice(transaction, invoice, remaining, remarks, allocations);
  }
  return remaining;
}

/**
 * Creates advance invoices for future months until the overpayment is absorbed.
 * Stops when the student is no longer billable or has no active subjects.
 */
async function absorbOverpaymentInFuturePeriods(
  transaction: any,
  studentId: string,
  studentData: any,
  enrollments: any[],
  currentPeriod: string,
  overpayment: number,
  allocations: PaymentAllocation[]
) {
  if (overpayment <= 0) return;

  let pivot = await fetchLatestBillingPeriod(studentId, currentPeriod);
  let remaining = overpayment;

  while (remaining > 0) {
    const { period, year, month } = nextBillingPeriod(pivot);
    pivot = period;

    if (!isStudentBillableForPeriod(studentData, period)) break;

    const payload = buildInvoicePayload(
      studentId, studentData.tuitionId, period,
      studentData.billingDay || 1, year, month, enrollments,
      Math.min(remaining, Infinity)
    );
    if (!payload) break;

    const applyAmount = Math.min(remaining, payload.amount);
    const ledgerId = `${studentId}_${period}`;

    // Rebuild payload with the actual applied amount
    const finalPayload = buildInvoicePayload(
      studentId, studentData.tuitionId, period,
      studentData.billingDay || 1, year, month, enrollments,
      applyAmount
    );
    if (!finalPayload) break;

    writeInvoice(transaction, ledgerId, finalPayload);
    allocations.push({ ledgerId, billingPeriod: period, amount: applyAmount });
    remaining -= applyAmount;
  }
}

/** Writes the final payment log document. */
function writePaymentLog(
  transaction: any,
  studentId: string,
  tuitionId: string,
  amount: number,
  paymentMode: string,
  remarks: string,
  allocations: PaymentAllocation[],
  receivedBy: string
) {
  const paymentRef = db.collection("payments").doc();
  transaction.set(paymentRef, {
    studentId,
    tuitionId,
    amount,
    paymentMode,
    remarks: remarks || "",
    allocations,
    receivedBy,
    paymentDate: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return paymentRef.id;
}

// ─── Callable Function ─────────────────────────────────────────────────────────

/**
 * Records a student payment.
 * Lazily creates invoices, allocates via FIFO, and handles advance payments.
 */
export const recordPayment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  validatePaymentRequest(request.data);
  const { studentId, amount, paymentMode, remarks } = request.data;

  try {
    return await db.runTransaction(async (transaction) => {
      const studentData = await fetchStudent(transaction, studentId);
      const { tuitionId } = studentData;

      const { billingPeriod, year, month } = getKolkataBillingPeriod();
      const enrollments = await fetchEnrollments(studentId);
      const unpaidInvoices = await fetchUnpaidInvoices(studentId);
      const allocations: PaymentAllocation[] = [];

      ensureCurrentMonthInvoice(
        transaction, studentId, studentData,
        billingPeriod, year, month, enrollments, unpaidInvoices
      );

      const leftover = applyFIFOPayment(transaction, unpaidInvoices, amount, remarks, allocations);

      await absorbOverpaymentInFuturePeriods(
        transaction, studentId, studentData,
        enrollments, billingPeriod, leftover, allocations
      );

      const paymentId = writePaymentLog(
        transaction, studentId, tuitionId,
        amount, paymentMode, remarks, allocations,
        request.auth?.uid || "system"
      );

      return { success: true, paymentId, allocations };
    });
  } catch (error: any) {
    console.error("recordPayment Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message || "Failed to record payment.");
  }
});
