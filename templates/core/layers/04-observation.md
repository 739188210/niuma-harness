# Observation Layer Memo

## Purpose

Define how an AI agent knows whether the workspace is healthy, broken, or unverified. This layer turns claims of completion into evidence.

## When to use

Use this layer before declaring work complete, after any code or documentation change, after recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove the task goal.
2. Prefer project-local commands documented in `{{HARNESS_DIR}}/docs/project-context.md`; use `{{HARNESS_DIR}}/docs/index.md` only as navigation.
3. Run focused checks first, then broader checks when justified.
4. A task plan may design which success criteria need evidence, but `verification.md` records only checks actually run and their results. Do not backfill evidence after completion.
5. Record check, expected signal, actual result, skipped checks, and remaining unknowns wherever the task-material selection requires: `verification.md` for a task record, or the final response for Direct work.
6. Treat unrun checks as unknown, not as passing.
7. If verification fails, treat the failing check as evidence. Do not change the verification target unless the selected process permits it and the reason is recorded.

## Evidence record

Verification evidence owns exact commands, expected signals, actual results, skipped checks with reasons, and remaining unknowns. For the copyable `verification.md` schema, use `agent-work/README.md`; it is the only copyable schema authority. Keep exactly one schema 1 marker block when `verification.md` is used. `kind` is `command`, `manual`, or `review`; `outcome` is `passed`, `failed`, `skipped`, or `unknown`. A passed/failed command requires an integer `exitCode` (`0` for passed, non-zero for failed); skipped/unknown command evidence uses `null`. Use stable unique evidence IDs, and use an empty `remainingUnknowns` array only when nothing material remains unknown. Record a skipped check with `outcome: "skipped"`, the reason in `actualResult`, and its unresolved impact in `remainingUnknowns`.

Test-first RED, GREEN, and optional refactor recheck are defined by `{{HARNESS_DIR}}/docs/process/test-driven-development.md`; record their actual results as ordinary evidence without restating that protocol here.

## Evidence ownership

Verification evidence owns exact commands, expected signals, actual results, skipped checks with reasons, and remaining unknowns. It is the source of truth for whether a task is verified, failed, skipped, or still unknown.

`status.md` may summarize verification state, but it does not replace evidence. When a ledger is used, store enough evidence detail in task notes or final output for another agent to understand what was checked.

For parallel or delegated work, final Observation verifies the integrated result. Per-part checks are supporting evidence unless they directly prove the final state.

## Allowed actions

- Run tests, lint, typecheck, build, and local validation commands that match the task.
- Inspect failure output and summarize the first root failure.
- Capture manual verification steps when automated checks are not available.
- Record known limitations or skipped checks in task notes and final reports.

## Forbidden actions

- Do not claim success without evidence.
- Do not hide, truncate away, or ignore relevant failure output.
- Do not mark skipped checks as passing.
- Do not broaden verification commands endlessly when a focused failure already identifies the issue.
- Do not move verification targets after a failure to turn red into green.
- Do not rebaseline snapshots, loosen assertions, skip tests, lower coverage, or change check configuration unless permitted by the test-change gate in `{{HARNESS_DIR}}/docs/policy/action-boundary.md`; then record why the previous target was invalid and what replacement coverage preserves the behavior contract.

## Outputs

- Evidence records with check, expected signal, actual result, skipped checks, and remaining unknowns.
- Verification commands run and their results.
- Manual checks performed, if any.
- Skipped checks and why they were skipped.
- Verification target changes, if any, with the reason and replacement coverage.
- Remaining unknowns, including material risks.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Task work area: `agent-work/`
