# Testing Rules

## Purpose

These rules define testing preferences for engineering work. They supplement `docs/layers/04-observation.md`; use the Observation evidence schema as the source of truth for completion evidence.

## Test preference

For behavior changes, prefer focused automated tests that prove the intended behavior or reproduce the defect.

If automated tests are not practical, record the manual verification used instead and why.

## Test integrity

Do not weaken, skip, delete, or rebaseline tests to make work pass. Use `docs/policy/action-boundary.md` for the test-change gate.

## Reporting

Report relevant test or verification commands through the Observation evidence schema, including skipped checks and remaining unknowns.
