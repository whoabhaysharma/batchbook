export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  tuitionId?: string; // Linked tuition
  createdAt: number;
}
