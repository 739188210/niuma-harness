# Loop Runtime Layer Memo

## Purpose

Define how an AI agent resumes, hands off, pauses, or stops status-tracked work safely. This layer connects current task state with current workspace evidence.

## When to use

Use this layer when work is status-tracked under `agent-work/README.md`, or after interruption, context reset, cross-session continuation, handoff, named task resume, or a failure that makes direct work unsafe to continue.

## Explicit task state

When work is complex, blocked, delegated, parallel, interrupted, crossing sessions, or cannot safely resume from the request and current files alone, maintain:

```text
agent-work/tasks/<task-name>/status.md
```

The ledger is the resume point after interruption, context reset, or handoff. It owns both current task state and the actual checks, results, skipped checks, and unknowns needed to continue safely. Keep it short and current.

Minimum fields:

- State: `active`, `blocked`, `partial`, `complete`, or `stopped`
- Goal and current scope
- Confirmed progress
- Observations and checks
- Skipped checks and impact
- Remaining unknowns
- Blockers or risks
- Next safe action
- Resume condition

Do not create or maintain `status.md` merely for format. Select status-tracked work when the task needs it. A status-tracked task may exist without `plan.md`.

## Recovery entry

Use this as the only task-material reading order after interruption, context reset, cross-session continuation, handoff, named task resume, or before continuing after a failure. Do not continue an older next action until this entry is complete.

1. Locate the named task from the user request, a handoff reference, the current task path, or an active ledger. Do not enumerate `agent-work/tasks/` or guess a task name. If the task is not identifiable from the request and current workspace, stop and ask.
2. Read that task's `status.md` first. Extract its state, goal, current scope, confirmed progress, observations, skipped checks, unknowns, blockers or risks, candidate next action, and resume condition. Its next action is not authorization to act.
3. Read `plan.md` only when it exists. It is earlier direction: goal, boundaries, success criteria, smallest approach, and planned checks; it is not current truth.
4. Re-check the smallest current workspace evidence needed for the candidate next action: relevant source, configuration, tests, README/runbook, and command results. Current facts override older task material.
5. Route from that evidence: continue the selected playbook's next smallest safe action when its goal, boundary, and preconditions still hold; enter `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when evidence is failing, conflicting, unclear, or unsafe; return to `{{HARNESS_DIR}}/docs/process/task-triage.md` only when current evidence invalidates the original classification, risk tier, success criteria, or selected playbook; follow Policy before an action crosses its boundary.
6. Before continuing, pausing, or handing off, update `status.md` with current facts, actual observations, unknowns, and the next safe action. Do not create a full task package merely for format.

## Ownership boundaries

`status.md` owns the operational resume state and task-local observations for one status-tracked task. It does not own durable project facts or raw long logs.

The active task owner is responsible for keeping `status.md` current before pausing, handing off, or resuming. Parallel or delegated work may keep temporary notes, but the active task owner summarizes integrated state, checks, conflicts, and next action in the parent ledger.

`plan.md` is an optional execution input, not a current-state authority. When current source, configuration, test output, or `status.md` conflicts with a plan, re-check current facts and update the status ledger.

A task must not say `complete` while material acceptance remains failed, blocked, or unknown.

## Agent protocol

1. Plan: load Context, check Policy, select a Process, and use `agent-work/README.md` to decide whether work stays Direct or needs a status ledger; create an optional plan only when it has real pre-work value.
2. Act: make the smallest task-aligned change or investigation step.
3. Observe: run or record relevant checks; for status-tracked work, update the ledger with actual observations.
4. Reflect: compare evidence with success criteria and update current state, confirmed progress, unknowns, and next safe action.
5. Repair: enter Recovery if the result is failing, unclear, or unsafe. Retries for the same failure are bounded; once the limit is reached, stop, preserve the failure signal, and report instead of continuing.
6. Remember: capture verified durable facts through the Memory layer.
7. Continue or stop: proceed only when the next step is safe and useful; otherwise report and ask. Before pausing or stopping status-tracked work, make sure the ledger is enough to resume from.

## Rationalization red flags

During Reflect or Continue, treat these thoughts as stop-and-classify signals. A red flag does not prove the action is forbidden; it means the agent must route through Observation, Recovery, Process, or Policy before proceeding.

| Agent thought | Risk | Required response |
| --- | --- | --- |
| "I can skip tests/checks" | Completion without Observation evidence or moving the verification target. | Run the smallest relevant check, or record skipped checks and remaining unknowns. If this follows a failure, use Recovery and the test-change gate. |
| "It is probably fine" | Treating confidence as evidence. | Observe first; if evidence is unavailable, report the unknown instead of claiming success. |
| "That failure is unrelated" | Ignoring failed Observation evidence. | Preserve the failure signal and classify it through Recovery before narrowing scope. |
| "I will do a quick refactor while I am here" | Silent scope expansion. | Re-check Process and Policy; keep the next step task-scoped or ask first. |
| "The user probably wants this extra scope" | Inventing requirements. | Ask or confirm before expanding the goal, public behavior, or touched area. |

## Allowed actions

- Maintain a visible task checklist for multi-step work.
- Maintain `agent-work/tasks/<task-name>/status.md` for status-tracked work.
- Continue autonomously through low-risk, task-scoped steps.
- Pause when policy, uncertainty, repeated failure, or user decision points appear.
- Resume from `status.md`, an optional plan, and current project files after interruption.

## Forbidden actions

- Do not continue looping when the next action is not tied to the task goal.
- Do not ignore failed observation and proceed as if the task passed.
- Do not enter open-ended retries without a stop condition.
- Do not rely only on conversation state for status-tracked work.
- Do not treat `status.md` as durable project memory; route durable facts through the Memory layer.
- Do not treat memory updates as complete until facts are verified.

## Outputs

- Current loop stage and next action.
- Current task state, actual observations, and remaining unknowns when a ledger is used.
- Recovery state if the loop is blocked.
- Final summary with changes, checks, skipped checks, and remaining unknowns or material risks.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Memory: `{{HARNESS_DIR}}/docs/layers/06-memory.md`
