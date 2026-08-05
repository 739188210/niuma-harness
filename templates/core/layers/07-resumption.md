# Resumption Runtime Layer Memo

## Purpose

Define how an AI agent resumes, hands off, pauses, or stops Tracked work safely. This layer connects the task-material profile with current workspace evidence; it does not repeat planning, observation, recovery, or memory protocols.

## When to use

Use this layer for Tracked work after interruption, context reset, cross-session continuation, handoff, named task resume, or a failure that makes the existing task material unsafe to continue from.

## Tracked task material

When `agent-work/README.md` selects the Tracked profile, maintain:

```text
agent-work/tasks/<task-name>/plan.md
agent-work/tasks/<task-name>/status.md
```

Tracked extends Planned: `plan.md` holds approved execution direction, while `status.md` is the resume point and owns current task state and actual observations. `status.md` is the sole task-local evidence ledger. Keep it short and current.

Before pausing or handing off, ensure `status.md` records:

- Work state and task outcome
- Goal and current scope
- Confirmed progress and last verified evidence
- Acceptance/evidence matrix when multiple criteria need separate proof
- Remaining unknowns and blockers or risks
- Next safe action and resume condition
- `## Scope change` when the scope changes materially

`closed` means active work stopped or handed off; it does not make the outcome `passed`. Do not create task material merely for format. Once the task uses the Tracked profile, both `plan.md` and `status.md` are required.

## Recovery entry

Use this as the only task-material reading order after interruption, context reset, cross-session continuation, handoff, named task resume, or before continuing after a failure. Do not execute an older next action until this entry is complete.

1. Locate the named task from the user request, a handoff reference, the current task path, or an active ledger. Do not enumerate `agent-work/tasks/` or guess a task name. If the task is not identifiable from the request and current workspace, stop and ask.
2. Read that task’s `status.md` first. Extract its work state, outcome, current scope, confirmed progress, last verified evidence, criterion results, unknowns, blockers or risks, candidate next action, and resume condition. Its next action is not authorization to act.
3. Read `plan.md` next. It is earlier direction: goal, boundaries, success criteria, smallest approach, and planned checks; it is not current truth or an evidence ledger. If a legacy interrupted task lacks it, do not invent a retrospective completion plan: re-check Process and create only the plan needed for remaining approved work before continuing.
4. Re-check the smallest current workspace evidence needed for the candidate next action: relevant source, configuration, tests, README/runbook, and command results. Current facts override older task material.
5. Continue only when the candidate action, task-material profile, boundary, and preconditions still hold. Route failing, conflicting, unclear, or unsafe evidence through `{{HARNESS_DIR}}/docs/layers/05-recovery.md`; re-check `{{HARNESS_DIR}}/docs/layers/03-process.md` when the profile or acceptance assumptions changed; follow Policy before an action crosses its boundary.
6. Before continuing, pausing, or handing off, update `status.md` with current facts, actual observations, outcome, and next safe action.

## Authority boundaries

- `status.md` owns one Tracked task’s operational resume state and task-local observations. It does not own durable project facts or raw long logs.
- `plan.md` is required execution direction for Tracked work, not a current-state authority. When current source, configuration, test output, or `status.md` conflicts with a plan, re-check current facts and update the ledger.
- The active task owner keeps `status.md` current before pausing, handing off, or resuming. Parallel or delegated work may keep temporary notes, but the active owner summarizes integrated state, checks, conflicts, and next action in the parent ledger.
- A task outcome must not be `passed` while a material acceptance criterion is failed, blocked, skipped with unresolved impact, or unknown.

## Resume constraints

- Do not rely only on conversation state, an old plan, or an old next action for Tracked work.
- Do not treat task material as authorization; re-check Policy for each applicable boundary.
- Do not claim a non-passing outcome is complete.
- Do not use `status.md` as durable project memory; route verified durable facts through `{{HARNESS_DIR}}/docs/layers/06-memory.md`.

## Outputs

- A verified current task state and safe next action.
- Updated `status.md` before a pause, handoff, or resumed continuation.
- A route to Process, Policy, Observation, or Recovery when the next decision belongs there.

## Links to other layers

- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Memory: `{{HARNESS_DIR}}/docs/layers/06-memory.md`
