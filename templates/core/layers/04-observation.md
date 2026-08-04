# Observation Layer Memo

## Purpose

Define how an AI agent knows whether the requested result is verified, failed, blocked, or still unknown. This layer turns completion claims into observed evidence.

## When to use

Use this layer before declaring work complete, after any code or documentation change, after recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove the task goal.
2. Prefer project-local commands documented in `{{HARNESS_DIR}}/docs/project-context.md`; use `{{HARNESS_DIR}}/docs/index.md` only as navigation.
3. Run focused checks first, then broader checks when justified by the changed risk.
4. Record only checks actually run, their actual results, skipped checks with reasons and impact, and remaining unknowns.
5. For Direct work, put that record in the final response. For status-tracked work, put it in `agent-work/tasks/<task-name>/status.md`.
6. Treat unrun checks as unknown, not as passing.
7. If verification fails, treat the failing check as evidence. Do not change the verification target unless the selected process permits it and the reason is recorded.

## Evidence boundaries

Evidence is scoped. Do not upgrade one evidence type into another:

- A focused test passing does not prove full regression passed.
- A build passing does not prove typecheck passed.
- A typecheck passing does not prove a runtime workflow passed.
- A migration source existing does not prove it was applied to a target database.
- An unauthenticated browser visit does not prove authenticated user acceptance.
- A suspected pre-existing failure does not prove a verified baseline.

When a broader check fails and the agent believes it is outside the task scope, retain that failed or unknown result. Treat the overall conclusion as partial or unknown unless current evidence establishes a baseline, proves the failure is outside the changed scope, or another trusted source establishes it.

## Evidence record

Record concise, human-readable facts where the task path requires them:

- the check or manual verification step and expected signal when useful;
- the actual result, including relevant failure information;
- every skipped check, its reason, and unresolved impact; and
- remaining unknowns, or an explicit statement that none material remain.

For Direct work, this belongs in the final response. For status-tracked work, `status.md` is the task-local evidence record as well as the current operational ledger. Do not backfill observations after completion.

Test-first RED, GREEN, and optional refactor recheck are defined by `{{HARNESS_DIR}}/docs/process/test-driven-development.md`; record their actual results as ordinary observations without restating that protocol here.

For parallel or delegated work, final Observation verifies the integrated result. Per-part checks are supporting evidence unless they directly prove the final state.

## Allowed actions

- Run tests, lint, typecheck, build, and local validation commands that match the task.
- Inspect failure output and summarize the first root failure.
- Capture manual verification steps when automated checks are not available.
- Record known limitations or skipped checks in `status.md` or the final response.

## Forbidden actions

- Do not claim success without evidence.
- Do not hide, truncate away, or ignore relevant failure output.
- Do not mark skipped checks as passing.
- Do not broaden verification commands endlessly when a focused failure already identifies the issue.
- Do not move verification targets after a failure to turn red into green.
- Do not rebaseline snapshots, loosen assertions, skip tests, lower coverage, or change check configuration unless permitted by the test-change gate in `{{HARNESS_DIR}}/docs/policy/action-boundary.md`; then record why the previous target was invalid and what replacement coverage preserves the behavior contract.

## Outputs

- Actual checks and results.
- Manual checks performed, if any.
- Skipped checks and why they were skipped.
- Remaining unknowns, including material risks.
- A truthful conclusion: complete only when material acceptance is verified; otherwise partial, blocked, failed, stopped, or unknown as applicable.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Task work area: `agent-work/`
