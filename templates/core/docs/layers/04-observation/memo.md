# Observation Layer Memo

## Purpose

Define how an AI agent knows whether the workspace is healthy, broken, or unverified. This layer turns claims of completion into evidence.

## When to use

Use this layer before declaring work complete, after any code or documentation change, after recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove the task goal.
2. Prefer project-local commands documented in `docs/index.md`.
3. Run focused checks first, then broader checks when justified.
4. Record exact commands, results, skipped checks, and reasons.
5. Treat unrun checks as unknown, not as passing.

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

## Outputs

- Verification commands run and their results.
- Manual checks performed, if any.
- Skipped checks and why they were skipped.
- Remaining risk or unknown status.

## Links to other layers

- Context: `docs/layers/01-context/memo.md`
- Policy: `docs/layers/02-policy/memo.md`
- Process: `docs/layers/03-process/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Task work area: `agent-work/`
