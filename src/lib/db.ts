import { collection, query, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, where, and, updateDoc, setDoc } from "firebase/firestore";

import { getFirebaseDb, getFirebaseFunctions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { Student, CreateStudentInput } from "../types/student";
import { Batch, CreateBatchInput } from "../types/batch";
import { SubjectEnrollment, CreateEnrollmentInput } from "../types/enrollment";
import { Invoice, CreateInvoiceInput } from "../types/invoice";


export async function createLedger(ledger: CreateInvoiceInput): Promise<string> {
  const db = getFirebaseDb();
  const id = `${ledger.studentId}_${ledger.billingPeriod}`;
  const docRef = doc(db, "invoice", id);
  await setDoc(docRef, {
    ...ledger,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function checkExistingLedger(studentId: string, billingPeriod: string): Promise<boolean> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "invoice"),
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
    where("studentId", "==", studentId)
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
    collection(db, "invoice"),
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

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "students", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  } as any);
}

export async function updateBatch(id: string, updates: Partial<Batch>): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "batches", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  } as any);
}


export async function createEnrollment(enrollment: CreateEnrollmentInput): Promise<string> {
  const functions = getFirebaseFunctions();
  const enrollFn = httpsCallable<{
    studentId: string;
    tuitionId: string;
    subject: string;
    monthlyFee: number;
  }, { id: string }>(functions, "enrollSubject");
  const result = await enrollFn({
    studentId: enrollment.studentId,
    tuitionId: enrollment.tuitionId,
    subject: enrollment.subject,
    monthlyFee: enrollment.monthlyFee,
  });
  return result.data.id;
}

export async function deactivateEnrollment(id: string): Promise<void> {
  const functions = getFirebaseFunctions();
  const deactivateFn = httpsCallable<{ enrollmentId: string }, { success: boolean }>(functions, "deactivateSubject");
  await deactivateFn({ enrollmentId: id });
}

export async function getLedgerEntries(): Promise<Invoice[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "invoice"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
}
export async function getMonthlyRevenue(tuitionId: string, billingPeriod: string): Promise<number> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "invoice"),
    where("tuitionId", "==", tuitionId),
    where("billingPeriod", "==", billingPeriod)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.reduce((acc, doc) => acc + (doc.data().paidAmount || 0), 0);
}

export async function getRevenueHistory(tuitionId: string): Promise<{ month: string, amount: number }[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "invoice"),
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
  const q = query(collection(db, "invoice"), where("tuitionId", "==", tuitionId));
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

// ==============================================================================
// 1. Client-Side Billing & Invoicing Helpers (Used for manual operations)
// ==============================================================================

/**
 * Returns the current billing period code in "YYYY-MM" format.
 */
