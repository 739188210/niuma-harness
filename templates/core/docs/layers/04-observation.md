# Observation Layer Memo

## Purpose

Define how an AI agent knows whether the workspace is healthy, broken, or unverified. This layer turns claims of completion into evidence.

## When to use

Use this layer before declaring work complete, after any code or documentation change, after recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove the task goal.
2. Prefer project-local commands documented in `docs/index.md`.
3. Run focused checks first, then broader checks when justified.
4. Record evidence using the schema below: check, expected signal, actual result, skipped checks, and remaining unknowns.
5. Treat unrun checks as unknown, not as passing.
6. If verification fails, treat the failing check as evidence. Do not change the verification target unless the selected process permits it and the reason is recorded.

## Evidence schema

Record verification evidence with these fields:

| Field | Meaning |
|---|---|
| Check | Exact command, manual action, or review performed. |
| Expected signal | The result that would prove the task goal or expose failure. |
| Actual result | Observed result, including pass/fail status, exit code when available, and the relevant output or finding. |
| Skipped checks | Checks not run, with the reason each was skipped. Use `None` only when no relevant checks were skipped. |
| Remaining unknowns | What is still unverified, risky, or dependent on external/user confirmation. Use `None` only when nothing material remains unknown. |

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
- Do not rebaseline snapshots, loosen assertions, skip tests, lower coverage, or change check configuration unless permitted by the test-change gate in `docs/policy/action-boundary.md`; then record why the previous target was invalid and what replacement coverage preserves the behavior contract.

## Outputs

- Evidence records with check, expected signal, actual result, skipped checks, and remaining unknowns.
- Verification commands run and their results.
- Manual checks performed, if any.
- Skipped checks and why they were skipped.
- Verification target changes, if any, with the reason and replacement coverage.
- Remaining risk or unknown status.

## Links to other layers

- Context: `docs/layers/01-context.md`
- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Recovery: `docs/layers/05-recovery.md`
- Task work area: `agent-work/`
