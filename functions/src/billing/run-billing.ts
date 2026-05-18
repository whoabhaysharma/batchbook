/**
 * Daily Invoicing Sweep & Manual Trigger API
 * 
 * Modularizes the billing sweep engine into a single business routine.
 * Exposes two entry points for execution:
 * 1. Scheduled Cron Job (runBillingJob) - Runs daily at 6:00 AM IST.
 * 2. HTTP Request Trigger (triggerBillingManual) - Exposes a manual triggering API.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { db, FieldValue } from "../admin";
import * as logger from "firebase-functions/logger";
import { getKolkataBillingPeriod, getActiveEnrollments } from "./billing-utils";

/**
 * Filter students eligible for billing in the current month's sweep.
 * 
 * A student is eligible if:
 * 1. Their designated billing day has arrived (billingDay <= currentDay).
 * 2. If a billing start month is set, the current month matches or is after it.
 */
function getEligibleStudents(students: any[], billingMonthId: string, currentDay: number): any[] {
  return students.filter((student: any) => {
    // 1. Ensure billing day has arrived
    const billingDay = student.billingDay || 1;
    if (billingDay > currentDay) {
      return false;
    }

    // 2. Ensure current period is active for billing
    if (student.billingActiveFrom && billingMonthId < student.billingActiveFrom) {
      return false;
    }

    return true;
  });
}

/**
 * Evaluates active enrollments and creates a monthly invoice for a single student if eligible.
 * Returns the outcome status, amount, and skip reasons.
 */
async function generateMonthlyInvoice(
  student: any,
  billingMonthId: string,
  billingMonthLabel: string,
  today: Date
): Promise<{ status: "created" | "skipped" | "error"; amount?: number; reason?: string }> {
  // Deterministic invoice ID structure prevents duplicate invoicing
  const ledgerId = `${student.id}_${billingMonthId}`;
  const ledgerDocRef = db.collection("invoice").doc(ledgerId);
  const ledgerDocSnap = await ledgerDocRef.get();

  // 1. Prevent double invoicing
  if (ledgerDocSnap.exists) {
    return { status: "skipped", reason: "already billed for this month" };
  }

  // 2. Fetch all subject enrollments for the student
  const enrollmentsSnap = await db.collection("subject_enrollments")
    .where("studentId", "==", student.id)
    .get();

  const enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 3. Resolve active subject enrollments for the student's monthly due date
  const billingDay = student.billingDay || 1;
  const dueDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  const activeEnrollments = getActiveEnrollments(enrollments, dueDate.getTime());
  const totalAmount = activeEnrollments.reduce((acc, curr: any) => acc + (curr.monthlyFee || 0), 0);

  // If there are no active subject enrollments or fees, we skip invoice generation
  if (totalAmount <= 0) {
    return { status: "skipped", reason: "no active subject enrollments with non-zero fee" };
  }

  // 4. Validate tuition association
  if (!student.tuitionId) {
    logger.error(`Student ${student.id} (${student.name}) is missing tuitionId. Skipping invoice.`);
    return { status: "error", reason: "missing tuitionId" };
  }

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
    remarks: `Automated bill for ${billingMonthLabel}. Generated via Scheduled Cloud Function.`,
    createdAt: FieldValue.serverTimestamp(),
  };

  // Write new invoice securely
  await ledgerDocRef.set(ledgerData);

  return { status: "created", amount: totalAmount };
}

/**
 * Shared Core Logic representing a single billing period sweep.
 */
async function executeBillingSweep(today: Date): Promise<{
  timestamp: string;
  summary: {
    totalActiveStudents: number;
    eligibleBillingDayReached: number;
    newInvoicesCreated: number;
  };
  details: any[];
}> {
  // Secure current period and day in Asia/Kolkata timezone
  const { billingPeriod: billingMonthId, rawKolkataDate: kolkataDate } = getKolkataBillingPeriod(today);
  const currentDay = kolkataDate.getDate();

  const billingMonthLabel = kolkataDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });

  logger.info(`🚀 Starting Automated Billing Sweep for ${billingMonthLabel} (Today: Day ${currentDay})`);

  // 1. Fetch all active students in the system
  const studentsSnap = await db.collection("students")
    .where("status", "==", "active")
    .get();

  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2. Identify students whose billing day has arrived
  const targetStudents = getEligibleStudents(students, billingMonthId, currentDay);

  const detailedResults: any[] = [];
  let createdCount = 0;

  // 3. Process each eligible student sequentially
  for (const student of targetStudents) {
    try {
      const outcome = await generateMonthlyInvoice(student, billingMonthId, billingMonthLabel, kolkataDate);

      if (outcome.status === "created") {
        createdCount++;
        detailedResults.push({
          name: student.name,
          status: "created",
          amount: outcome.amount,
        });
      } else {
        detailedResults.push({
          name: student.name,
          status: outcome.status,
          reason: outcome.reason,
        });
      }
    } catch (studentErr: any) {
      logger.error(`❌ Error billing student ${student.id} (${student.name}):`, studentErr);
      detailedResults.push({
        name: student.name,
        status: "error",
        reason: studentErr.message || "Failed during individual database operation",
      });
    }
  }

  logger.info(`🏁 Billing Sweep Complete. Generated ${createdCount} new invoices.`);

  return {
    timestamp: kolkataDate.toISOString(),
    summary: {
      totalActiveStudents: students.length,
      eligibleBillingDayReached: targetStudents.length,
      newInvoicesCreated: createdCount,
    },
    details: detailedResults,
  };
}

/**
 * Scheduled Cron Job to trigger the daily billing sweep.
 * Executes every single day at 6:00 AM IST (Asia/Kolkata).
 */
export const runBillingJob = onSchedule({
  schedule: "0 6 * * *",
  timeZone: "Asia/Kolkata",
}, async (event) => {
  try {
    const today = new Date();
    const results = await executeBillingSweep(today);
    logger.info("🏁 Scheduled Billing Sweep Complete. Summary:", results);
  } catch (error: any) {
    logger.error("🚨 Critical error during scheduled billing sweep job execution:", error);
    throw error; // Re-throw to propagate failure state to the Scheduler logs
  }
});

/**
 * Public HTTPS Function to manually trigger the billing sweep API.
 * Allows admins to execute manual sweeps on demand.
 */
export const triggerBillingManual = onRequest({ cors: true }, async (req, res) => {
  try {
    const today = new Date();
    const results = await executeBillingSweep(today);
    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    logger.error("🚨 Critical error during manual billing sweep trigger:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal billing system manual execution failure",
    });
  }
});
