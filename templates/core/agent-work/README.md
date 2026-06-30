# Agent Work Area

This workspace-level directory stores task-local agent work.

Create runtime task records under:

```text
agent-work/tasks/<task-name>/
  context.md
  plan.md
  verification.md
  notes.md
```

## What belongs here

- Task goals and acceptance criteria.
- Task-local context gathered during execution.
- Plans for multi-step work.
- Verification commands, outputs, skipped checks, and residual risks.
- Handoff state after interruption.
- Temporary investigation notes that should not become stable project facts.

## What does not belong here

- Long-lived project facts after they are verified.
- Harness protocols or engineering standards.
- Secrets, credentials, tokens, or private data.
- Unverified guesses presented as truth.
- One-off logs that do not help future task work.

## Durable facts

Durable project facts should move through the Memory layer before being recorded in the active harness root's `docs/project-context.md`.

Do not put task-local records under `harness/docs/`.
