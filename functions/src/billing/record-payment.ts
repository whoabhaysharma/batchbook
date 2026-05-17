import * as functions from "firebase-functions/v2";
import { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../admin";
import { getKolkataBillingPeriod, getActiveEnrollments } from "./billing-utils";

/**
 * Validates the request parameters for recording a payment.
 */
function validateRequest(data: any) {
  const { studentId, amount, paymentMode } = data;

  if (!studentId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing student ID.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Payment amount must be a number greater than 0.");
  }

  if (!paymentMode || (paymentMode !== "cash" && paymentMode !== "upi" && paymentMode !== "bank_transfer")) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid or missing payment mode.");
  }
}

/**
 * Lazy generates an invoice for the current billing cycle if it does not already exist.
 */
async function lazyGenerateCurrentInvoiceIfNeeded(
  transaction: Transaction,
  studentId: string,
  tuitionId: string,
  billingPeriod: string,
  billingDay: number,
  studentData: any,
  enrollments: any[],
  unpaidInvoices: any[],
  currentLedgerSnap: any,
  currentLedgerRef: any,
  year: number,
  month: number
) {
  const currentInvoiceExists = currentLedgerSnap.exists || unpaidInvoices.some(inv => inv.id === `${studentId}_${billingPeriod}`);
  const isCurrentActive = studentData.status === "active";
  const isCurrentPeriodActive = !studentData.billingActiveFrom || billingPeriod >= studentData.billingActiveFrom;

  if (!currentInvoiceExists && isCurrentActive && isCurrentPeriodActive) {
    const invoiceDate = new Date(year, month - 1, billingDay);
    const activeEnrollments = getActiveEnrollments(enrollments, invoiceDate.getTime());
    const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

    if (totalAmount > 0) {
      const newInvoiceData = {
        studentId,
        tuitionId,
        billingPeriod,
        dueDate: invoiceDate.getTime(),
        amount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        subjects: activeEnrollments.map((e: any) => ({
          enrollmentId: e.id || "",
          subject: e.subject,
          monthlyFee: e.monthlyFee
        })),
        status: "pending" as const,
        generatedFrom: "lazy" as const,
        remarks: `Prepayment invoice for ${billingPeriod}. Generated lazily during payment processing.`,
        createdAt: FieldValue.serverTimestamp()
      };

      // Register the new invoice in Firestore inside transaction
      transaction.set(currentLedgerRef, newInvoiceData);

      // Append to the list of unpaid invoices for immediate FIFO allocation
      unpaidInvoices.push({ id: `${studentId}_${billingPeriod}`, ...newInvoiceData });
    }
  }
}

/**
 * Allocates payment across unpaid invoices in FIFO chronological order.
 * Returns the leftover amount for future advance billing.
 */
function allocatePaymentFIFO(
  transaction: Transaction,
  unpaidInvoices: any[],
  paymentAmount: number,
  remarks: string,
  allocations: any[]
): number {
  const sortedUnpaid = unpaidInvoices
    .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
    .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod));

  let remainingPayment = paymentAmount;

  for (const invoice of sortedUnpaid) {
    const currentPaid = invoice.paidAmount || 0;
    const remainingInvoice = invoice.amount - currentPaid;
    if (remainingInvoice <= 0) continue;

    const applyAmount = Math.min(remainingPayment, remainingInvoice);
    const updatedPaid = currentPaid + applyAmount;
    const updatedRemaining = invoice.amount - updatedPaid;
    const updatedStatus = updatedRemaining === 0 ? "paid" : "partial";

    const invoiceRef = db.collection("invoice").doc(invoice.id);
    transaction.update(invoiceRef, {
      paidAmount: updatedPaid,
      remainingAmount: updatedRemaining,
      status: updatedStatus,
      paidAt: Date.now(),
      remarks: remarks || invoice.remarks || "",
      updatedAt: FieldValue.serverTimestamp()
    });

    allocations.push({
      ledgerId: invoice.id,
      billingPeriod: invoice.billingPeriod,
      amount: applyAmount
    });

    remainingPayment -= applyAmount;
    if (remainingPayment <= 0) break;
  }

  return remainingPayment;
}

/**
 * Generates future billing periods dynamically to absorb excess prepaid funds (overpayments).
 */
