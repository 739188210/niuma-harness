# Bugfix Process

Use this playbook when fixing a defect in current behavior.

## Goal

Repair the smallest relevant cause and verify the corrected behavior.

## Steps

1. Apply the base reading and conditional routing in `{{HARNESS_DIR}}/docs/process/task-triage.md`, then inspect the symptom, affected source or tests, and the smallest reproduction target.
2. State expected behavior, current behavior, and the reproduction signal. Use `agent-work/README.md` to select Direct, a plan, or a status ledger.
3. When stable automation is available, capture the symptom as a focused failing regression test and follow `{{HARNESS_DIR}}/docs/process/test-driven-development.md`; make that same target pass after the fix.
4. When reproduction is unavailable, record what was attempted and define alternative evidence before editing. Report remaining unknowns rather than claiming the bug is fixed without proof.
5. Identify the first root cause, implement the smallest safe fix, and run focused verification.
6. Run broader checks when the touched area is shared or high risk. Record actual evidence and outcome through `{{HARNESS_DIR}}/docs/layers/04-observation.md`.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when reproduction, commands, context, or a fix attempt fails. Do not delete failing tests, weaken assertions, disable checks, or retry the same approach without new evidence.

If a test appears wrong, follow the test-change gate in `{{HARNESS_DIR}}/docs/policy/action-boundary.md`. Never remove the only reproduction without equivalent or stronger replacement coverage.

## Memory

Route verified durable findings through `{{HARNESS_DIR}}/docs/layers/06-memory.md`.
