# BatchBook Test Cases

## Application analysis summary
BatchBook is a tuition-center management app with an onboarding-first flow: authenticated users are routed to either setup or the main app based on whether a tuition profile exists. Core operational logic currently exposed in shared modules includes tuition code generation, student roll-number formatting, and date/time formatting for schedules and monthly periods.

## Modular (unit) test cases

| TC ID | Module | Scenario | Preconditions | Steps | Test Data | Expected Result |
|---|---|---|---|---|---|---|
| UT-TUI-001 | `suggestTuitionCode` | 3-word name generates acronym | None | Call function with 3 words | `"Abhay Brilliant Classes"` | Returns `"ABC"` |
| UT-TUI-002 | `suggestTuitionCode` | 2-word name generates first letter + next 2 letters | None | Call function with 2 words | `"Prime Academy"` | Returns `"PAC"` |
| UT-TUI-003 | `suggestTuitionCode` | Single-word name truncates and uppercases | None | Call function with 1 word | `"zenith"` | Returns `"ZEN"` |
| UT-TUI-004 | `suggestTuitionCode` | Invalid chars stripped and short values padded | None | Call function with symbols | `"a$"` | Returns `"AXX"` |
| UT-STU-001 | `formatRollNumber` | Roll number is 3-digit padded | None | Call function | `num=7,prefix="ABC"` | Returns `"ABC007"` |
| UT-STU-002 | `formatRollNumber` | Large sequence not truncated | None | Call function | `num=1205,prefix="ABC"` | Returns `"ABC1205"` |

## Integration test cases

| TC ID | Flow | Scenario | Preconditions | Steps | Test Data | Expected Result |
|---|---|---|---|---|---|---|
| IT-ONB-001 | Onboarding + Student Identity | Tuition code and first roll-number pattern are consistent | Utility modules available | 1) Generate tuition code 2) Generate first student roll number from code | Name: `"Abhay Brilliant Classes"`, Seq: `1` | Code is `ABC`; roll number is `ABC001` |
| IT-SCH-001 | Schedule + Invoicing Period | Dashboard-visible period and time range strings are correctly generated | Utility modules available | 1) Build period string from date 2) Format period label 3) Format class time range | Date: `2026-05-18`, Start: `09:00 AM`, End: `10:30 AM` | Period key `2026-05`, label `May 2026`, range `09:00 AM - 10:30 AM` |

## Automation mapping
- `tests/unit/tuition.test.ts`: UT-TUI-001..004
- `tests/unit/students.test.ts`: UT-STU-001..002
- `tests/integration/onboarding-formatting.test.ts`: IT-ONB-001, IT-SCH-001
