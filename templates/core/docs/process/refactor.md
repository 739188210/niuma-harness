# Refactor Process

Use this playbook when restructuring code while preserving its intended behavior.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for refactor execution.

## Goal

Make the smallest useful structural improvement without changing intended behavior.

## Steps

1. Load task-relevant context through `{{HARNESS_DIR}}/docs/layers/01-context.md`; include the affected implementation and tests.
2. Check Policy: classify intended refactor actions with `{{HARNESS_DIR}}/docs/policy/action-boundary.md` before acting. Pay special attention to broad, risky, force-style, behavior-adjacent, or test-changing refactors.
3. State the refactor goal and the behavior that must remain unchanged.
4. Identify the verification baseline before editing. Treat the baseline verification as the behavior boundary for the refactor.
5. Split the refactor into small reversible steps.
6. Change only files needed for the refactor goal.
7. Run focused verification after meaningful steps.
8. Stop if behavior changes, verification fails, or the work expands into a feature.
9. Record changed structure, verification evidence, skipped checks, and remaining unknowns, including any behavior-specific material risks.

## Scope guard

Do not mix refactor with new behavior unless the user explicitly asks. Do not clean up unrelated code just because it is nearby.

Changing tests during a refactor is ask-first unless the change is purely mechanical and preserves the same assertions. Do not update snapshots, loosen assertions, skip tests, or change verification config to accommodate the refactor.

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
