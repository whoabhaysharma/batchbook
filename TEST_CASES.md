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
| UT-TUI-005 | `suggestTuitionCode` | Extra spaces are normalized | None | Call function | `"   Abhay     Brilliant   Classes   "` | Returns `"ABC"` |
| UT-TUI-006 | `suggestTuitionCode` | Punctuation/numbers are ignored | None | Call function | `"Class 101 @ Zenith!"` | Returns `"CZE"` |
| UT-TUI-007 | `suggestTuitionCode` | Non-letter input falls back to X padding | None | Call function | `"1234 @@@"` | Returns `"XXX"` |
| UT-TUI-008 | `suggestTuitionCode` | Two-word edge case with short second token | None | Call function | `"Prime A"` | Returns `"PAX"` |
| UT-STU-001 | `formatRollNumber` | Roll number is 3-digit padded | None | Call function | `num=7,prefix="ABC"` | Returns `"ABC007"` |
| UT-STU-002 | `formatRollNumber` | Large sequence not truncated | None | Call function | `num=1205,prefix="ABC"` | Returns `"ABC1205"` |
| UT-STU-003 | `formatRollNumber` | Zero sequence formats correctly | None | Call function | `num=0,prefix="ABC"` | Returns `"ABC000"` |
| UT-STU-004 | `formatRollNumber` | Prefix casing is preserved | None | Call function | `num=5,prefix="abC"` | Returns `"abC005"` |
| UT-UTL-001 | `formatTimeSlot` | Hours/minutes are zero-padded | None | Call function | `{hour:9, minute:5, period:"AM"}` | Returns `"09:05 AM"` |
| UT-UTL-002 | `formatTimeRange` | Missing endpoints return fallback | None | Call function with missing start/end | `undefined` endpoints | Returns `"Flexible"` |
| UT-UTL-003 | `formatPeriod` | Valid `YYYY-MM` renders human label | None | Call function | `"2026-05"` | Returns `"May 2026"` |
| UT-UTL-004 | `formatPeriod` | Invalid input returns as-is | None | Call function | `""`, `"202605"` | Returns unchanged input |
| UT-UTL-005 | `getPeriodString` | Month is always zero-padded | None | Call function | `Date("2026-01-15")` | Returns `"2026-01"` |

## Integration test cases

| TC ID | Flow | Scenario | Preconditions | Steps | Test Data | Expected Result |
|---|---|---|---|---|---|---|
| IT-ONB-001 | Onboarding + Student Identity | Tuition code and first roll-number pattern are consistent | Utility modules available | 1) Generate tuition code 2) Generate first student roll number from code | Name: `"Abhay Brilliant Classes"`, Seq: `1` | Code is `ABC`; roll number is `ABC001` |
| IT-ONB-002 | Onboarding + Sequencing | Generated roll numbers preserve prefix and sequence progression | Utility modules available | 1) Generate code from tuition name 2) Generate roll numbers for sequences 2 and 125 | Name: `"Prime Academy"`, Seq: `2`, `125` | Code `PAC`; rolls `PAC002`, `PAC125` |
| IT-BIL-001 | Billing UI formatting | Dashboard-visible period and time range strings are correctly generated | Utility modules available | 1) Build period key from date 2) Format period label 3) Format class time range | Date: `2026-05-18`, Start: `09:00 AM`, End: `10:30 AM` | Key `2026-05`, label `May 2026`, range `09:00 AM - 10:30 AM` |
| IT-BIL-002 | Billing UI formatting | Early month period remains zero-padded and readable | Utility modules available | 1) Build period key from January date 2) Format period label | Date: `2026-01-02` | Key `2026-01`, label `January 2026` |

## Automation mapping
- `tests/unit/tuition.test.ts`: UT-TUI-001..008
- `tests/unit/students.test.ts`: UT-STU-001..004
- `tests/unit/utils.test.ts`: UT-UTL-001..005
- `tests/integration/onboarding-flow.integration.test.ts`: IT-ONB-001..002
- `tests/integration/billing-formatting.integration.test.ts`: IT-BIL-001..002
