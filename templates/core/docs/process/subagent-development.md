# Subagent Development Process

Use this playbook when coordinating large or risky work across isolated subagents with fresh-context dispatch and staged review.

This is a cross-cutting playbook selected by the Process layer, like `docs/process/isolation.md`. Use `docs/layers/03-process.md` for routing. This is a recommended workflow, not a hard constraint; single-agent work does not require it.

## Goal

Improve quality on large or risky work by separating implementation context from review context, without forcing a specific runtime or tool.

## When to dispatch

Dispatch subagents when any hold:

- Multi-part task where parts can be worked with independent context.
- Risky change where a second isolated view (someone who did not write the code) is valuable.
- Long task where accumulated context degrades quality (context compaction risk).

Do not dispatch for trivial single-step tasks. Dispatch has coordination cost.

## Dispatch principles

- Fresh context per subagent: each implementer subagent starts clean; do not paste the parent's entire history.
- Artifacts over diffs: hand the task scope and the file paths; let the subagent read files itself. Do not paste large diffs into the prompt.
- Task-scoped mandate: give the subagent one bounded goal, a success check, and the relevant process playbook (`feature-development.md` / `refactor.md` / `bugfix.md`).
- Keep state in `agent-work/`: record current stage, next action, completed steps, and parent `status.md` updates under `agent-work/tasks/<task>/` so any subagent can resume.

## Two-stage review

After a task part is implemented, review it in two focused passes. Each pass can be a separate read-only subagent, or the same agent switching roles:

1. Spec compliance — does the change meet the stated goal and acceptance criteria? (use `docs/process/review.md` step 3, severity from `review.md`)
2. Code quality — correctness, security, maintainability, coverage, evidence. (use `docs/process/review.md` steps 4-6)

Reviewer rules:

- The reviewer did not write the code it reviews (isolate reviewer context).
- The reviewer is read-only: it classifies findings, it does not implement fixes.
- Fix only on explicit user approval (`review.md` step 8); route fixes through the relevant bugfix/refactor/feature playbook.
- Do not pre-judge severity to game the review gate.

## Parent integration gate

The parent flow or active task owner owns the final integrated result. Subagents may produce parts, findings, notes, or evidence, but they do not independently declare the overall task complete.

Before accepting delegated work, the parent must collect each part's scope, changed or reviewed files, verification evidence, unresolved risks or blockers, and recovery state if any.

Before finalizing, check for:

- Overlapping edits to the same files.
- Incompatible assumptions between delegated outputs.
- Stale task state or conflicting verification claims.
- Unresolved CRITICAL or HIGH review findings.
- Skipped checks that affect integrated behavior.

Merge delegated outputs intentionally. If outputs conflict, enter Recovery instead of silently choosing one. Keep the parent `status.md` ledger current with the integrated state.

After accepting delegated parts, run or record a final Observation over the integrated workspace. Per-part verification is supporting evidence, not a replacement for integrated verification.

## Agent-agnostic notes

This playbook uses action semantics: "dispatch a subagent with isolated context", "hand the subagent file paths and a bounded goal". It does not name a specific tool. Map it to whatever subagent or task mechanism the current runtime provides (or none).

If the current environment has no subagent capability, degrade gracefully: perform the two-stage review as two sequential self-review passes with the same separation (first spec compliance only, then code quality only), using the checklist above, and keep notes in `agent-work/tasks/<task>/`.

## Boundaries

- Dispatch is about context separation; workspace separation is `docs/process/isolation.md`. They compose (isolate the worktree, then dispatch subagents inside it) but are not the same thing.
- This playbook does not push, merge, or delete. See `docs/policy/action-boundary.md`.
- Two-stage review reuses `docs/process/review.md` severity and the "fix only on approval" rule; it does not redefine severity.

## Recovery

Use `docs/layers/05-recovery.md` when a subagent's output fails its own verification, when review finds CRITICAL or HIGH findings, or when the staged flow itself stalls (a stage cannot complete).

## Outputs

- Tasks dispatched (scope, target files, playbook used).
- Review findings per stage, grouped by severity.
- Blocking issues resolved or escalated.
- Verification evidence for each accepted part.
- Current stage and next action (resumable from `agent-work/tasks/<task>/`).
