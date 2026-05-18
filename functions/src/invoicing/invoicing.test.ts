/**
 * Billing Engine Standard Jest Test Suite
 * 
 * Verifies all date timezone operations, enrollment filters, sweep rules,
 * FIFO allocations, and prepayment rollovers using standard Jest syntax.
 */

import { getKolkataBillingPeriod, isEnrollmentActive } from "./invoicing-utils";
import { 
  buildInvoicePayload, 
  sortInvoicesFIFO, 
  nextBillingPeriod, 
  isStudentBillableForPeriod 
} from "./payment-helpers";

describe("1. Asia/Kolkata Timezone & Billing Period", () => {
  it("resolves UTC time correctly to Kolkata YYYY-MM period", () => {
    // 10:00 AM UTC = 3:30 PM IST (same day)
    const period = getKolkataBillingPeriod(new Date("2026-05-18T10:00:00Z"));
    
    expect(period.billingPeriod).toBe("2026-05");
    expect(period.year).toBe(2026);
    expect(period.month).toBe(5);
    expect(period.day).toBe(18);
  });

  it("handles day-rollover at the 5:30 hour offset boundary", () => {
    // 10:00 PM UTC = 3:30 AM IST (next day, May 19 IST!)
    const period = getKolkataBillingPeriod(new Date("2026-05-18T22:00:00Z"));
    
    expect(period.billingPeriod).toBe("2026-05");
    expect(period.day).toBe(19);
  });
});

describe("2. Active Subject Enrollments Checks", () => {
  const mockActive = { status: "active", subject: "Mathematics", monthlyFee: 1500 };
  const mockInactive = { status: "inactive", subject: "Physics", monthlyFee: 1200 };

  it("identifies active status without date parameters as active", () => {
    expect(isEnrollmentActive(mockActive, Date.now())).toBe(true);
  });

  it("skips inactive status regardless of date", () => {
    expect(isEnrollmentActive(mockInactive, Date.now())).toBe(false);
  });

  it("ignores start bounds for billing calculations (activateAt)", () => {
    const activateAt = new Date("2026-05-10").getTime();
    const enrollment = { ...mockActive, activateAt };

    // Keeps start date for reference, but enrollment remains active for billing even if current date is before start date
    expect(isEnrollmentActive(enrollment, new Date("2026-05-15").getTime())).toBe(true);
    expect(isEnrollmentActive(enrollment, new Date("2026-05-05").getTime())).toBe(true);
  });

  it("ignores end bounds for billing calculations (deactivateAt)", () => {
    const activateAt = new Date("2026-05-10").getTime();
    const deactivateAt = new Date("2026-05-20").getTime();
    const enrollment = { ...mockActive, activateAt, deactivateAt };

    // Keeps end date for reference, but enrollment remains active for billing even if current date is after end date
    expect(isEnrollmentActive(enrollment, new Date("2026-05-15").getTime())).toBe(true);
    expect(isEnrollmentActive(enrollment, new Date("2026-05-25").getTime())).toBe(true);
  });
});

describe("3. Invoicing Eligibility Checks", () => {
  const studentActive = { status: "active", billingActiveFrom: "2026-05" };
  const studentInactive = { status: "inactive", billingActiveFrom: "2026-05" };
  const studentFuture = { status: "active", billingActiveFrom: "2026-06" };

  it("approves active student for current active period", () => {
    expect(isStudentBillableForPeriod(studentActive, "2026-05")).toBe(true);
  });

  it("skips inactive student", () => {
    expect(isStudentBillableForPeriod(studentInactive, "2026-05")).toBe(false);
  });

  it("skips active student whose billingActiveFrom period hasn't started yet", () => {
    expect(isStudentBillableForPeriod(studentFuture, "2026-05")).toBe(false);
  });

  it("approves student once billingActiveFrom period matches current period", () => {
    expect(isStudentBillableForPeriod(studentFuture, "2026-06")).toBe(true);
  });
});

describe("4. Invoice Payload Builders", () => {
  const studentId = "student_123";
  const tuitionId = "tuition_abc";
  const enrollments = [
    { status: "active", subject: "Maths", monthlyFee: 1000 },
    { status: "active", subject: "Science", monthlyFee: 1500 },
    { status: "inactive", subject: "Arts", monthlyFee: 800 }
  ];

  it("builds correct amounts and includes only active enrollment subjects", () => {
    const payload = buildInvoicePayload(
      studentId,
      tuitionId,
      "2026-05",
      5,
      2026,
      5,
      enrollments
    );

    expect(payload).not.toBeNull();
    if (payload) {
      expect(payload.amount).toBe(2500);
      expect(payload.remainingAmount).toBe(2500);
      expect(payload.status).toBe("pending");
      expect(payload.subjects.length).toBe(2);
      expect(payload.subjects[0].subject).toBe("Maths");
      expect(payload.subjects[1].subject).toBe("Science");
    }
  });
});

describe("5. Chronological FIFO Sorting", () => {
  const invoices = [
    { id: "inv_1", billingPeriod: "2026-04", status: "pending" as const },
    { id: "inv_2", billingPeriod: "2026-02", status: "partial" as const },
    { id: "inv_3", billingPeriod: "2026-03", status: "pending" as const },
    { id: "inv_4", billingPeriod: "2026-01", status: "paid" as const } // should be filtered out
  ];

  it("removes fully paid invoices and sorts unpaid ones chronologically", () => {
    const sorted = sortInvoicesFIFO(invoices);
    
    expect(sorted.length).toBe(3);
    expect(sorted[0].billingPeriod).toBe("2026-02");
    expect(sorted[1].billingPeriod).toBe("2026-03");
    expect(sorted[2].billingPeriod).toBe("2026-04");
  });
});

describe("6. Overpayment Futures & Month 12 Rollovers", () => {
  it("advances standard monthly period values", () => {
    const next = nextBillingPeriod("2026-05");
    
    expect(next.period).toBe("2026-06");
    expect(next.year).toBe(2026);
    expect(next.month).toBe(6);
  });

  it("rolls over month 12 cleanly to month 1 of the following year", () => {
    const next = nextBillingPeriod("2026-12");
    
    expect(next.period).toBe("2027-01");
    expect(next.year).toBe(2027);
    expect(next.month).toBe(1);
  });
});
