export interface Payment {
  id: string;
  studentId: string;
  tuitionId: string;
  amount: number;
  paymentDate: number;
  remarks: string;
  createdAt: any;
}
