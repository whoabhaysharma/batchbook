import { collection, query, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, where, and, updateDoc } from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import { Student, CreateStudentInput } from "../types/student";
import { Batch, CreateBatchInput } from "../types/batch";
import { SubjectEnrollment, CreateEnrollmentInput } from "../types/enrollment";
import { FeeLedger, CreateLedgerInput } from "../types/ledger";


export async function createLedger(ledger: CreateLedgerInput): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "ledger"), {
    ...ledger,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function checkExistingLedger(studentId: string, billingMonth: string): Promise<boolean> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("studentId", "==", studentId),
    where("billingMonth", "==", billingMonth)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}


export async function getEnrollmentsByStudentId(studentId: string): Promise<SubjectEnrollment[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "subject_enrollments"), 
    where("studentId", "==", studentId),
    where("status", "==", "active")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectEnrollment));
}



export async function getTuition(id: string) {
  const db = getFirebaseDb();
  const docRef = doc(db, "tuitions", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getBatches(tuitionId?: string): Promise<Batch[]> {
  const db = getFirebaseDb();
  let q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
  if (tuitionId) {
    q = query(collection(db, "batches"), where("tuitionId", "==", tuitionId), orderBy("createdAt", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
}

export async function getStudents(tuitionId?: string): Promise<Student[]> {
  const db = getFirebaseDb();
  let q = query(collection(db, "students"), orderBy("createdAt", "desc"));
  if (tuitionId) {
    q = query(collection(db, "students"), where("tuitionId", "==", tuitionId), orderBy("createdAt", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
}

export async function getPendingDues(tuitionId: string): Promise<number> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("tuitionId", "==", tuitionId),
    where("status", "in", ["pending", "overdue"])
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const db = getFirebaseDb();
  const docRef = doc(db, "students", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Student;
  }
  return null;
}

export async function createBatch(batch: CreateBatchInput): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "batches"), {
    ...batch,
    students: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function createStudent(student: CreateStudentInput): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "students"), {
    ...student,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function createEnrollment(enrollment: CreateEnrollmentInput): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "subject_enrollments"), {
    ...enrollment,
    enrolledAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getLedgerEntries(): Promise<FeeLedger[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "ledger"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeLedger));
}

export async function updateLedgerStatus(id: string, updates: Partial<FeeLedger>): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "ledger", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
export async function getMonthlyRevenue(tuitionId: string, billingMonth: string): Promise<number> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("tuitionId", "==", tuitionId),
    where("billingMonth", "==", billingMonth)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
}

export async function getRevenueHistory(tuitionId: string): Promise<{ month: string, amount: number }[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("tuitionId", "==", tuitionId),
    orderBy("createdAt", "asc")
  );
  const querySnapshot = await getDocs(q);
  
  const history: Record<string, number> = {};
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const month = data.billingMonth;
    if (month) {
      history[month] = (history[month] || 0) + (data.amount || 0);
    }
  });

  return Object.entries(history).map(([month, amount]) => ({ month, amount }));
}

export async function getPaymentStats(tuitionId: string): Promise<{ status: string, count: number, amount: number }[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "ledger"), where("tuitionId", "==", tuitionId));
  const querySnapshot = await getDocs(q);
  
  const stats: Record<string, { count: number, amount: number }> = {
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
  };

  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status;
    if (stats[status]) {
      stats[status].count++;
      stats[status].amount += (data.amount || 0);
    }
  });

  return Object.entries(stats).map(([status, val]) => ({ status, ...val }));
}
