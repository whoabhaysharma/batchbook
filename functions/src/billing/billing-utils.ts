/**
 * Billing Utilities & Helper Functions
 * 
 * Provides timezone-safe date operations and subject enrollment active-state logic
 * to ensure consistent invoice period calculations and accurate fee computation.
 */

import type { Student } from "../../../src/types/student";
import type { SubjectEnrollment } from "../../../src/types/enrollment";
import type { Invoice } from "../../../src/types/invoice";

export type { Student, SubjectEnrollment as Enrollment, Invoice };

/**
 * Calculations are anchored in the Asia/Kolkata timezone to ensure local Indian Standard Time (IST) alignment.
 * Returns the current year, month, day, and billing period formatted as "YYYY-MM" (e.g., "2026-05").
 */
export function getKolkataBillingPeriod(date: Date = new Date()): {
  billingPeriod: string;
  year: number;
  month: number;
  day: number;
  rawKolkataDate: Date;
} {
  // Use Intl formatter to securely resolve parts in the Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value, 10);
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10);
  const day = parseInt(parts.find(p => p.type === "day")!.value, 10);

  const billingPeriod = `${year}-${month.toString().padStart(2, "0")}`;
  const rawKolkataDate = new Date(year, month - 1, day);

  return { billingPeriod, year, month, day, rawKolkataDate };
}

/**
 * Checks if a specific subject enrollment is active.
 * 
 * An enrollment is active if:
 * 1. Its status field is "active".
 * 2. If a start timestamp is specified, the invoice date is greater or equal to it.
 * 3. If an end timestamp is specified, the invoice date is strictly before it.
 */
export function isEnrollmentActive(enrollment: any, invoiceTimeMs: number): boolean {
  if (!enrollment || enrollment.status !== "active") {
    return false;
  }

  // Check optional startedAt boundary if present
  if (enrollment.startedAt) {
    const startedTimeMs = enrollment.startedAt.toMillis
      ? enrollment.startedAt.toMillis()
      : new Date(enrollment.startedAt).getTime();
    
    if (startedTimeMs > invoiceTimeMs) {
      return false;
    }
  }

  // Check optional endedAt boundary if present
  if (enrollment.endedAt) {
    const endedTimeMs = enrollment.endedAt.toMillis
      ? enrollment.endedAt.toMillis()
      : new Date(enrollment.endedAt).getTime();
    
    if (endedTimeMs <= invoiceTimeMs) {
      return false;
    }
  }

  return true;
}

/**
 * Filters the list of enrollments to return only those active at a specific timestamp.
 */
export function getActiveEnrollments(enrollments: any[], invoiceTimeMs: number): any[] {
  return enrollments.filter(e => isEnrollmentActive(e, invoiceTimeMs));
}
