# Decision Records

## Purpose

Use a decision record to preserve a long-lived decision and its rationale when future work needs to understand why the project chose a direction. It is a project-maintained ADR, not a current-state source of truth or a task execution record.

Create one for a durable cross-task decision such as an API contract, data-model direction, security boundary, dependency or framework choice, or shared module convention.

## When not to use one

Do not create a record for every task, small implementation choice, temporary investigation, verification result, or one-off recovery. Keep task-local plans, evidence, status, and handoff notes in `agent-work/`. Keep verified stable project facts in `{{HARNESS_DIR}}/docs/project-context.md`.

## Priority and maintenance

Current user instructions and current workspace files take precedence over decision records. A decision record can explain a durable rationale, but it does not override current code, configuration, tests, or command output.

If a record conflicts with higher-priority evidence, verify the current state, use the higher-priority source for the task, and then update, supersede, or retire the record when appropriate. Record the conflict and its evidence in task-local notes while it is unresolved.

This `README.md` is tool-managed. Individual decision records are project-maintained under `{{HARNESS_DIR}}/docs/decisions/`: `init`, `doctor`, and `repair` do not create, overwrite, evaluate, or delete them.

## Lightweight record template

Copy this structure into a project-maintained Markdown file when a decision warrants it:

```md
# <Decision title>

## Status

<Proposed | Accepted | Superseded | Retired>

## Date

<YYYY-MM-DD>

## Scope

<What project area this affects>

## Context

<Why this decision is needed and the constraints that matter>

## Decision

<The chosen direction>

## Consequences

<Expected benefits, costs, risks, and follow-up effects>

## Alternatives considered

<Meaningful options and why they were not chosen>

## Verification or migration notes

<How to validate, adopt, or safely transition this decision>
```
