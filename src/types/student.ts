export interface Student {
  id: string; // Firebase document ID
  rollNumber: string; // Format: [Abbreviation][4-digit number], e.g., BB0001
  rollSeq: number; // Numeric part for sorting/indexing, e.g., 1
  name: string;
  batch: string;
  tuitionId: string; // Linked tuition
  status: "PAID" | "UNPAID";
  avatar?: string;
  email?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  createdAt: number;
}

export type CreateStudentInput = Omit<Student, "id" | "rollNumber" | "rollSeq" | "createdAt" | "avatar">;
