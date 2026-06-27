# Loop Runtime Layer Memo

## Purpose

Define the operating loop that connects all other layers. This layer tells an AI agent when to plan, act, observe, recover, remember, continue, pause, or stop.

## When to use

Use this layer for any multi-step task, long-running investigation, repeated verification cycle, or recovery flow. Also use it after context resets to resume work safely.

## Agent protocol

1. Plan: load Context, check Policy, and select a Process.
2. Act: make the smallest task-aligned change or investigation step.
3. Observe: run or record the relevant checks.
4. Reflect: compare evidence with success criteria.
5. Repair: enter Recovery if the result is failing, unclear, or unsafe.
6. Remember: capture verified durable facts through the Memory layer.
7. Continue or stop: proceed only when the next step is safe and useful; otherwise report and ask.

## Allowed actions

- Maintain a visible task checklist for multi-step work.
- Continue autonomously through low-risk, task-scoped steps.
- Pause when policy, uncertainty, repeated failure, or user decision points appear.
- Resume from task notes, verification evidence, and current project files after interruption.

## Forbidden actions

- Do not continue looping when the next action is not tied to the task goal.
- Do not ignore failed observation and proceed as if the task passed.
- Do not enter open-ended retries without a stop condition.
- Do not treat memory updates as complete until facts are verified.

## Outputs

- Current loop stage and next action.
- Completed steps and verification evidence.
- Recovery state if the loop is blocked.
- Final summary with changes, checks, skipped checks, and remaining risks.

## Links to other layers

- Context: `docs/layers/01-context/memo.md`
- Policy: `docs/layers/02-policy/memo.md`
- Process: `docs/layers/03-process/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Memory: `docs/layers/06-memory/memo.md`
