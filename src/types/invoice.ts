export interface Invoice {
  id: string;

  studentId: string;
  tuitionId: string;

  billingPeriod: string; // Format: YYYY-MM (e.g. 2026-08)

  dueDate: number; // Unix timestamp

  amount: number; // Total invoice amount

  paidAmount: number; // Total paid against this invoice

  remainingAmount: number; // amount - paidAmount

  subjects: {
    enrollmentId: string;
    subject: string;
    monthlyFee: number;
  }[];

  status:
    | "pending"
    | "partial"
    | "paid"
    | "overdue"
    | "cancelled";

  generatedFrom: "cron" | "lazy";

  paidAt?: number;

  transactionId?: string;

  remarks?: string;

  createdAt: any; // Firestore ServerTimestamp
}

export type CreateInvoiceInput = Omit<Invoice, "id" | "createdAt">;
