export interface FeeLedger {
  id: string;
  studentId: string;
  tuitionId: string;
  amount: number;
  dueDate: number; // Unix timestamp
  billingMonth: string; // e.g., "May 2026"
  status: "pending" | "paid" | "overdue" | "cancelled";
  paidAt?: number;
  transactionId?: string;
  remarks?: string;
  createdAt: any; // Firestore ServerTimestamp
}


export type CreateLedgerInput = Omit<FeeLedger, "id" | "createdAt">;
