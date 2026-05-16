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



export async function getBatches(): Promise<Batch[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
}

export async function getStudents(): Promise<Student[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
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
