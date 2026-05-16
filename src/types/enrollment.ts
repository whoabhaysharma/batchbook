export interface SubjectEnrollment {
  id: string;
  tuitionId: string;
  studentId: string;
  subject: string;
  monthlyFee: number;
  startedAt: any; // Firestore ServerTimestamp or ISO date
  endedAt: any | null;
  status: "active" | "inactive";
}

export type CreateEnrollmentInput = Omit<SubjectEnrollment, "id" | "startedAt">;