function getCurrentBillingPeriod(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

interface ActiveEnrollmentFilterParams {
  status: string;
  activateAt?: any;
  deactivateAt?: any;
  invoiceTime?: number;
}

/**
 * Evaluates if a subject enrollment is active.
 * Keeps only active/inactive dates for reference, but billing calculations are not affected by them.
 */
function isEnrollmentActive({ status }: ActiveEnrollmentFilterParams): boolean {
  return status === "active";
}

/**
 * Lazily creates the current month's invoice in Firestore if it doesn't exist yet.
 */
async function lazyGenerateCurrentInvoice(
  db: any,
  studentId: string,
  tuitionId: string,
  billingPeriod: string,
  billingDay: number,
  studentData: Student,
  allInvoices: Invoice[]
): Promise<void> {
  const currentLedgerId = `${studentId}_${billingPeriod}`;
  const currentInvoiceExists = allInvoices.some(inv => inv.id === currentLedgerId);

  const isCurrentActive = studentData.status === "active";
  const isCurrentPeriodActive = !studentData.billingActiveFrom || billingPeriod >= studentData.billingActiveFrom;

  if (!currentInvoiceExists && isCurrentActive && isCurrentPeriodActive) {
    const enrollmentsSnap = await getDocs(
      query(collection(db, "subject_enrollments"), where("studentId", "==", studentId))
    );
    const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const today = new Date();
    const invoiceDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    const activeEnrollments = enrollments.filter((e: any) =>
      isEnrollmentActive({
        status: e.status,
        activateAt: e.activateAt,
        deactivateAt: e.deactivateAt,
        invoiceTime: invoiceDate.getTime()
      })
    );

    const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

    if (totalAmount > 0) {
      const newInvoiceData: CreateInvoiceInput = {
        studentId,
        tuitionId,
        billingPeriod,
        dueDate: invoiceDate.getTime(),
        amount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        subjects: activeEnrollments.map((e: any) => ({
          enrollmentId: e.id || "",
          subject: e.subject,
          monthlyFee: e.monthlyFee
        })),
        status: "pending",
        generatedFrom: "lazy",
        remarks: `Prepayment invoice for ${billingPeriod}. Generated lazily during payment processing.`,
      };

      const ledgerDocRef = doc(db, "invoice", currentLedgerId);
      await setDoc(ledgerDocRef, {
        ...newInvoiceData,
        createdAt: serverTimestamp()
      });

      allInvoices.push({ id: currentLedgerId, ...newInvoiceData, createdAt: new Date() } as Invoice);
    }
  }
}

/**
 * Distributes payment funds across a list of unpaid invoices in FIFO order.
 */
async function allocatePaymentToUnpaidInvoices(
  db: any,
  unpaidInvoices: Invoice[],
  remainingPayment: number,
  remarks?: string
): Promise<number> {
  let paymentLeft = remainingPayment;

  for (const invoice of unpaidInvoices) {
    const remainingInvoice = invoice.amount - (invoice.paidAmount || 0);
    if (remainingInvoice <= 0) continue;

    const applyAmount = Math.min(paymentLeft, remainingInvoice);

    const updatedPaid = (invoice.paidAmount || 0) + applyAmount;
    const updatedRemaining = invoice.amount - updatedPaid;
    const updatedStatus = updatedRemaining === 0 ? "paid" : "partial";

    const docRef = doc(db, "invoice", invoice.id);
    await updateDoc(docRef, {
      paidAmount: updatedPaid,
      remainingAmount: updatedRemaining,
      status: updatedStatus,
      paidAt: updatedStatus === "paid" ? Date.now() : invoice.paidAt || Date.now(),
      remarks: remarks || invoice.remarks || "",
      updatedAt: serverTimestamp()
    });

    paymentLeft -= applyAmount;
    if (paymentLeft <= 0) break;
  }

  return paymentLeft;
}

/**
 * Pre-generates future months' invoices for overpayments.
 */
async function lazyGenerateFutureInvoices(
  db: any,
  studentId: string,
  tuitionId: string,
  billingDay: number,
  studentData: Student,
  allInvoices: Invoice[],
  remainingPayment: number
): Promise<void> {
  let paymentLeft = remainingPayment;
  if (paymentLeft <= 0) return;

  const sortedAll = allInvoices.sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod));
  let latestPeriod = sortedAll.length > 0 ? sortedAll[0].billingPeriod : "";

  if (!latestPeriod) {
    latestPeriod = getCurrentBillingPeriod();
  }

  let [year, month] = latestPeriod.split("-").map(Number);

  while (paymentLeft > 0) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    const futurePeriod = `${year}-${month.toString().padStart(2, "0")}`;

    const isFutureActive = studentData.status === "active";
    const isFuturePeriodActive = !studentData.billingActiveFrom || futurePeriod >= studentData.billingActiveFrom;

    if (!isFutureActive || !isFuturePeriodActive) {
      break;
    }

    const futureInvoiceDate = new Date(year, month - 1, billingDay);

    const enrollmentsSnap = await getDocs(
      query(collection(db, "subject_enrollments"), where("studentId", "==", studentId))
    );
    const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const activeEnrollments = enrollments.filter((e: any) =>
      isEnrollmentActive({
        status: e.status,
        activateAt: e.activateAt,
        deactivateAt: e.deactivateAt,
        invoiceTime: futureInvoiceDate.getTime()
      })
    );

    const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

    if (totalAmount > 0) {
      const ledgerId = `${studentId}_${futurePeriod}`;
      const applyAmount = Math.min(paymentLeft, totalAmount);

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

      await setDoc(doc(db, "invoice", ledgerId), newInvoiceData);
      paymentLeft -= applyAmount;
    } else {
      break;
    }
  }
}

/**
 * Audit logs the payment receipt in the database.
 */
async function logPaymentReceipt(
  db: any,
  studentId: string,
  tuitionId: string,
  amount: number,
  remarks?: string
): Promise<void> {
  await addDoc(collection(db, "payments"), {
    studentId,
    tuitionId,
    amount,
    paymentDate: Date.now(),
    remarks: remarks || "",
    createdAt: serverTimestamp()
  });
}

// ==============================================================================
// 2. High-Level Secure Financial API Methods
// ==============================================================================

