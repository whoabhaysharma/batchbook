export interface SubjectEnrollment {
  id: string;
  tuitionId: string;
  studentId: string;
  subject: string;
  monthlyFee: number;
  activateAt: any; // Timestamp when subject was enrolled/activated
  deactivateAt?: any | null; // Timestamp when subject was deactivated
  status: "active" | "inactive";
}

export type CreateEnrollmentInput = Omit<SubjectEnrollment, "id" | "activateAt">;
