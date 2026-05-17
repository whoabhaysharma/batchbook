import { collection, query, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, where, and, updateDoc, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import { Student, CreateStudentInput } from "../types/student";
import { Batch, CreateBatchInput } from "../types/batch";
import { SubjectEnrollment, CreateEnrollmentInput } from "../types/enrollment";
import { FeeLedger, CreateLedgerInput } from "../types/ledger";


export async function createLedger(ledger: CreateLedgerInput): Promise<string> {
  const db = getFirebaseDb();
  const id = `${ledger.studentId}_${ledger.billingPeriod}`;
  const docRef = doc(db, "ledger", id);
  await setDoc(docRef, {
    ...ledger,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function checkExistingLedger(studentId: string, billingPeriod: string): Promise<boolean> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("studentId", "==", studentId),
    where("billingPeriod", "==", billingPeriod)
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
export async function getMonthlyRevenue(tuitionId: string, billingPeriod: string): Promise<number> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "ledger"),
    where("tuitionId", "==", tuitionId),
    where("billingPeriod", "==", billingPeriod)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.reduce((acc, doc) => acc + (doc.data().paidAmount || 0), 0);
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
    const month = data.billingPeriod;
    if (month) {
      history[month] = (history[month] || 0) + (data.paidAmount || 0);
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

export async function recordStudentPayment(
  studentId: string,
  tuitionId: string,
  paymentAmount: number,
  remarks?: string
): Promise<void> {
  const db = getFirebaseDb();
  let remainingPayment = paymentAmount;

  // 1. Fetch all invoices for the student
  const q = query(
    collection(db, "ledger"),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  const allInvoices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeLedger));

  // Filter out paid or cancelled ones, and sort chronologically by billingPeriod (oldest first)
  const unpaidInvoices = allInvoices
    .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
    .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod));

  // 2. Allocate payment to existing unpaid invoices
  for (const invoice of unpaidInvoices) {
    const remainingInvoice = invoice.amount - (invoice.paidAmount || 0);
    if (remainingInvoice <= 0) continue;

    const applyAmount = Math.min(remainingPayment, remainingInvoice);

    const updatedPaid = (invoice.paidAmount || 0) + applyAmount;
    const updatedRemaining = invoice.amount - updatedPaid;
    const updatedStatus = updatedRemaining === 0 ? "paid" : "partial";

    // Update document in Firestore
    const docRef = doc(db, "ledger", invoice.id);
    await updateDoc(docRef, {
      paidAmount: updatedPaid,
      remainingAmount: updatedRemaining,
      status: updatedStatus,
      paidAt: updatedStatus === "paid" ? Date.now() : invoice.paidAt || Date.now(),
      remarks: remarks || invoice.remarks || "",
      updatedAt: serverTimestamp()
    });

    remainingPayment -= applyAmount;
    if (remainingPayment <= 0) break;
  }

  // 3. Handle Advance Payments: Lazily generate future invoices if payment remains!
  if (remainingPayment > 0) {
    // Determine the latest billing period in the database for this student
    const sortedAll = allInvoices.sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod));
    let latestPeriod = sortedAll.length > 0 ? sortedAll[0].billingPeriod : "";

    // If no invoices exist, default to the current period (YYYY-MM)
    if (!latestPeriod) {
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, "0");
      latestPeriod = `${y}-${m}`;
    }

    // Get the student details to fetch their billingDay
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      const billingDay = studentData.billingDay || 1;

      // Sequence future billing periods
      let [year, month] = latestPeriod.split("-").map(Number);

      while (remainingPayment > 0) {
        // Increment month
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        const futurePeriod = `${year}-${month.toString().padStart(2, "0")}`;
        const futureInvoiceDate = new Date(year, month - 1, billingDay);

        // Fetch subject enrollments for the student
        const enrollmentsSnap = await getDocs(
          query(collection(db, "subject_enrollments"), where("studentId", "==", studentId))
        );
        const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter active enrollments as of futureInvoiceDate
        const activeEnrollments = enrollments.filter((e: any) => {
          const startedTime = e.startedAt?.toMillis ? e.startedAt.toMillis() : new Date(e.startedAt).getTime();
          const endedTime = e.endedAt ? (e.endedAt.toMillis ? e.endedAt.toMillis() : new Date(e.endedAt).getTime()) : null;
          const invoiceTime = futureInvoiceDate.getTime();
          return startedTime <= invoiceTime && (endedTime === null || endedTime > invoiceTime);
        });

        const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

        if (totalAmount > 0) {
          const ledgerId = `${studentId}_${futurePeriod}`;
          const applyAmount = Math.min(remainingPayment, totalAmount);

          const newInvoiceData = {
            studentId,
            tuitionId,
            billingPeriod: futurePeriod,
            dueDate: futureInvoiceDate.getTime(),
            amount: totalAmount,
            paidAmount: applyAmount,
            remainingAmount: totalAmount - applyAmount,
            subjects: activeEnrollments.map((e: any) => ({
              enrollmentId: e.id || "",
              subject: e.subject,
              monthlyFee: e.monthlyFee
            })),
            status: (totalAmount - applyAmount === 0 ? "paid" : "partial") as any,
            generatedFrom: "lazy" as const,
            paidAt: Date.now(),
            remarks: `Prepayment invoice for ${futurePeriod}. Generated lazily.`,
            createdAt: serverTimestamp(),
          };

          // Save deterministic document
          await setDoc(doc(db, "ledger", ledgerId), newInvoiceData);

          remainingPayment -= applyAmount;
        } else {
          // If no active enrollments exist for this future period, break to avoid infinite loop
          break;
        }
      }
    }
  }

  // 4. Log the transaction receipt in the payments collection
  await addDoc(collection(db, "payments"), {
    studentId,
    tuitionId,
    amount: paymentAmount,
    paymentDate: Date.now(),
    remarks: remarks || "",
    createdAt: serverTimestamp()
  });
}

export async function recordAdHocPayment(payment: { 
  studentId: string;
  tuitionId: string;
  amount: number;
  billingMonth: string;
  remarks?: string;
}): Promise<void> {
  await recordStudentPayment(payment.studentId, payment.tuitionId, payment.amount, payment.remarks);
}
