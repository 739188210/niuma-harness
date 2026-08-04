# Agent Work Area

This workspace-level directory stores task-local agent work. Create only the material that helps an agent execute, resume, hand off, or improve the Harness. Do not create a task folder or a full set of files merely to satisfy a format.

Task-local files live under:

```text
agent-work/tasks/<task-name>/
  status.md
  plan.md
  context.md
  notes.md
  harness-feedback.md
```

`init`, `doctor`, and `repair` do not create, rewrite, or delete task folders or task-local files.

## Choose the smallest useful material

Task classification, risk tier, Policy, and playbook selection remain defined by `{{HARNESS_DIR}}/docs/process/task-triage.md` and the selected process. This guide only decides whether task-local material helps.

| Path | Use when | Create | Where actual observation belongs |
| --- | --- | --- | --- |
| Direct | The goal, affected location, expected result, and smallest check are clear; work is local and reversible; there is no meaningful implementation choice, handoff, or recovery need; and the request plus current files are enough to reconstruct the work. | No task file | Final response: checks or manual steps, actual results, skipped checks with impact, and remaining unknowns. |
| Status-tracked | Work is complex, interruptible, delegated, parallel, blocked, under recovery, changing scope, crossing sessions, or cannot safely resume from current files alone. | `status.md` | `status.md` is the current task state and the only task-local record of actual checks, results, skipped checks, and unknowns. |

TDD eligibility alone does not require a task folder. Do not use task classification, risk tier, or the number of steps as a mechanical reason to create files. Choose the smallest material that makes the next action and a safe resume clear.

## Optional plan

Create `agent-work/tasks/<task-name>/plan.md` **before implementation** only when an explicit plan will clarify a meaningful implementation choice, implementation order, mutually constraining acceptance criteria, or verification design. A plan is an execution input, never a completion summary. Do not backfill one after work is complete.

Use this compact shape:

```md
# Task plan

## Goal and boundaries
- Goal:
- Non-goals and constraints:

## Success criteria
- <observable behavior or result>

## Smallest approach
- <why this path fits the current architecture>

## Planned verification
- <check or manual observation>
```

A status-tracked task may use `status.md` without a plan when the current request already supplies a safe, clear path.

## Status-tracked work

For status-tracked work, `status.md` is the operational ledger and the only task-local source for current state and actual observations. Keep it short enough to resume from without relying on the old conversation.

Minimum fields:

```md
# Task status

- State: active | blocked | partial | complete | stopped
- Goal and current scope:
- Confirmed progress:
- Observations and checks:
- Skipped checks and impact:
- Remaining unknowns:
- Blockers or risks:
- Next safe action:
- Resume condition:
```

Record only observations actually made during the task:

- command or manual check and its expected signal when useful;
- actual result, including relevant failure information;
- skipped checks, their reason, and unresolved impact; and
- remaining unknowns, or an explicit statement that none material remain.

`complete` is not valid while material acceptance remains failed, blocked, or unknown. Current code, configuration, tests, and command output override an older ledger.

## Optional task material

Create other files only when they add information that cannot stay concise in `status.md`:

- `context.md`: verified current facts, constraints, assumptions, and open questions. Do not use it for implementation steps or raw command output.
- `notes.md`: temporary investigation notes, failed attempts, candidate approaches, candidate reusable experience, and handoff details. It is not a current-state or verification authority.
- `harness-feedback.md`: optional feedback about this Harness. Create it only when the task exposes helpful guidance, ambiguity, conflict, friction, unnecessary cost, or a missing instruction in the Harness documents.

A Harness feedback file is free Markdown. Keep it focused on:

```md
# Harness feedback

- Harness document or guidance involved:
- Task situation:
- Observed help, ambiguity, or friction:
- Actual impact on execution:
- Suggested documentation improvement:
```

Do not use `harness-feedback.md` as a task plan, status ledger, evidence log, authorization ledger, scope ledger, or completion report. Its absence never blocks task execution, recovery, or completion.

## What belongs here

- Task-local plans when they are useful before work.
- Status ledgers for complex, blocked, multi-session, delegated, parallel, or recovery work.
- Actual observations and verification results for status-tracked work.
- Task-local context and temporary investigation notes.
- Optional feedback that improves Harness documentation from real task experience.
- Handoff state after interruption.

## What does not belong here

- Long-lived project facts after they are verified.
- Harness protocols or engineering standards.
- Secrets, credentials, tokens, or private data.
- Unverified guesses presented as truth.
- One-off logs that do not help future task work.
- Promoted experience records; keep raw task observations here, then use the Memory layer to create a condensed project-maintained record under `{{HARNESS_DIR}}/docs/experience/` when warranted.

## Runtime protocol

The Loop Recovery entry defines the only reading order for safe resume: `{{HARNESS_DIR}}/docs/layers/07-loop.md`.

## Durable facts

Promote only material with real long-term value. Durable project facts should move through the Memory layer before being recorded in the active harness root's `{{HARNESS_DIR}}/docs/project-context.md`. Candidate reusable experience stays task-local until verified and condensed through the Memory layer into a project-maintained record under `{{HARNESS_DIR}}/docs/experience/`; raw task observations remain here.

Do not put task-local records under `{{HARNESS_DIR}}/docs/`.
