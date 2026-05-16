export interface Tuition {
  id: string;
  name: string;
  code: string; // 3 characters uppercase, globally unique
  ownerId: string;
  currentStudentSequence: number;
  createdAt: number;
}
