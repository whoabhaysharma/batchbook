import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebase";
import { Student, CreateStudentInput } from "../types/student";

/**
 * Formats a number into a 3-digit string with a prefix.
 * Example: (1, "ABC") -> ABC001
 */
export function formatRollNumber(num: number, prefix: string): string {
  return `${prefix}${num.toString().padStart(3, "0")}`;
}

/**
 * Creates a new student using a Firebase Cloud Function.
 * This ensures unique roll numbers and safe sequence incrementing.
 */
export async function createStudent(
  tuitionId: string,
  input: CreateStudentInput
): Promise<Student> {
  const functions = getFirebaseFunctions();
  const createStudentFn = httpsCallable<{
    tuitionId: string;
    studentData: CreateStudentInput;
  }, Student>(functions, "createStudent");

  const result = await createStudentFn({
    tuitionId,
    studentData: input,
  });

  return result.data;
}
