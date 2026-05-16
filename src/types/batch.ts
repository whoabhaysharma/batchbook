export interface Batch {
  id: string;
  name: string;
  students: number;
  time: string; // e.g., "09:00 AM"
  status: "active" | "inactive";
  tuitionId: string;
  createdAt: any; // Firestore Timestamp
}


export type CreateBatchInput = Omit<Batch, "id" | "createdAt" | "students">;
