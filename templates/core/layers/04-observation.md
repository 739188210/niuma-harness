# Observation Layer Memo

## Purpose

Define what task evidence proves and how to state a truthful outcome. This layer turns completion claims into observed evidence; it does not choose task files.

## When to use

Use this layer before declaring an outcome, after any code or documentation change, after Recovery attempts, and when deciding whether to continue or stop.

## Agent protocol

1. Identify the smallest checks that prove each task acceptance criterion.
2. Prefer project-local commands documented in `{{HARNESS_DIR}}/docs/project-context.md`; use `{{HARNESS_DIR}}/docs/index.md` only as navigation.
3. Run focused checks first, then broader checks when justified by changed risk.
4. Record only checks actually run, actual results, skipped checks with reason and impact, and remaining unknowns.
5. For Direct work, record evidence in the final response. For Tracked work, record it only in `agent-work/tasks/<task-name>/status.md`; its required `plan.md` is planned direction, not an evidence ledger.
6. Treat unrun checks as unknown, not passing. If verification fails, treat the failing check as evidence; do not move the verification target to turn red into green.

## Evidence boundaries

Evidence is scoped. Do not upgrade one evidence type into another:

- A focused test passing does not prove full regression passed.
- A build passing does not prove typecheck passed.
- A typecheck passing does not prove a runtime workflow passed.
- A migration source existing does not prove it was applied to a target database.
- An unauthenticated browser visit does not prove authenticated user acceptance.
- A suspected pre-existing failure does not prove a verified baseline.

A broader failure may be called pre-existing only when at least one current, reviewable basis exists:

1. the same check failed the same way before this task’s changes;
2. the failure location and type are demonstrably outside the changed scope; or
3. trusted CI, a project baseline, or verified historical evidence establishes the failure.

Even then, record that broad check as not passing. Do not describe it as full regression passing.

## Evidence and outcome vocabulary

For each acceptance criterion, use one result:

- `passed`: required evidence supports the criterion.
- `failed`: evidence shows the criterion is not met.
- `blocked`: required evidence or action needs approval, an external system, or another dependency.
- `skipped`: a check was not run; always state why and its unresolved impact.
- `unknown`: evidence is insufficient to judge the criterion.

State one task outcome across material criteria:

- `passed`: every material criterion has sufficient passing evidence.
- `partial`: the main goal has progress, but a material criterion is unresolved, skipped with impact, or otherwise incomplete.
- `blocked`: the next necessary action cannot proceed without approval, external readiness, or a dependency.
- `failed`: the task goal or a material criterion is shown to fail.
- `unknown`: evidence is insufficient to judge the task outcome.

For Tracked work, keep a compact acceptance/evidence matrix in `status.md`; it is the only task-local evidence ledger even when the required `plan.md` exists. A task may be closed or handed off with a non-passing outcome, but it must not be called complete unless its outcome is `passed`.

## Evidence record

Record concise, human-readable facts where the task path requires them:

- the check or manual verification step and expected signal when useful;
- the actual result, including relevant failure information;
- every skipped check, its reason, and unresolved impact; and
- remaining unknowns, or an explicit statement that none material remain.

## Test-first behavior evidence

For a behavior change or automatable defect regression that a stable automated target can express:

1. Define the focused target before implementation.
2. Run it in RED and record the actual failure signal.
3. Make the smallest implementation change that should satisfy the target.
4. Run the same target in GREEN and record the actual result.
5. When refactoring is needed, re-run the same target afterward.

RED, GREEN, and any refactor recheck are ordinary Observation evidence, not a separate task type or workflow. If a stable automated target is not suitable, state why and define replacement evidence before implementation. Time pressure, convenience, inability to immediately find a test, or test complexity do not by themselves justify skipping this protocol.

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
- Do not rebaseline snapshots, loosen assertions, skip tests, lower coverage, or change check configuration merely to make it pass. Ask before an uncertain semantic rewrite and record the behavior contract and replacement coverage.

## Outputs

- Actual checks and results.
- Manual checks performed, if any.
- Skipped checks and why they were skipped.
- Remaining unknowns, including material risks.
- A truthful outcome using `passed`, `partial`, `blocked`, `failed`, or `unknown`.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Task work area: `agent-work/`
