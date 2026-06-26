# Niuma Harness Guide

This directory contains the AI engineering harness for the workspace.

Generated entry file(s): `{{ENTRY_FILES}}`

## Purpose

The harness gives AI coding tools a stable operating context:

- where project code and docs live
- which rules to follow
- which process to use for common task types
- where to record task state and verification evidence

## First steps

1. Fill `docs/index.md` with the real project paths and important docs.
2. Fill `docs/project-context.md` with stable project facts.
3. Adjust `docs/rules/` to match your team conventions.
4. Use `docs/process/` as the default workflow reference.
5. Store multi-step task notes in `docs/tasks/`.

## Directory map

- `docs/index.md`: project map and reading order.
- `docs/project-context.md`: stable project context.
- `docs/rules/`: coding, testing, and security rules.
- `docs/process/`: reusable task workflows.
- `docs/automation/`: automation and hook intent notes.
- `docs/tasks/`: task records and handoff notes.

## Maintenance rule

Keep long-lived facts in `docs/project-context.md`. Keep temporary investigation notes in `docs/tasks/` or another task-local location.
