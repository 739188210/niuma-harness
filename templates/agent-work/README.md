# Agent Work Area

This workspace-level directory stores task-local agent work. It is an execution aid: create only the material that lets an agent start, continue, recover, or hand off work correctly. Do not create a task folder or a full set of files merely to satisfy a format.

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

`init`, `doctor`, and `repair` do not create, rewrite, or delete task folders or task-local files.

## Choose the smallest useful execution material

Task classification, risk tier, Policy, and playbook selection stay defined by `{{HARNESS_DIR}}/docs/process/task-triage.md` and the selected process. This guide does not create another task type or risk tier. After those decisions, choose only the material needed to execute and recover safely.

### Direct execution

Do not create a task folder when the goal, affected location, expected result, and smallest verification are clear; the work is local and reversible; there is no meaningful solution choice; and a later agent could safely reconstruct the work quickly from the request and current files. Make the change, run the smallest relevant check, and report the actual result.

### Minimum execution anchor

Before changing files, create `agent-work/tasks/<task-name>/plan.md` when a meaningful solution choice, compatibility boundary, multiple related edits, test-first behavior, multiple success criteria, or interruption risk would make later recovery unsafe. `plan.md` is an execution input, not a completion summary.

Use this compact shape:

```md
# Task plan

## Goal and boundaries
- Goal:
- Non-goals and constraints:

## Success criteria
- `criterion-id`: <observable behavior or result>

## Smallest approach
- <why this path fits the current architecture>

## Verification design
- `criterion-id` → `<planned evidence-id or check>`
```

Use readable stable success-criterion IDs. When an existing task record or user-approved material already supplies an ID, reuse it rather than creating a second ID scheme. The plan designs verification; it does not claim that verification ran.

### Recoverable execution

Add and maintain `status.md` when work is multi-stage, interruptible, delegated, parallel, risky, under recovery, changing scope or direction, or cannot be safely resumed from current code alone. On resume, `status.md` is the first task-local operational state to read; `plan.md` is not current truth. Follow the Recovery entry in `{{HARNESS_DIR}}/docs/layers/07-loop.md` for the only complete recovery order.

Create other files only when they provide information that cannot stay concise in the plan or ledger:

- `context.md`: task objective, scope, verified current facts, constraints, assumptions, and open questions. Do not use it for implementation steps or raw command output.
- `plan.md`: goal, non-goals, stable success criteria, smallest approach, implementation order, and verification design.
- `status.md`: current stage, completed steps, next safe action, blockers or risks, and resume instructions. It is the active operational ledger, not durable memory.
- `verification.md`: actual checks, expected signals, actual results, skipped checks, and remaining unknowns. Start and update it when verification occurs; do not backfill it after completion.
- `harness-feedback.md`: the required structured execution record for non-trivial tasks in this package release. Its existing schema and evidence links remain authoritative for that record.
- `notes.md`: temporary investigation notes, failed attempts, candidate approaches, candidate reusable experience, handoff details, and optional candidates for later knowledge promotion. It is not verification evidence or a durable fact source.

## What belongs here

- Task goals, acceptance criteria, plans, and execution boundaries when they are needed for safe execution or recovery.
- Task-local status ledgers for multi-step, risky, parallel, interruptible, or recovery work.
- Task-local context gathered during execution.
- Verification commands, expected signals, actual results, skipped checks, and remaining unknowns, including material risks.
- Package-enabled experimental Harness execution records for non-trivial tasks.
- Handoff state after interruption.
- Temporary investigation notes that should not become stable project facts.

## What does not belong here

- Long-lived project facts after they are verified.
- Harness protocols or engineering standards.
- Secrets, credentials, tokens, or private data.
- Unverified guesses presented as truth.
- One-off logs that do not help future task work.
- Promoted experience records; keep raw notes and evidence here, then use the Memory layer to create a condensed project-maintained record under `{{HARNESS_DIR}}/docs/experience/` when warranted.

## Copyable verification record

Use one schema 1 marker block in `verification.md`; `harness-feedback.md` references its stable evidence IDs.

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
    }
  ]
}
```
<!-- niuma-verification-record:end -->

`kind` is `command`, `manual`, or `review`; `outcome` is `passed`, `failed`, `skipped`, or `unknown`. Completed command checks use an integer exit code; skipped/unknown command checks use `null`. Unknowns are always an array of non-empty strings, or `[]` when none remain. The full execution-record schema is in `{{HARNESS_DIR}}/docs/experiments/task-execution-record.md`.

## Runtime protocol

The Loop Recovery entry defines the only task-material reading order for safe resume; this guide defines only when material is needed and each file's role: `{{HARNESS_DIR}}/docs/layers/07-loop.md`.

## Durable facts

Promote only material with real long-term value. Durable project facts should move through the Memory layer before being recorded in the active harness root's `{{HARNESS_DIR}}/docs/project-context.md`. Candidate reusable experience stays task-local until verified and condensed through the Memory layer into a project-maintained record under `{{HARNESS_DIR}}/docs/experience/`; raw task evidence remains here. Create an ADR only when a durable decision rationale must survive the task; do not create an empty ADR or experience record merely to state that none was needed.

Do not put task-local records under `{{HARNESS_DIR}}/docs/`.
