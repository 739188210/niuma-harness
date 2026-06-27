# Recovery Layer Memo

## Purpose

Define safe behavior when execution fails, evidence is unclear, or the agent discovers it made a mistake. This layer prevents blind retries and scope creep.

## When to use

Use this layer when tests fail, builds fail, commands fail, context is missing, edits are wrong, requirements are unclear, checks conflict, or the same fix attempt fails repeatedly.

## Agent protocol

1. Classify the failure type: test, build, command, context, bad edit, unclear requirement, policy block, or unknown.
2. Preserve the exact failure signal needed to debug.
3. Identify the first root cause, not every downstream symptom.
4. Make the smallest safe repair attempt.
5. Re-run the smallest relevant check.
6. Stop and report if the same failure persists after focused retries or if repair requires user approval.

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

- Policy: `docs/layers/02-policy/memo.md`
- Process: `docs/layers/03-process/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Memory: `docs/layers/06-memory/memo.md`
- Loop: `docs/layers/07-loop/memo.md`
