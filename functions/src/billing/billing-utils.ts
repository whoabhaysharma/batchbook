export interface Enrollment {
  id?: string;
  subject: string;
  monthlyFee: number;
  startedAt: any;
  endedAt: any;
  studentId: string;
  tuitionId: string;
}

export interface Student {
  id: string;
  name: string;
  tuitionId: string;
  billingDay?: number;
  billingActiveFrom?: string;
  status: "active" | "inactive" | "on-hold";
}

export interface Invoice {
  id: string;
  studentId: string;
  tuitionId: string;
  billingPeriod: string;
  dueDate: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  subjects: Array<{
    enrollmentId: string;
    subject: string;
    monthlyFee: number;
  }>;
  status: "pending" | "partial" | "paid" | "cancelled";
  generatedFrom: "lazy" | "cron" | "forced";
  remarks?: string;
  createdAt?: any;
}

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
