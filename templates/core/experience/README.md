# Experience Library

## Purpose

Use this library to preserve verified, reusable action knowledge: approaches, traps, diagnostic paths, and operating guidance that can change a future comparable task's safe next step.

An experience record is not a current-task status ledger, a current project fact index, or Harness documentation feedback:

- Current task progress, checks, blockers, and next actions belong in `agent-work/tasks/<task-name>/status.md` for status-tracked work, or the final response for Direct work.
- Current project structure, constraints, and verification boundaries belong in `{{HARNESS_DIR}}/docs/project-context.md` or applicable module knowledge.
- Harness protocol or documentation friction belongs in optional `agent-work/tasks/<task-name>/harness-feedback.md`.

## When to create or update an experience record

Create or update an experience record when all of the following apply:

1. The scenario and safe approach are verified against current files, command output, tests, configuration, or user confirmation.
2. A future comparable task could otherwise take a wrong, unsafe, or wasteful next step.
3. The record can state its use conditions, source of truth, safe approach, limits, and refresh conditions.

A first verified discovery may be recorded immediately when it meets these conditions. Do not wait for the same issue to recur; recurrence can raise priority but is not a prerequisite.

Do not create a record merely to close a task. One-off failures, raw logs, temporary debugging traces, unverified guesses, sensitive data, and task-specific outcomes remain task-local.

## Priority and Policy

Current user instructions, current workspace evidence, and applicable Policy take precedence over experience records. An experience record provides guidance only; it does not authorize an action, replace `{{HARNESS_DIR}}/docs/policy/action-boundary.md`, or bypass ask-first, forbidden, or stop-and-escalate boundaries.

Before using an experience record, re-check its Source of truth against current task evidence and classify the next action under Policy. If the record conflicts with higher-priority evidence, use the higher-priority source and update, retire, or mark the experience stale after verification.

This `README.md` is tool-managed. Individual experience records are project-maintained under `{{HARNESS_DIR}}/docs/experience/`: `init`, `doctor`, and `repair` do not create, overwrite, evaluate, or delete them.

## Lightweight record template

Copy this structure into a project-maintained Markdown file when reusable action knowledge warrants it:

```md
# <Experience topic>

## Status

<Active | Historical | Superseded | Retired>

## Last verified

<YYYY-MM-DD and concise verification basis>

## Scope

<Workspace, subsystem, workflow, or task type>

## Use when

<Signals, conditions, and explicit limits for consulting this guidance>

## Source of truth

<Current files, commands, tests, configuration, or external authority to re-check before using this guidance>

## Safe approach

<Verified sequence for inspecting, deciding, or acting. This is not authorization: re-check current facts and apply Policy before acting.>

## Do not assume

<What this guidance does not prove about the current environment, permissions, data, versions, authentication, or task scope>

## Refresh when

<Concrete changes or signals that require re-checking, revising, superseding, retiring, or marking this record stale>

## Origin (optional)

- Origin task: `<agent-work/tasks/<task-name>/>`
- Rechecked against source of truth: `<YYYY-MM-DD — current files, command, or user confirmation>`

<This optional locator does not replace Source of truth or copy raw task logs. Omit it when no task path is useful.>
```
