import { onRequest } from "firebase-functions/v2/https";
import { db, FieldValue } from "../admin";
import * as logger from "firebase-functions/logger";

/**
 * Public HTTP Function to manually trigger the billing job.
 * Logic: Sweeps all students, calculates dues from normalized enrollments, 
 * and creates ledger entries for the current month if they don't exist.
 */
export const runBillingJob = onRequest({ cors: true }, async (req, res) => {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const billingMonthId = `${year}-${month}`;
    const billingMonthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    logger.info(`Starting Billing Sweep for ${billingMonthLabel} (Today: ${currentDay})`);

    // 1. Fetch all active students
    const studentsSnap = await db.collection("students")
      .where("status", "==", "active")
      .get();

    const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Filter students whose billing day has arrived or passed
    const targetStudents = students.filter((s: any) => s.billingDay <= currentDay);

    const results: any[] = [];
    let createdCount = 0;

    for (const student of targetStudents as any[]) {
      // 3. Check if bill already exists for this month
      const ledgerSnap = await db.collection("ledger")
        .where("studentId", "==", student.id)
        .where("billingMonth", "==", billingMonthId)
        .get();

      if (ledgerSnap.empty) {
        // 4. Fetch active subject enrollments for this student
        const enrollmentsSnap = await db.collection("subject_enrollments")
          .where("studentId", "==", student.id)
          .where("status", "==", "active")
          .get();

        const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
        const totalAmount = enrollments.reduce((acc, curr) => acc + (curr.monthlyFee || 0), 0);

        if (totalAmount > 0) {
          const dueDate = new Date(today.getFullYear(), today.getMonth(), student.billingDay);

          if (!student.tuitionId) {
            logger.error(`Student ${student.id} (${student.name}) is missing tuitionId. Skipping.`);
            results.push({ name: student.name, status: "error", reason: "missing tuitionId" });
            continue;
          }

          const ledgerData = {
            studentId: student.id,
            tuitionId: student.tuitionId,
            amount: totalAmount,

            status: "pending",
            billingMonth: billingMonthId,
            dueDate: dueDate.getTime(),
            remarks: `Automated bill for ${billingMonthLabel}. Generated via Public Cloud Function.`,
            createdAt: FieldValue.serverTimestamp(),
          };

          await db.collection("ledger").add(ledgerData);

          createdCount++;
          results.push({ name: student.name, status: "created", amount: totalAmount });
        } else {
          results.push({ name: student.name, status: "skipped", reason: "no active enrollments" });
        }
      } else {
        results.push({ name: student.name, status: "skipped", reason: "already billed for this month" });
      }
    }

    logger.info(`Billing Sweep Complete. Created ${createdCount} bills.`);

    res.json({
      success: true,
      timestamp: today.toISOString(),
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
