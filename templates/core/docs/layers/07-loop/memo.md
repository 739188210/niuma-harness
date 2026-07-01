# Loop Runtime Layer Memo

## Purpose

Define the operating loop that connects all other layers. This layer tells an AI agent when to plan, act, observe, recover, remember, continue, pause, or stop.

## When to use

Use this layer for any multi-step task, long-running investigation, repeated verification cycle, or recovery flow. Also use it after context resets to resume work safely.

For multi-step, risky, parallel, or interruptible work, use `agent-work/tasks/<task-name>/status.md` as the explicit progress ledger and recovery point.

## Explicit task state

For multi-step, risky, parallel, or interruptible work, keep an explicit task status ledger at:

```text
agent-work/tasks/<task-name>/status.md
```

The ledger is the resume point after interruption, context reset, or handoff. Keep it short and current.

Minimum fields:

- Goal
- Current stage
- Completed steps
- Next action
- Verification state
- Blockers or risks
- Resume instructions

Do not create or maintain a ledger for trivial one-step work unless it helps handoff.

## Agent protocol

1. Plan: load Context, check Policy, select a Process, and decide whether the task needs a `status.md` ledger.
2. Act: make the smallest task-aligned change or investigation step.
3. Observe: run or record the relevant checks, then update verification state in the ledger when one is used.
4. Reflect: compare evidence with success criteria and update current stage, completed steps, and next action.
5. Repair: enter Recovery if the result is failing, unclear, or unsafe. Retries for the same failure are bounded (a small fixed number of focused attempts); once the limit is reached, stop, preserve the failure signal, and report instead of continuing the loop.
6. Remember: capture verified durable facts through the Memory layer.
7. Continue or stop: proceed only when the next step is safe and useful; otherwise report and ask. Before pausing or stopping interruptible work, make sure `status.md` is enough to resume from.

## Allowed actions

- Maintain a visible task checklist for multi-step work.
- Maintain `agent-work/tasks/<task-name>/status.md` for multi-step, risky, parallel, or interruptible work.
- Continue autonomously through low-risk, task-scoped steps.
- Pause when policy, uncertainty, repeated failure, or user decision points appear.
- Resume from `status.md`, task notes, verification evidence, and current project files after interruption.

## Forbidden actions

- Do not continue looping when the next action is not tied to the task goal.
- Do not ignore failed observation and proceed as if the task passed.
- Do not enter open-ended retries without a stop condition.
- Do not rely only on conversation state for multi-step, risky, parallel, or interruptible work.
- Do not treat `status.md` as durable project memory; route durable facts through the Memory layer.
- Do not treat memory updates as complete until facts are verified.

## Outputs

- Current loop stage and next action.
- Completed steps and verification evidence.
- `status.md` ledger path and recovery state when a ledger is used.
- Recovery state if the loop is blocked.
- Final summary with changes, checks, skipped checks, and remaining risks.

## Links to other layers

- Context: `docs/layers/01-context/memo.md`
- Policy: `docs/layers/02-policy/memo.md`
- Process: `docs/layers/03-process/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Memory: `docs/layers/06-memory/memo.md`
