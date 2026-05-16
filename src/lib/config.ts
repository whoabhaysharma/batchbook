/**
 * Application Defaults
 * These are fallback values. Real tuition data is fetched from Firestore.
 */
export const DEFAULT_APP_NAME = "BatchBook";

/**
 * Generates a basic abbreviation from a name.
 * Real abbreviations are stored in the 'tuitions' collection.
 */
export function generateBasicAbbreviation(name: string): string {
  return name
    .split(/(?=[A-Z])|\s|_/)
    .map(word => word.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .substring(0, 3);
}
