# Refactor Process

Use this playbook when restructuring code while preserving its intended behavior.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for refactor execution.

## Goal

Make the smallest useful structural improvement without changing intended behavior.

## Steps

1. Apply the base minimum reading set and conditional reads in `{{HARNESS_DIR}}/docs/process/task-triage.md`, then inspect the affected implementation and tests and identify the behavior baseline.
2. State the refactor goal and the behavior that must remain unchanged.
3. Identify the verification baseline before editing. Treat the baseline verification as the behavior boundary for the refactor.
4. Split the refactor into small reversible steps.
5. Change only files needed for the refactor goal.
6. Run focused verification after meaningful steps.
7. Stop if behavior changes, verification fails, or the work expands into a feature. Route behavior changes or behavior-changing tests through feature/bugfix plus `{{HARNESS_DIR}}/docs/process/test-driven-development.md`.
8. Record changed structure, verification evidence, skipped checks, and remaining unknowns, including any behavior-specific material risks.

## Scope guard

Do not mix refactor with new behavior unless the user explicitly asks. Do not clean up unrelated code just because it is nearby.

Changing tests during a refactor is ask-first unless the change is purely mechanical and preserves the same assertions. Do not manufacture an artificial RED for a pure refactor. Do not update snapshots, loosen assertions, skip tests, or change verification config to accommodate the refactor.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when verification fails, behavior changes unexpectedly, or the refactor cannot be kept small and reversible.

## Memory and task notes

For multi-step refactors, keep status, context, plan, verification, and handoff notes under `agent-work/tasks/<task-name>/`.

## Required artifact/checklist

Before reporting completion, include:

- Refactor goal.
- Behavior baseline that must remain unchanged.
- Scope boundary: what is intentionally not changed.
- Files changed.
- Verification evidence before and after where practical.
- Skipped checks and why.
- Remaining unknowns, behavior-specific material risks, or follow-up.
