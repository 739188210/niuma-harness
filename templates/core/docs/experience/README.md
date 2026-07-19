# Experience Library

## Purpose

Use this library to preserve reusable project-maintained experience: verified approaches, recurring scenarios, known traps, and investigation guidance that can help future tasks. An experience record is not a current-state source of truth, project fact index, ADR, or task execution record.

## When to create or update an experience record

Create or update a record only when the lesson is verified against current files, command output, tests, configuration, or user confirmation; can help work beyond the originating task; and has clear applicability and invalidation conditions.

Start from task-local observations in `agent-work/`, then re-check the current source of truth and distill the reusable lesson. Link to authoritative sources instead of copying mutable details or raw task evidence.

## When not to use one

Do not create a record for every task, small implementation choice, raw task note, one-off failure, temporary log, debugging trace, unverified guess, or sensitive data. Do not promote raw task notes, one-off failures, temporary logs, unverified guesses, or sensitive data into an experience record. Keep verified stable project facts in `{{HARNESS_DIR}}/docs/project-context.md`, long-lived decision rationale in `{{HARNESS_DIR}}/docs/decisions/`, and task-local evidence in `agent-work/`.

## Priority and maintenance

Current user instructions and current workspace files take precedence over experience records. Experience records provide reusable guidance but never override current code, configuration, tests, or command output.

When a record conflicts with higher-priority evidence, verify the current state, use the higher-priority source for the task, and then update, retire, or mark the experience stale after verification. Keep unresolved conflict evidence in task-local notes.

This `README.md` is tool-managed. Individual experience records are project-maintained under `{{HARNESS_DIR}}/docs/experience/`: `init`, `doctor`, and `repair` do not create, overwrite, evaluate, or delete them.

## Lightweight record template

Copy this structure into a project-maintained Markdown file when a reusable lesson warrants it:

```md
# <Experience topic>

## Status

<Active | Historical | Superseded | Retired>

## Last verified

<YYYY-MM-DD and concise verification basis>

## Scope

<Workspace, subsystem, workflow, or task type>

## Source of truth

<Current files, commands, tests, configuration, or external authority to re-check>

## Applicable when

<Conditions and explicit limits for using this lesson>

## Scenario or symptoms

<What a future task may observe>

## Verified approach

<Reusable approach that has been verified>

## What not to assume

<Stale assumptions, traps, and boundaries>

## Invalidation conditions

<Changes that require review, revision, or retirement>

## Promotion notes

<Safe reference to the task evidence that suggested this lesson, if useful>
```