async function generateFutureInvoicesForOverpayment(
  transaction: Transaction,
  studentId: string,
  tuitionId: string,
  billingDay: number,
  studentData: any,
  enrollments: any[],
  remainingPayment: number,
  billingPeriod: string,
  allocations: any[]
) {
  let currentRemaining = remainingPayment;
  if (currentRemaining <= 0) return;

  const allLedgerSnap = await db.collection("invoice")
    .where("studentId", "==", studentId)
    .get();
  
  const allInvoices = allLedgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  const sortedAll = allInvoices.sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod));
  const latestPeriod = sortedAll.length > 0 ? sortedAll[0].billingPeriod : billingPeriod;

  let [fYear, fMonth] = latestPeriod.split("-").map(Number);

  while (currentRemaining > 0) {
    fMonth++;
    if (fMonth > 12) {
      fMonth = 1;
      fYear++;
    }
    const futurePeriod = `${fYear}-${fMonth.toString().padStart(2, "0")}`;

    const isFutureActive = studentData.status === "active";
    const isFuturePeriodActive = !studentData.billingActiveFrom || futurePeriod >= studentData.billingActiveFrom;

    if (!isFutureActive || !isFuturePeriodActive) {
      break; 
    }

    const futureInvoiceDate = new Date(fYear, fMonth - 1, billingDay);
    const activeEnrollments = getActiveEnrollments(enrollments, futureInvoiceDate.getTime());
    const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

    if (totalAmount > 0) {
      const ledgerId = `${studentId}_${futurePeriod}`;
      const applyAmount = Math.min(currentRemaining, totalAmount);

      const newInvoiceData = {
        studentId,
        tuitionId,
        billingPeriod: futurePeriod,
        dueDate: futureInvoiceDate.getTime(),
        amount: totalAmount,
        paidAmount: applyAmount,
        remainingAmount: totalAmount - applyAmount,
        subjects: activeEnrollments.map((e: any) => ({
          enrollmentId: e.id || "",
          subject: e.subject,
          monthlyFee: e.monthlyFee
        })),
        status: (totalAmount - applyAmount === 0 ? "paid" : "partial") as any,
        generatedFrom: "lazy" as const,
        paidAt: Date.now(),
        remarks: `Prepayment invoice for ${futurePeriod}. Generated lazily during payment processing.`,
        createdAt: FieldValue.serverTimestamp(),
      };

      const futureLedgerRef = db.collection("invoice").doc(ledgerId);
      transaction.set(futureLedgerRef, newInvoiceData);

      allocations.push({
        ledgerId,
        billingPeriod: futurePeriod,
        amount: applyAmount
      });

      currentRemaining -= applyAmount;
    } else {
      break; 
    }
  }
}

/**
 * Callable Function to record a student payment by a teacher.
 * Implements FIFO payment allocation, lazy invoice generation, 
 * and absolute transactional safety.
 */
export const recordPayment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { studentId, amount, paymentMode, remarks } = request.data;
  validateRequest(request.data);

  const studentRef = db.collection("students").doc(studentId);

  try {
    return await db.runTransaction(async (transaction) => {
      // 1. Fetch student inside transaction
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Student not found.");
      }

      const studentData = studentSnap.data()!;
      const tuitionId = studentData.tuitionId;
      const billingDay = studentData.billingDay || 1;

      if (!tuitionId) {
        throw new functions.https.HttpsError("failed-precondition", "Student record is missing tuitionId mapping.");
      }

      // 2. Fetch current billing period
      const { billingPeriod, year, month } = getKolkataBillingPeriod();

      // 3. Fetch all subject enrollments
      const enrollmentsSnap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();
      const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 4. Retrieve invoice ledger details
      const currentLedgerId = `${studentId}_${billingPeriod}`;
      const currentLedgerRef = db.collection("invoice").doc(currentLedgerId);
      const currentLedgerSnap = await transaction.get(currentLedgerRef);

      const unpaidLedgersSnap = await db.collection("invoice")
        .where("studentId", "==", studentId)
        .where("status", "in", ["pending", "partial"])
        .get();

      const unpaidInvoices = unpaidLedgersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // 5. Lazy generate current month's invoice if missing
      await lazyGenerateCurrentInvoiceIfNeeded(
        transaction,
        studentId,
        tuitionId,
        billingPeriod,
        billingDay,
        studentData,
        enrollments,
        unpaidInvoices,
        currentLedgerSnap,
        currentLedgerRef,
        year,
        month
      );

      // 6. Chronologically allocate payment (FIFO)
      const allocations: any[] = [];
      const leftover = allocatePaymentFIFO(transaction, unpaidInvoices, amount, remarks, allocations);

      // 7. Handle future overpayment lazy generation
      await generateFutureInvoicesForOverpayment(
        transaction,
        studentId,
        tuitionId,
        billingDay,
        studentData,
        enrollments,
        leftover,
        billingPeriod,
        allocations
      );

      // 8. Write payment transaction log
      const paymentRef = db.collection("payments").doc();
      const paymentData = {
        studentId,
        tuitionId,
        amount,
        paymentMode,
        remarks: remarks || "",
        allocations,
        receivedBy: request.auth?.uid || "system",
        paymentDate: Date.now(),
        createdAt: FieldValue.serverTimestamp()
      };

      transaction.set(paymentRef, paymentData);

      return {
        success: true,
        paymentId: paymentRef.id,
        allocations
      };
    });
  } catch (error: any) {
    console.error("recordPayment Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message || "Failed to record payment.");
  }
});
