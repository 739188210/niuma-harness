# Loop Runtime Layer Memo

## Purpose

Define the operating loop that connects all other layers. This layer tells an AI agent when to plan, act, observe, recover, remember, continue, pause, or stop.

## When to use

Use this layer for selected Recoverable work, or after context resets to resume work safely. The task-material protocol in `agent-work/README.md` decides whether work can stay direct, needs a minimum plan anchor, or needs recoverable state; this layer does not introduce another task classification or risk tier.

## Explicit task state

When work cannot be safely resumed from the request and current files alone, keep an explicit task status ledger at:

```text
agent-work/tasks/<task-name>/status.md
```

The ledger is the resume point after interruption, context reset, or handoff. Keep it short and current. Follow the Recovery entry below before resuming; re-check current code, configuration, tests, and command results before trusting an older direction.

Minimum fields:

- Goal
- Current stage
- Completed steps
- Next action
- Verification state
- Blockers or risks
- Resume instructions

Do not create or maintain `status.md` unless the task-material selection is Recoverable; a handoff or resume need requires selecting Recoverable material first.

## Recovery entry

Use this as the only task-material reading order after interruption, context reset, cross-session continuation, handoff, named task resume, or before continuing after a failure. Do not continue an older next action until this entry is complete.

1. Locate the named task from the user request, a handoff reference, the current task path, or an active ledger. Do not enumerate `agent-work/tasks/` or guess a task name. If the task is not identifiable from the request and current workspace, stop and ask.
2. Read that task's `status.md` first when it exists. Extract the goal, current stage, completed steps, candidate next action, blockers or risks, resume instructions, and verification-state pointer. Its next action is not authorization to act; first re-check current facts and Policy.
3. Read `plan.md` only as earlier execution input: its goal, boundaries, success criteria, smallest approach, and verification design are older direction or assumptions, not current truth.
4. Read `verification.md` for checks actually run, actual results, skipped checks, and remaining unknowns. Historical passing evidence does not prove the current workspace is healthy; unrun checks remain unknown.
5. Read `harness-feedback.md` only when it exists and its classification, tier, selected playbook, scope or authorization record, recovery declaration, or outcome affects the next decision. Its absence does not block recovery, and it does not replace verification evidence.
6. Re-check the smallest current workspace evidence needed for the candidate next action: relevant current source, configuration, tests, README/runbook, and command results. Current facts override older task material.
7. Route from that evidence without creating another task classification or risk tier: continue the selected playbook's next smallest safe action when its goal, boundary, and preconditions still hold; enter `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when evidence is failing, conflicting, unclear, or unsafe; return to `{{HARNESS_DIR}}/docs/process/task-triage.md` only when current evidence invalidates the original classification, risk tier, success criteria, or selected playbook; follow Policy before an action crosses its boundary.
8. Before continuing, pausing, or handing off, update only existing task material, or create the minimum record only when `agent-work/README.md` says it is needed. Record observed facts in `status.md` for current recoverable state, `verification.md` for actual checks when that record is in use, and `harness-feedback.md` only when required. Do not backfill evidence or create a complete task package merely for format.

## Ownership boundaries

`status.md` owns the operational resume state for one active task. It records the current stage, next action, completed steps, blockers or risks, resume instructions, and a pointer or short summary of the latest verification evidence.

`status.md` does not own detailed verification evidence, task notes, or durable project facts. Put detailed evidence in the Observation record or task notes, and route durable facts through the Memory layer.

The active task owner is responsible for keeping `status.md` current before pausing, handing off, or resuming. Parallel or delegated work may keep its own notes and evidence, but the active task owner summarizes the recovery state in the parent ledger.

Before pausing or stopping delegated work, the active task owner records the integrated delegated state, conflicts, and next action in the parent ledger.

## Agent protocol

1. Plan: load Context, check Policy, select a Process, and use `agent-work/README.md` to decide whether direct execution, a minimum plan anchor, or recoverable state is needed.
2. Act: make the smallest task-aligned change or investigation step.
3. Observe: run or record the relevant checks, then update verification state in the ledger when one is used.
4. Reflect: compare evidence with success criteria and update current stage, completed steps, and next action.
5. Repair: enter Recovery if the result is failing, unclear, or unsafe. Retries for the same failure are bounded (a small fixed number of focused attempts); once the limit is reached, stop, preserve the failure signal, and report instead of continuing the loop.
6. Remember: capture verified durable facts through the Memory layer.
7. Continue or stop: proceed only when the next step is safe and useful; otherwise report and ask. Before pausing or stopping recoverable work, make sure any selected `status.md` is enough to resume from. Use the selected task material or final response to report actual evidence, gaps, risks, recovery, and outcome; do not pre-create verification or execution-record files merely for format.

## Rationalization red flags

During Reflect or Continue, treat these thoughts as stop-and-classify signals. A red flag does not prove the action is forbidden; it means the agent must route through Observation, Recovery, Process, or Policy before proceeding.

| Agent thought | Risk | Required response |
|---|---|---|
| "I can skip tests/checks" | Completion without Observation evidence or moving the verification target. | Run the smallest relevant check, or record skipped checks and remaining unknowns. If this follows a failure, use Recovery and the test-change gate. |
| "It is probably fine" | Treating confidence as evidence. | Observe first; if evidence is unavailable, report the unknown instead of claiming success. |
| "That failure is unrelated" | Ignoring failed Observation evidence. | Preserve the failure signal and classify it through Recovery before narrowing scope. |
| "I will do a quick refactor while I am here" | Silent scope expansion. | Re-check Process and Policy; keep the next step task-scoped or ask first. |
| "The user probably wants this extra scope" | Inventing requirements. | Ask or confirm before expanding the goal, public behavior, or touched area. |

## Allowed actions

- Maintain a visible task checklist for multi-step work.
- Maintain `agent-work/tasks/<task-name>/status.md` for selected Recoverable work; select Recoverable when handoff or resume needs arise.
- Continue autonomously through low-risk, task-scoped steps.
- Pause when policy, uncertainty, repeated failure, or user decision points appear.
- Resume from `status.md`, task notes, verification evidence, and current project files after interruption.

## Forbidden actions

- Do not continue looping when the next action is not tied to the task goal.
- Do not ignore failed observation and proceed as if the task passed.
- Do not enter open-ended retries without a stop condition.
- Do not rely only on conversation state for selected Recoverable work.
- Do not treat `status.md` as durable project memory; route durable facts through the Memory layer.
- Do not treat memory updates as complete until facts are verified.

## Outputs

- Current loop stage and next action.
- Completed steps and verification evidence.
- `status.md` ledger path and recovery state when a ledger is used.
- Recovery state if the loop is blocked.
- Final summary with changes, checks, skipped checks, and remaining unknowns or material risks.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Memory: `{{HARNESS_DIR}}/docs/layers/06-memory.md`
