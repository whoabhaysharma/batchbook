import * as functions from "firebase-functions/v2";
import { db, FieldValue } from "../admin";

/**
 * Callable Function to record a student payment by a teacher.
 * Implements the FIFO payment allocation, lazy invoice generation, 
 * and absolute transactional safety.
 */
export const recordPayment = functions.https.onCall(async (request) => {
  // 1. Authenticate user
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { studentId, amount, paymentMode, remarks } = request.data;

  // 2. Validate request parameters
  if (!studentId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing student ID.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Payment amount must be a number greater than 0.");
  }

  if (!paymentMode || (paymentMode !== "cash" && paymentMode !== "upi" && paymentMode !== "bank_transfer")) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid or missing payment mode.");
  }

  const studentRef = db.collection("students").doc(studentId);

  try {
    return await db.runTransaction(async (transaction) => {
      // 3. Fetch student inside transaction
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

      // 4. Determine current billing period (Asia/Kolkata consistent timezone)
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const billingPeriod = `${year}-${month}`;

      // 5. Fetch all subject enrollments for active snapshot check
      const enrollmentsSnap = await db.collection("subject_enrollments")
        .where("studentId", "==", studentId)
        .get();
      const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 6. Check if current ledger invoice exists
      const currentLedgerId = `${studentId}_${billingPeriod}`;
      const currentLedgerRef = db.collection("invoice").doc(currentLedgerId);
      const currentLedgerSnap = await transaction.get(currentLedgerRef);

      // Fetch all unpaid ledgers ("pending", "partial")
      const unpaidLedgersSnap = await db.collection("invoice")
        .where("studentId", "==", studentId)
        .where("status", "in", ["pending", "partial"])
        .get();

      let unpaidInvoices = unpaidLedgersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const currentInvoiceExists = currentLedgerSnap.exists || unpaidInvoices.some(inv => inv.id === currentLedgerId);

      // 7. Ensure Current Ledger Exists (Lazy generate current month if missing)
      const isCurrentActive = studentData.status === "active";
      const isCurrentPeriodActive = !studentData.billingActiveFrom || billingPeriod >= studentData.billingActiveFrom;

      if (!currentInvoiceExists && isCurrentActive && isCurrentPeriodActive) {
        const invoiceDate = new Date(year, today.getMonth(), billingDay);
        const activeEnrollments = enrollments.filter((e: any) => {
          const startedTime = e.startedAt?.toMillis ? e.startedAt.toMillis() : new Date(e.startedAt).getTime();
          const endedTime = e.endedAt ? (e.endedAt.toMillis ? e.endedAt.toMillis() : new Date(e.endedAt).getTime()) : null;
          const invoiceTime = invoiceDate.getTime();
          return startedTime <= invoiceTime && (endedTime === null || endedTime > invoiceTime);
        });

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

          // Write lazy current invoice
          transaction.set(currentLedgerRef, newInvoiceData);

          // Add to local chronological sequence
          unpaidInvoices.push({ id: currentLedgerId, ...newInvoiceData });
        }
      }

      // Sort chronological FIFO (oldest period first)
      unpaidInvoices = unpaidInvoices
        .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
        .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod));

      let remainingPayment = amount;
      const allocations: any[] = [];

      // 8. Allocate Payment chronologically
      for (const invoice of unpaidInvoices) {
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

      // 9. Handle Future Overpayment Lazy Generation
      if (remainingPayment > 0) {
        // Fetch all ledger docs to locate newest period in history
        const allLedgerSnap = await db.collection("invoice")
          .where("studentId", "==", studentId)
          .get();
        const allInvoices = allLedgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const sortedAll = allInvoices.sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod));
        let latestPeriod = sortedAll.length > 0 ? sortedAll[0].billingPeriod : billingPeriod;

        let [fYear, fMonth] = latestPeriod.split("-").map(Number);

        while (remainingPayment > 0) {
          fMonth++;
          if (fMonth > 12) {
            fMonth = 1;
            fYear++;
          }
          const futurePeriod = `${fYear}-${fMonth.toString().padStart(2, "0")}`;

          // Validate rules: status must be active and target period >= billingActiveFrom
          const isFutureActive = studentData.status === "active";
          const isFuturePeriodActive = !studentData.billingActiveFrom || futurePeriod >= studentData.billingActiveFrom;

          if (!isFutureActive || !isFuturePeriodActive) {
            break; // Stop future generation loop
          }

          const futureInvoiceDate = new Date(fYear, fMonth - 1, billingDay);

          // Get active subject snapshot for this future period
          const activeEnrollments = enrollments.filter((e: any) => {
            const startedTime = e.startedAt?.toMillis ? e.startedAt.toMillis() : new Date(e.startedAt).getTime();
            const endedTime = e.endedAt ? (e.endedAt.toMillis ? e.endedAt.toMillis() : new Date(e.endedAt).getTime()) : null;
            const invoiceTime = futureInvoiceDate.getTime();
            return startedTime <= invoiceTime && (endedTime === null || endedTime > invoiceTime);
          });

          const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

          if (totalAmount > 0) {
            const ledgerId = `${studentId}_${futurePeriod}`;
            const applyAmount = Math.min(remainingPayment, totalAmount);

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

            remainingPayment -= applyAmount;
          } else {
            // Break loop if there are no enrollments for this future period to avoid infinite loop
            break;
          }
        }
      }

      // 10. Write Structured Payment Audit Log
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
