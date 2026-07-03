# Recovery Layer Memo

## Purpose

Define safe behavior when execution fails, evidence is unclear, or the agent discovers it made a mistake. This layer prevents blind retries and scope creep.

## When to use

Use this layer when tests fail, builds fail, commands fail, context is missing, edits are wrong, requirements are unclear, checks conflict, or the same fix attempt fails repeatedly.

If the Loop layer flags a rationalization about missing evidence or dismissing failures as unrelated, use this layer to classify the failure or uncertainty before continuing. Scope-expansion rationalizations route through Process and Policy.

## Agent protocol

1. Classify the failure type: test, build, command, context, bad edit, unclear requirement, policy block, or unknown.
   - Exception: a leaked secret is not a normal failure. Route to `docs/policy/secret-leak.md` instead of the steps below.
2. Preserve the exact failure signal needed to debug.
3. Identify the first root cause, not every downstream symptom.
4. Make the smallest safe repair attempt.
5. Re-run the smallest relevant check.
6. Stop and report if the same failure persists after focused retries or if repair requires user approval.

## Failure response map

Use the failure type to choose the required response form. Do not treat all failures as retryable implementation bugs.

| Failure type | Required response |
|---|---|
| `test` | Preserve the failing test name or assertion and expected-vs-actual signal; repair the first code cause or valid test-target cause; rerun the smallest relevant test. |
| `build` | Preserve the build or typecheck command and first diagnostic; repair the first compile or configuration cause; rerun the focused build/typecheck command. |
| `command` | Preserve the command, exit status, and relevant stderr/stdout; decide whether invocation, environment, permission, or dependency is at fault; retry only after changing the cause. |
| `context` | Name the missing file, fact, decision, or prior state; inspect available context or ask the user; do not invent missing facts. |
| `bad edit` | Identify the agent-owned edit that caused the regression; revert or correct the smallest owned change; rerun the affected check. |
| `unclear requirement` | State the ambiguity and the implementation choices it blocks; ask for clarification before continuing. |
| `policy block` | Name the policy or approval boundary; stop or request approval; do not work around the boundary. |
| `unknown` | Preserve the observed signal and remaining unknowns; gather the smallest additional evidence needed to reclassify; stop if it cannot be classified safely. |

Record the recovery result with Observation evidence fields: Check, Expected signal, Actual result, Skipped checks, and Remaining unknowns.

## Rollback strategy

Prefer version control to undo the agent's own changes over manual edits.

- Revert only the changes the agent introduced in the current task, not pre-existing user work.
- When ownership is unclear (cannot tell agent vs. user change), stop and ask before reverting anything.
- Rollback is itself a repair attempt: re-run the relevant Observation check afterward.
- Without version control, restore the smallest affected area from the last known-good state and record what was restored; never delete files to force a fix.

Rollback boundaries (what may be reverted) are owned by Policy: `docs/policy/action-boundary.md`. This section covers the mechanism only, to avoid duplicating Policy.

## Allowed actions

- Read failure output and related source, tests, and configuration.
- Revert or correct only the agent's own mistaken edits.
- Run focused verification after each repair attempt.
- Ask for user input when requirements, permissions, credentials, or risk boundaries block progress.

## Forbidden actions

- Do not delete failing tests or weaken assertions to force success.
- Do not disable lint, typecheck, security checks, or coverage to hide failures.
- Do not reset the repository or discard user work without explicit approval.
- Do not keep retrying the same approach after repeated failure.
- Do not install dependencies or change architecture as a recovery shortcut without approval.

## Outputs

- Failure category and root signal.
- Repair attempt made, if any.
- Re-run result.
- Stop reason if recovery cannot continue safely.
- Follow-up question or recommendation for the user.

## Links to other layers

- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Observation: `docs/layers/04-observation.md`
- Memory: `docs/layers/06-memory.md`
- Loop: `docs/layers/07-loop.md`
