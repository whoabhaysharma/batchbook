import type { Student } from "../../../src/types/student";
import type { SubjectEnrollment } from "../../../src/types/enrollment";
import type { Invoice } from "../../../src/types/invoice";

export type { Student, SubjectEnrollment as Enrollment, Invoice };

/**
 * Returns the current year, month, and YYYY-MM billing period code
 * formatted securely in Asia/Kolkata timezone.
 */
export function getKolkataBillingPeriod(date: Date = new Date()): { 
  billingPeriod: string; 
  year: number; 
  month: number; 
  rawKolkataDate: Date;
} {
  const kolkataStr = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const rawKolkataDate = new Date(kolkataStr);
  const year = rawKolkataDate.getFullYear();
  const month = rawKolkataDate.getMonth() + 1;
  const billingPeriod = `${year}-${month.toString().padStart(2, "0")}`;
  
  return { billingPeriod, year, month, rawKolkataDate };
}

/**
 * Determines whether a subject enrollment was active at a given invoice timestamp.
 */
export function isEnrollmentActive(enrollment: any, invoiceTime: number): boolean {
  if (!enrollment || !enrollment.startedAt) return false;
  
  const startedTime = enrollment.startedAt.toMillis 
    ? enrollment.startedAt.toMillis() 
    : new Date(enrollment.startedAt).getTime();
  
  const endedTime = enrollment.endedAt 
    ? (enrollment.endedAt.toMillis ? enrollment.endedAt.toMillis() : new Date(enrollment.endedAt).getTime())
    : null;

  return startedTime <= invoiceTime && (endedTime === null || endedTime > invoiceTime);
}

/**
 * Filter list of enrollments to find only those active at a specific timestamp.
 */
export function getActiveEnrollments(enrollments: any[], invoiceTime: number): any[] {
  return enrollments.filter(e => isEnrollmentActive(e, invoiceTime));
}
