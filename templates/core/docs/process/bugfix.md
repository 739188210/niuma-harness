# Bugfix Process

Use this playbook to fix a defect with evidence that the behavior is corrected and existing behavior is not unexpectedly broken.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process/memo.md` for routing rules and this file for bugfix execution.

## Goal

Repair the smallest relevant cause of a defect and verify the corrected behavior.

## Steps

1. Load Context: read `docs/index.md`, `docs/project-context.md`, and the affected source or test files.
2. Check Policy: use `docs/policy/action-boundary.md` and pause when the next action is ask-first or forbidden.
3. Understand the symptom, expected behavior, and current behavior.
4. Reproduce the issue with a test, command, log, or manual steps. If reproduction is not achievable, record what was attempted; the fix stays unverified until the symptom can be shown to disappear.
5. Identify the first root cause instead of chasing downstream symptoms.
6. Implement the smallest safe fix.
7. Observe: run the focused verification that proves the bug is fixed.
8. Run broader checks when the touched area is shared or high risk.
9. Record what changed, what passed, what failed, what was skipped, and remaining risk.

## Recovery

Use `docs/layers/05-recovery/memo.md` when reproduction fails, tests fail, commands fail, context is missing, or a fix attempt does not work.

Do not delete failing tests, weaken assertions, disable checks, or keep retrying the same approach without new evidence.

## Memory

Use `docs/layers/06-memory/memo.md` before preserving any new project fact. Keep temporary debugging notes in the workspace-level `agent-work/` directory; write only verified durable facts to `docs/project-context.md`.

## Outputs

- Root cause or best verified explanation.
- Files changed.
- Verification evidence.
- Skipped checks and why.
- Remaining risk or follow-up.
