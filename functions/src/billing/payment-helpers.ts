/**
 * Payment and Invoicing Helper Module
 * 
 * Provides database query routines, business rule validations, invoice payload generators,
 * chronological FIFO payment allocation operations, and date-advancement utilities.
 */

import * as functions from "firebase-functions/v2";
import { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../admin";
import { getActiveEnrollments } from "./billing-utils";

// ─── TYPES & SCHEMAS ─────────────────────────────────────────────────────────

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
  status: "pending" | "partial" | "paid" | "overdue";
  generatedFrom: "cron" | "lazy" | "forced";
  paidAt?: number;
  remarks: string;
  createdAt: any;
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Validates the parameters of an incoming payment receipt.
 * Throws clean HttpsError exceptions if fields are missing or invalid.
 */
export function validatePaymentRequest(data: any): void {
  if (!data.studentId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required field: studentId.");
  }
  
  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number.");
  }

  const validModes: PaymentMode[] = ["cash", "upi", "bank_transfer"];
  if (!data.paymentMode || !validModes.includes(data.paymentMode)) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      `Invalid or missing paymentMode. Allowed: ${validModes.join(", ")}`
    );
  }
}

// ─── DATABASE FETCHES ─────────────────────────────────────────────────────────

/**
 * Fetches all outstanding (pending, partial, or overdue) invoices for a student.
 */
export async function fetchUnpaidInvoices(studentId: string): Promise<any[]> {
  const snapshot = await db.collection("invoice")
    .where("studentId", "==", studentId)
    .where("status", "in", ["pending", "partial", "overdue"])
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Finds the latest billing period (format: YYYY-MM) billed to the student.
 * If no bills exist, falls back to the provided default period.
 */
export async function fetchLatestBillingPeriod(studentId: string, fallback: string): Promise<string> {
  const snapshot = await db.collection("invoice")
    .where("studentId", "==", studentId)
    .get();

  if (snapshot.empty) {
    return fallback;
  }

  const periods = snapshot.docs.map(doc => doc.data().billingPeriod as string);
  // Sort reverse lexicographically to find the newest period first
  return periods.sort().reverse()[0] || fallback;
}

// ─── INVOICE MODEL BUILDER ───────────────────────────────────────────────────

/**
 * Constructs a new Invoice data payload based on a student's active enrollments.
 * Returns null if the student has no active enrollments (i.e., total fee is 0).
 */
export function buildInvoicePayload(
  studentId: string,
  tuitionId: string,
  billingPeriod: string,
  billingDay: number,
  year: number,
  month: number,
  enrollments: any[],
  paidAmount = 0,
  generatedFrom: "cron" | "lazy" | "forced" = "lazy"
): InvoicePayload | null {
  // Determine invoice due date based on the student's designated billing day
  const dueDate = new Date(year, month - 1, billingDay);
  
  // Resolve enrollments active on this due date
  const activeEnrollments = getActiveEnrollments(enrollments, dueDate.getTime());
  const totalAmount = activeEnrollments.reduce((sum, e: any) => sum + (e.monthlyFee || 0), 0);

  // If there are no fees to collect, do not generate an empty invoice
  if (totalAmount <= 0) {
    return null;
  }

  const remainingAmount = totalAmount - paidAmount;
  let status: "pending" | "partial" | "paid" = "pending";
  
  if (remainingAmount === 0) {
    status = "paid";
  } else if (paidAmount > 0) {
    status = "partial";
  }

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

// ─── FIRESTORE TRANSACTION WRITE OPERATORS ───────────────────────────────────

/**
 * Commits a new invoice document to the database within a transaction.
 */
export function writeInvoice(transaction: Transaction, ledgerId: string, payload: InvoicePayload): void {
  const docRef = db.collection("invoice").doc(ledgerId);
  transaction.set(docRef, payload);
}

/**
 * Mutates an existing invoice to apply a payment amount inside a transaction.
 */
export function applyPaymentToInvoice(
  transaction: Transaction,
  invoice: any,
  applyAmount: number,
  remarks: string
): void {
  const updatedPaid = (invoice.paidAmount || 0) + applyAmount;
  const updatedRemaining = invoice.amount - updatedPaid;
  const docRef = db.collection("invoice").doc(invoice.id);

  transaction.update(docRef, {
    paidAmount: updatedPaid,
    remainingAmount: updatedRemaining,
    status: updatedRemaining === 0 ? "paid" : "partial",
    paidAt: Date.now(),
    remarks: remarks || invoice.remarks || "",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ─── FIFO COLLECTION ALLOCATION ──────────────────────────────────────────────

/**
 * Sorts unpaid invoices chronologically (oldest first) to enforce FIFO payment processing.
 */
export function sortInvoicesFIFO(invoices: any[]): any[] {
  return invoices
    .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
    .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod));
}

/**
 * Applies a payment amount to a single invoice, capped at the outstanding balance.
 * Returns the remaining (leftover) payment amount.
 */
export function allocateToInvoice(
  transaction: Transaction,
  invoice: any,
  remainingPayment: number,
  remarks: string,
  allocations: PaymentAllocation[]
): number {
  const owedAmount = invoice.amount - (invoice.paidAmount || 0);
  if (owedAmount <= 0) {
    return remainingPayment;
  }

  const applyAmount = Math.min(remainingPayment, owedAmount);
  applyPaymentToInvoice(transaction, invoice, applyAmount, remarks);

  allocations.push({
    ledgerId: invoice.id,
    billingPeriod: invoice.billingPeriod,
    amount: applyAmount,
  });

  return remainingPayment - applyAmount;
}

// ─── DATE & ELIGIBILITY CONVENTIONS ──────────────────────────────────────────

/**
 * Increments a YYYY-MM period string by exactly one month.
 */
export function nextBillingPeriod(period: string): { period: string; year: number; month: number } {
  let [year, month] = period.split("-").map(Number);
  month++;
  
  if (month > 12) {
    month = 1;
    year++;
  }
  
  const nextPeriod = `${year}-${month.toString().padStart(2, "0")}`;
  return { period: nextPeriod, year, month };
}

/**
 * Checks if a student is eligible to receive a bill for a given YYYY-MM period.
 */
export function isStudentBillableForPeriod(studentData: any, period: string): boolean {
  if (studentData.status !== "active") {
    return false;
  }
  
  if (studentData.billingActiveFrom && period < studentData.billingActiveFrom) {
    return false;
  }
  
  return true;
}
