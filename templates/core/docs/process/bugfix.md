# Bugfix Process

Use this playbook when fixing a bug or defect in current behavior.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for bugfix execution.

## Goal

Repair the smallest relevant cause of a defect and verify the corrected behavior.

## Required artifact/checklist

Before reporting completion, make sure the task record or final response includes:

- Symptom, expected behavior, and current behavior.
- Reproduction signal before the fix, or explicit reason reproduction was not achieved.
- First root cause or best verified explanation.
- Files changed.
- Passing fix verification against the same reproduction target.
- Skipped checks and remaining unknowns, including any material risks.

## Steps

1. Load Context: read `{{HARNESS_DIR}}/docs/index.md`, `{{HARNESS_DIR}}/docs/project-context.md`, and the affected source or test files.
2. Check Policy: use `{{HARNESS_DIR}}/docs/policy/action-boundary.md` and pause when the next action is ask-first or forbidden.
3. Understand the symptom, expected behavior, and current behavior.
4. When the symptom is stably automatable, capture it as a focused failing regression test before the fix. The reproduction check is a verification target: follow `{{HARNESS_DIR}}/docs/process/test-driven-development.md` and make that same target pass afterward.
5. When reproduction is not achievable, record what was attempted and declare a valid alternative-verification plan before the fix. The fix stays unverified until the symptom can be shown to disappear; report the implemented mitigation and remaining unknown instead of claiming the bug is fixed.
6. Identify the first root cause instead of chasing downstream symptoms.
7. Implement the smallest safe fix.
8. Observe: run the focused verification that proves the bug is fixed.
9. Run broader checks when the touched area is shared or high risk.
10. Record what changed, what passed, what failed, what was skipped, and remaining unknowns, including any material risks.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when reproduction fails, tests fail, commands fail, context is missing, or a fix attempt does not work.

Do not delete failing tests, weaken assertions, disable checks, or keep retrying the same approach without new evidence.

If a test appears wrong, follow the test-change gate in `{{HARNESS_DIR}}/docs/policy/action-boundary.md` before changing it. Document the expected behavior evidence and replace invalid tests with equivalent or stronger coverage; never remove the only reproduction without a replacement.

## Memory

Use `{{HARNESS_DIR}}/docs/layers/06-memory.md` before preserving any new project fact. Keep temporary debugging notes in the workspace-level `agent-work/` directory; write only verified durable facts to `{{HARNESS_DIR}}/docs/project-context.md`.

