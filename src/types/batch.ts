export interface TimeSlot {
  hour: number;
  minute: number;
  period: "AM" | "PM";
}

export interface Batch {
  id: string;
  name: string;
  students: number;
  startTime: TimeSlot;
  endTime: TimeSlot;
  status: "active" | "inactive";
  tuitionId: string;
  createdAt: any; // Firestore Timestamp
  description?: string;
  color?: string;
}


export type CreateBatchInput = Omit<Batch, "id" | "createdAt" | "students">;
