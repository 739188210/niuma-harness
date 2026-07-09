# Task Execution Feedback Record

This is an active experimental requirement, not a new core harness layer.

While this file exists in the generated harness, agents must record harness execution feedback for every non-trivial task under `agent-work/tasks/<task-name>/harness-feedback.md`.

The mechanism is intentionally low-coupled so it can be removed later after enough real-task evidence shows the core harness loop works without this extra feedback record.

## Purpose

Capture whether real tasks followed the harness, where agents skipped required steps, and which harness instructions created friction. The record exists to improve `niuma-harness` from usage evidence, not to preserve durable project facts.

## When to record

Create or update `harness-feedback.md` for non-trivial tasks, including tasks that change files, run verification, use subagents, touch release/security/policy boundaries, or require multiple steps.

For trivial read-only tasks, a final-response note is enough: state that the task was trivial, read-only, and did not need a separate feedback record.

## Record template

```md
# Harness Feedback

## Task

- User request:
- Task type:
- Scope:

## Harness path used

- Context:
- Policy:
- Process:
- Observation:
- Recovery:
- Memory:
- Loop:

## Required but skipped

| Expected step | Skipped? | Reason | Justified? | Risk |
|---|---:|---|---:|---|
|  |  |  |  |  |

## Decision impact

Record whether each harness step changed a later decision. This helps distinguish useful process from ceremony.

| Harness step | Used? | Changed decision? | Notes |
|---|---:|---:|---|
| Context |  |  |  |
| Policy |  |  |  |
| Process |  |  |  |
| Observation |  |  |  |
| Recovery |  |  |  |
| Memory |  |  |  |
| Review / subagents |  |  |  |

## Candidate project-context updates

List durable facts discovered during the task before deciding whether to write them to `docs/project-context.md`.

| Fact | Evidence | Stable? | Suggested action |
|---|---|---:|---|
|  |  |  |  |

## Deviations and friction

- Harness instruction not followed:
- Why:
- Was the deviation justified:
- Confusing, redundant, or missing guidance:
- Suggested harness improvement:

## Evidence pointer

- Files read:
- Files changed:
- Commands run:
- Checks passed:
- Checks failed:
- Checks skipped:

## Final classification

- Compliant: yes / mostly / no
- Main gap:
- Follow-up needed:
```

## Boundaries

- Do not store secrets, credentials, private data, or long logs.
- Do not duplicate detailed verification evidence when `verification.md` already records it; link or summarize instead.
- Do not put this feedback in `docs/project-context.md`; project context stores durable project facts, not harness experiment data.
- Do not invent compliance. If a step was skipped, record that it was skipped, whether it was justified, and why.
- Do not write candidate project-context updates without verifying the evidence and applying the maintenance standard in `docs/project-context.md`.

## Removal criteria

This experiment can be removed or disabled when repeated real tasks show that agents follow the core loop without the extra record, skipped-step patterns have been folded back into core docs, or the record no longer produces actionable harness improvements.
