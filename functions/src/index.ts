/**
 * Main export file for Firebase Functions.
 */

// Onboarding functions
export { setupTuition } from "./onboarding/setup-tuition";

// Student functions
export { createStudent } from "./students/create-student";
export { deactivateSubject, preventSubjectReactivation } from "./students/deactivate-subject";
export { enrollSubject } from "./students/enroll-subject";

// Invoicing functions
export { runInvoicingJob, triggerInvoicingManual } from "./invoicing/run-invoicing";
export { recordPayment } from "./invoicing/record-payment";

