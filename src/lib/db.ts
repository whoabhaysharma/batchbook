import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface Batch {
  id: string;
  name: string;
  students: number;
  time: string;
  status: string;
  color: string;
}

export interface Student {
  id: string;
  name: string;
  batch: string;
  status: string;
  avatar: string;
}

export async function getBatches(): Promise<Batch[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "batches"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
}

export async function getStudents(): Promise<Student[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "students"));
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
