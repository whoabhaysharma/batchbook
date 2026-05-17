import * as functions from "firebase-functions/v2";
import { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../admin";
import { getActiveEnrollments } from "./billing-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMode = "cash" | "upi" | "bank_transfer";

export interface PaymentAllocation {
  ledgerId: string;
  billingPeriod: string;
  amount: number;
}

export interface InvoicePayload {
  studentId: string;
  tuitionId: string;
  billingPeriod: string;
  dueDate: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  subjects: { enrollmentId: string; subject: string; monthlyFee: number }[];
  status: "pending" | "partial" | "paid";
  generatedFrom: "lazy";
  paidAt?: number;
  remarks: string;
  createdAt: any;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Throws if any required payment field is missing or invalid. */
export function validatePaymentRequest(data: any) {
  if (!data.studentId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing student ID.");
  }
  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number.");
  }
  const validModes: PaymentMode[] = ["cash", "upi", "bank_transfer"];
  if (!validModes.includes(data.paymentMode)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid or missing payment mode.");
  }
}

// ─── Invoice Fetching ─────────────────────────────────────────────────────────

/** Fetches all unpaid (pending or partial) invoices for a student. */
export async function fetchUnpaidInvoices(studentId: string): Promise<any[]> {
  const snap = await db.collection("invoice")
    .where("studentId", "==", studentId)
    .where("status", "in", ["pending", "partial"])
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Fetches all invoices for a student, returns them sorted newest-first. */
export async function fetchLatestBillingPeriod(studentId: string, fallback: string): Promise<string> {
  const snap = await db.collection("invoice")
    .where("studentId", "==", studentId)
    .get();
  const periods = snap.docs.map(doc => doc.data().billingPeriod as string);
  return periods.sort().reverse()[0] ?? fallback;
}

// ─── Invoice Building ─────────────────────────────────────────────────────────

/** Builds a new invoice data payload from active enrollments. */
export function buildInvoicePayload(
  studentId: string,
  tuitionId: string,
  billingPeriod: string,
  billingDay: number,
  year: number,
  month: number,
  enrollments: any[],
  paidAmount = 0,
  generatedFrom: "lazy" = "lazy"
): InvoicePayload | null {
  const dueDate = new Date(year, month - 1, billingDay);
  const activeEnrollments = getActiveEnrollments(enrollments, dueDate.getTime());
  const totalAmount = activeEnrollments.reduce((sum, e: any) => sum + (e.monthlyFee || 0), 0);

  if (totalAmount <= 0) return null;

  const remainingAmount = totalAmount - paidAmount;
  const status = remainingAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";

  return {
    studentId,
    tuitionId,
    billingPeriod,
    dueDate: dueDate.getTime(),
    amount: totalAmount,
    paidAmount,
    remainingAmount,
    subjects: activeEnrollments.map((e: any) => ({
      enrollmentId: e.id || "",
      subject: e.subject,
      monthlyFee: e.monthlyFee,
    })),
    status,
    generatedFrom,
    ...(paidAmount > 0 && { paidAt: Date.now() }),
    remarks: `Prepayment invoice for ${billingPeriod}. Generated lazily during payment processing.`,
    createdAt: FieldValue.serverTimestamp(),
  };
}

// ─── Invoice Writing ──────────────────────────────────────────────────────────

/** Writes a new invoice document inside a transaction. */
export function writeInvoice(transaction: Transaction, ledgerId: string, payload: InvoicePayload) {
  const ref = db.collection("invoice").doc(ledgerId);
  transaction.set(ref, payload);
}

/** Updates an existing invoice with payment amounts inside a transaction. */
export function applyPaymentToInvoice(
  transaction: Transaction,
  invoice: any,
  applyAmount: number,
  remarks: string
) {
  const updatedPaid = (invoice.paidAmount || 0) + applyAmount;
  const updatedRemaining = invoice.amount - updatedPaid;
  const ref = db.collection("invoice").doc(invoice.id);

  transaction.update(ref, {
    paidAmount: updatedPaid,
    remainingAmount: updatedRemaining,
    status: updatedRemaining === 0 ? "paid" : "partial",
    paidAt: Date.now(),
    remarks: remarks || invoice.remarks || "",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ─── FIFO Allocation ──────────────────────────────────────────────────────────

/** Sorts unpaid invoices oldest-first (FIFO). */
export function sortInvoicesFIFO(invoices: any[]): any[] {
  return invoices
    .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
    .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod));
}

/** Allocates a payment amount against a single invoice. Returns the leftover. */
export function allocateToInvoice(
  transaction: Transaction,
  invoice: any,
  remainingPayment: number,
  remarks: string,
  allocations: PaymentAllocation[]
): number {
  const owed = invoice.amount - (invoice.paidAmount || 0);
  if (owed <= 0) return remainingPayment;

  const applyAmount = Math.min(remainingPayment, owed);
  applyPaymentToInvoice(transaction, invoice, applyAmount, remarks);
  allocations.push({ ledgerId: invoice.id, billingPeriod: invoice.billingPeriod, amount: applyAmount });

  return remainingPayment - applyAmount;
}

// ─── Period Helpers ───────────────────────────────────────────────────────────

/** Advances a YYYY-MM period string by one month. */
export function nextBillingPeriod(period: string): { period: string; year: number; month: number } {
  let [year, month] = period.split("-").map(Number);
  month++;
  if (month > 12) { month = 1; year++; }
  return { period: `${year}-${month.toString().padStart(2, "0")}`, year, month };
}

/** Returns true if a student is eligible to receive a bill for a given period. */
export function isStudentBillableForPeriod(studentData: any, period: string): boolean {
  if (studentData.status !== "active") return false;
  if (studentData.billingActiveFrom && period < studentData.billingActiveFrom) return false;
  return true;
}
