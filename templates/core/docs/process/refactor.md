# Refactor Process

Use this playbook when restructuring code while preserving its intended behavior.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process/memo.md` for routing rules and this file for refactor execution.

## Goal

Make the smallest useful structural improvement without changing intended behavior.

## Steps

1. Load Context: read `docs/index.md`, `docs/project-context.md`, and the affected implementation and tests.
2. Check Policy: use `docs/policy/action-boundary.md` before broad, risky, or force-style changes. If this is multi-step or risky, isolate first (`docs/process/isolation.md`). For large refactors, consider staged subagent dispatch (`docs/process/subagent-development.md`).
3. State the refactor goal and the behavior that must remain unchanged.
4. Identify the verification baseline before editing. Treat the baseline verification as the behavior boundary for the refactor.
5. Split the refactor into small reversible steps.
6. Change only files needed for the refactor goal.
7. Run focused verification after meaningful steps.
8. Stop if behavior changes, verification fails, or the work expands into a feature.
9. Record changed structure, verification evidence, skipped checks, and remaining risk.

## Scope guard

Do not mix refactor with new behavior unless the user explicitly asks. Do not clean up unrelated code just because it is nearby.

Changing tests during a refactor is ask-first unless the change is purely mechanical and preserves the same assertions. Do not update snapshots, loosen assertions, skip tests, or change verification config to accommodate the refactor.

## Recovery

Use `docs/layers/05-recovery/memo.md` when verification fails, behavior changes unexpectedly, or the refactor cannot be kept small and reversible.

## Memory and task notes

For multi-step refactors, keep context, plan, verification, and handoff notes under `agent-work/tasks/<task-name>/`.

## Outputs

- Refactor goal.
- Behavior-preservation expectation.
- Files changed.
- Verification evidence before and after.
- Skipped checks and why.
- Remaining risk or follow-up.