/**
 * Records a student payment by invoking the secure, transaction-safe Cloud Function.
 */
export async function recordStudentPayment(
  studentId: string,
  tuitionId: string,
  paymentAmount: number,
  remarks?: string
): Promise<void> {
  const functionsInstance = getFirebaseFunctions();
  const recordPaymentFn = httpsCallable<any, any>(functionsInstance, "recordPayment");

  await recordPaymentFn({
    studentId,
    amount: paymentAmount,
    paymentMode: "cash", // Defaults to cash; Cloud Function resolves auth and executes FIFO allocations atomically
    remarks: remarks || "",
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

export async function getPayments(): Promise<any[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "payments"), orderBy("paymentDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function forceGenerateInvoice(
  studentId: string,
  tuitionId: string,
  billingPeriod: string
): Promise<string> {
  const db = getFirebaseDb();
  const ledgerId = `${studentId}_${billingPeriod}`;
  const docRef = doc(db, "invoice", ledgerId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    throw new Error("Invoice already exists for this period.");
  }

  // Fetch student
  const studentDoc = await getDoc(doc(db, "students", studentId));
  if (!studentDoc.exists()) {
    throw new Error("Student not found.");
  }
  const studentData = studentDoc.data() as Student;

  // Fetch enrollments
  const enrollmentsSnap = await getDocs(
    query(collection(db, "subject_enrollments"), where("studentId", "==", studentId))
  );
  const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const year = parseInt(billingPeriod.split("-")[0]);
  const month = parseInt(billingPeriod.split("-")[1]) - 1;
  const invoiceDate = new Date(year, month, studentData.billingDay || 1);

  const activeEnrollments = enrollments.filter((e: any) =>
    isEnrollmentActive({
      status: e.status,
      activateAt: e.activateAt,
      deactivateAt: e.deactivateAt,
      invoiceTime: invoiceDate.getTime()
    })
  );

  const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

  if (totalAmount <= 0) {
    throw new Error("No active subject enrollments found for this billing period.");
  }

  const newInvoiceData = {
    studentId,
    tuitionId,
    billingPeriod,
    dueDate: invoiceDate.getTime(),
    amount: totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    subjects: activeEnrollments.map((e: any) => ({
      enrollmentId: e.id || "",
      subject: e.subject,
      monthlyFee: e.monthlyFee
    })),
    status: "pending",
    generatedFrom: "forced" as const,
    remarks: `Forced manual invoice generation for ${billingPeriod}.`,
    createdAt: serverTimestamp()
  };

  await setDoc(docRef, newInvoiceData);
  return ledgerId;
}

export async function triggerManualInvoiceGeneration(
  studentId: string,
  tuitionId: string
): Promise<string> {
  const db = getFirebaseDb();

  // 1. Fetch Student Details
  const studentDoc = await getDoc(doc(db, "students", studentId));
  if (!studentDoc.exists()) {
    throw new Error("Student not found.");
  }
  const studentData = studentDoc.data() as Student;
  const billingDay = studentData.billingDay || 1;
  const billingPeriod = getCurrentBillingPeriod();

  const currentLedgerId = `${studentId}_${billingPeriod}`;

  // 2. Fetch all existing invoices
  const q = query(collection(db, "invoice"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  let allInvoices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));

  const currentInvoiceExists = allInvoices.some(inv => inv.id === currentLedgerId);
  if (currentInvoiceExists) {
    throw new Error(`Invoice for the current period (${billingPeriod}) already exists.`);
  }

  if (studentData.status !== "active") {
    throw new Error("Cannot trigger invoice generation for an inactive or on-hold student.");
  }

  // 3. Trigger lazy generate
  await lazyGenerateCurrentInvoice(db, studentId, tuitionId, billingPeriod, billingDay, studentData, allInvoices);

  // 4. Verify it generated successfully
  const postGenSnap = await getDoc(doc(db, "invoice", currentLedgerId));
  if (!postGenSnap.exists()) {
    throw new Error("Job completed but no invoice was generated (verify the student has active subject enrollments for this month).");
  }

  return billingPeriod;
}


export async function getInvoicesByStudentId(studentId: string): Promise<Invoice[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "invoice"), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
  return data.sort((a, b) => (b.billingPeriod > a.billingPeriod ? 1 : -1));
}

export async function getPaymentsByStudentId(studentId: string): Promise<any[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "payments"), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  return data.sort((a, b) => b.paymentDate - a.paymentDate);
}


