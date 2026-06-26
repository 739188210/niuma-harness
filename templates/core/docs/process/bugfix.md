# Bugfix Process

## Goal

Fix a defect with evidence that the behavior is corrected and existing behavior is not unexpectedly broken.

## Steps

1. Understand the symptom and expected behavior.
2. Locate the relevant code path.
3. Reproduce the issue with a test, command, or manual steps when practical.
4. Implement the smallest safe fix.
5. Run focused verification.
6. Run broader regression checks when the touched area is shared.
7. Report root cause, changed files, verification result, and residual risk.

## Notes

If reproduction is not possible in the current environment, document the missing condition and the exact verification steps to run later.
