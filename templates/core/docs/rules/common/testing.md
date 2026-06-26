# Testing Rules

## Default expectation

Changes should be verified before being called complete.

## Test-first preference

For behavior changes:

1. Reproduce the current behavior or failure.
2. Add or update a focused test when practical.
3. Implement the smallest fix.
4. Run the relevant verification commands.

## Reporting

Always report:

- commands run
- whether they passed or failed
- important skipped checks and why

Do not claim completion when relevant tests fail unless the user explicitly accepts the remaining risk.
