# Observation Layer Memo

## Purpose

Define how an AI agent knows whether the workspace is healthy, broken, or unverified. This layer turns claims of completion into evidence.

## When to use

Use this layer before declaring work complete, after any code or documentation change, after recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove the task goal.
2. Prefer project-local commands documented in `{{HARNESS_DIR}}/docs/project-context.md`; use `{{HARNESS_DIR}}/docs/index.md` only as navigation.
3. Run focused checks first, then broader checks when justified.
4. Record evidence using the schema below: check, expected signal, actual result, skipped checks, and remaining unknowns.
5. Treat unrun checks as unknown, not as passing.
6. If verification fails, treat the failing check as evidence. Do not change the verification target unless the selected process permits it and the reason is recorded.

## Evidence schema

In `agent-work/tasks/<task-name>/verification.md`, keep exactly one marker-delimited schema 1 JSON block. Copy this shape and replace the example evidence truthfully:

<!-- niuma-verification-record:begin -->
```json
{
  "schemaVersion": 1,
  "evidence": [
    {
      "id": "focused-tests",
      "kind": "command",
      "check": "node test/example.test.js",
      "expectedSignal": "The focused test exits successfully.",
      "actualResult": "The focused test passed.",
      "outcome": "passed",
      "exitCode": 0,
      "remainingUnknowns": []
    },
    {
      "id": "external-check",
      "kind": "manual",
      "check": "Confirm behavior in an unavailable external environment.",
      "expectedSignal": "The external behavior matches the task criteria.",
      "actualResult": "Not checked in this workspace.",
      "outcome": "unknown",
      "exitCode": null,
      "remainingUnknowns": ["External environment behavior remains unverified."]
    }
  ]
}
```
<!-- niuma-verification-record:end -->

`kind` is `command`, `manual`, or `review`; `outcome` is `passed`, `failed`, `skipped`, or `unknown`. A passed/failed command requires an integer `exitCode` (`0` for passed, non-zero for failed); skipped/unknown command evidence uses `null`. Use stable unique evidence IDs, and use an empty `remainingUnknowns` array only when nothing material remains unknown. Record skipped checks as evidence with `outcome: "skipped"`, the reason in `actualResult`, and the unresolved impact in `remainingUnknowns`.

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
