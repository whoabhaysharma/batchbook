/**
 * Main export file for Firebase Functions.
 */

// Onboarding functions
export { setupTuition } from "./onboarding/setup-tuition";

// Student functions
export { createStudent } from "./students/create-student";
export { onStudentCreate } from "./students/on-student-create";

// Billing functions
export { runBillingJob } from "./billing/run-billing";
export { recordPayment } from "./billing/record-payment";

