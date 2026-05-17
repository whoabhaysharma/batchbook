import { onRequest } from "firebase-functions/v2/https";
import { db, FieldValue } from "../admin";
import * as logger from "firebase-functions/logger";
import { getKolkataBillingPeriod, getActiveEnrollments } from "./billing-utils";

/**
 * Filters out students based on their designated billing day and active billing start period.
 */
function filterTargetStudents(students: any[], billingMonthId: string, currentDay: number): any[] {
  return students.filter((s: any) => {
    if (s.billingDay > currentDay) return false;
    if (s.billingActiveFrom && billingMonthId < s.billingActiveFrom) return false;
    return true;
  });
}

/**
 * Invoices an individual student for the current billing cycle if no previous bill exists.
 * Returns the status, generated invoice amount, and optional skip reason.
 */
async function billIndividualStudent(
  student: any,
  billingMonthId: string,
  billingMonthLabel: string,
  today: Date
): Promise<{ status: "created" | "skipped" | "error"; amount?: number; reason?: string }> {
  const ledgerId = `${student.id}_${billingMonthId}`;
  const ledgerDocRef = db.collection("invoice").doc(ledgerId);
  const ledgerDocSnap = await ledgerDocRef.get();

  // 1. Prevent duplicate invoicing
  if (ledgerDocSnap.exists) {
    return { status: "skipped", reason: "already billed for this month" };
  }

  // 2. Fetch all subject enrollments
  const enrollmentsSnap = await db.collection("subject_enrollments")
    .where("studentId", "==", student.id)
    .get();

  const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // 3. Filter only active enrollments for today
  const activeEnrollments = getActiveEnrollments(enrollments, today.getTime());
  const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

  if (totalAmount <= 0) {
    return { status: "skipped", reason: "no active enrollments" };
  }

  // 4. Validate tuition mapping
  if (!student.tuitionId) {
    logger.error(`Student ${student.id} (${student.name}) is missing tuitionId. Skipping.`);
    return { status: "error", reason: "missing tuitionId" };
  }

  const dueDate = new Date(today.getFullYear(), today.getMonth(), student.billingDay || 1);

  const ledgerData = {
    studentId: student.id,
    tuitionId: student.tuitionId,
    billingPeriod: billingMonthId,
    dueDate: dueDate.getTime(),
    amount: totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    subjects: activeEnrollments.map((e: any) => ({
      enrollmentId: e.id || "",
      subject: e.subject,
      monthlyFee: e.monthlyFee
    })),
    status: "pending" as const,
    generatedFrom: "cron" as const,
    remarks: `Automated bill for ${billingMonthLabel}. Generated via Public Cloud Function.`,
    createdAt: FieldValue.serverTimestamp(),
  };

  // Write new invoice record to Firestore
  await ledgerDocRef.set(ledgerData);

  return { status: "created", amount: totalAmount };
}

/**
 * Public HTTP Function to manually trigger the billing job.
 * Sweeps all active students, calculates dues from active enrollments, 
 * and creates ledger entries for the current month if missing.
 */
export const runBillingJob = onRequest({ cors: true }, async (req, res) => {
  try {
    const today = new Date();
    const { billingPeriod: billingMonthId, rawKolkataDate: kolkataDate } = getKolkataBillingPeriod(today);
    const currentDay = kolkataDate.getDate();
    
    const billingMonthLabel = kolkataDate.toLocaleString("default", { 
      month: "long", 
      year: "numeric", 
      timeZone: "Asia/Kolkata" 
    });

    logger.info(`Starting Billing Sweep for ${billingMonthLabel} (Today: ${currentDay})`);

    // 1. Fetch all active students
    const studentsSnap = await db.collection("students")
      .where("status", "==", "active")
      .get();

    const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Filter students based on billing cycle rules
    const targetStudents = filterTargetStudents(students, billingMonthId, currentDay);

    const results: any[] = [];
    let createdCount = 0;

    // 3. Process each eligible student
    for (const student of targetStudents) {
      try {
        const outcome = await billIndividualStudent(student, billingMonthId, billingMonthLabel, kolkataDate);
        
        if (outcome.status === "created") {
          createdCount++;
          results.push({ name: student.name, status: "created", amount: outcome.amount });
        } else {
          results.push({ name: student.name, status: outcome.status, reason: outcome.reason });
        }
      } catch (studentErr: any) {
        logger.error(`Error billing student ${student.id} (${student.name}):`, studentErr);
        results.push({ name: student.name, status: "error", reason: studentErr.message || "Failed during individual billing write" });
      }
    }

    logger.info(`Billing Sweep Complete. Created ${createdCount} bills.`);

    res.json({
      success: true,
      timestamp: kolkataDate.toISOString(),
      summary: {
        totalStudentsChecked: students.length,
        billingDayReached: targetStudents.length,
        newBillsGenerated: createdCount
      },
      details: results
    });

  } catch (error: any) {
    logger.error("Billing Job Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
