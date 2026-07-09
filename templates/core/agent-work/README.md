# Agent Work Area

This workspace-level directory stores task-local agent work.

Create runtime task records under:

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  harness-feedback.md
  notes.md
```

## Suggested file roles

- `status.md`: goal, current stage, completed steps, next action, blockers or risks, verification summary, and resume instructions.
- `context.md`: task-local context gathered during execution.
- `plan.md`: current plan, scope decisions, and implementation sequence.
- `verification.md`: exact checks, expected signals, actual results, skipped checks with reasons, and remaining unknowns.
- `harness-feedback.md`: required for non-trivial tasks while `{{HARNESS_DIR}}/docs/experiments/task-execution-record.md` exists; records harness steps used, skipped, deviations, and friction.
- `notes.md`: temporary investigation notes, findings, fix decisions, and handoff notes.

## What belongs here

- Task goals and acceptance criteria.
- Task-local status ledgers for multi-step, risky, parallel, or interruptible work.
- Task-local context gathered during execution.
- Plans for multi-step work.
- Verification commands, expected signals, actual results, skipped checks, and remaining unknowns, including material risks.
- Experimental harness execution feedback while `{{HARNESS_DIR}}/docs/experiments/task-execution-record.md` exists.
- Handoff state after interruption.
- Temporary investigation notes that should not become stable project facts.

## What does not belong here

- Long-lived project facts after they are verified.
- Harness protocols or engineering standards.
- Secrets, credentials, tokens, or private data.
- Unverified guesses presented as truth.
- One-off logs that do not help future task work.

## Runtime protocol

The Loop layer defines how agents keep task status current: `docs/layers/07-loop.md`.

## Durable facts

Durable project facts should move through the Memory layer before being recorded in the active harness root's `docs/project-context.md`.

Do not put task-local records under `harness/docs/`.
