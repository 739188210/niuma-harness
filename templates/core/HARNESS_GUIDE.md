# Niuma Harness Guide

This directory contains the AI engineering harness for the workspace.

Generated entry file(s): `{{ENTRY_FILES}}`

## Purpose

This guide explains the generated harness structure for people maintaining or reviewing the harness. Normal agent task execution starts from `docs/index.md`.

The harness gives AI coding tools a stable 7-layer operating context:

- Context: how agents find and verify project facts
- Policy: what agents may do, must not do, or must ask about
- Process: how agents choose task workflows
- Observation: how agents verify the current state
- Recovery: how agents respond when work fails or becomes unclear
- Memory: how agents decide what to preserve or keep task-local
- Loop: how agents continue, pause, recover, or stop

Layer memos define how agents use each capability. They do not replace the content files they point to. For example, `docs/layers/01-context/memo.md` explains how to use context, while `docs/project-context.md` stores verified project facts. `docs/layers/03-process/memo.md` explains how to choose a workflow, while `docs/process/` stores concrete playbooks.

## Runtime entry

For task execution, agents should start at `docs/index.md`. That runtime map points to the stable project facts, layer protocols, task playbooks, engineering rules, and task notes.

If project-specific facts are incomplete, agents should inspect the current workspace and update durable facts only when verified. The harness should be useful immediately after init; it should not depend on a human filling every placeholder before agents can begin.

## Directory map

- `docs/index.md`: runtime map and reading order for agents.
- `docs/project-context.md`: verified stable project facts, not task-local notes.
- `docs/layers/`: 7-layer harness protocols and agent operating model.
- `docs/process/`: concrete task playbooks selected by the Process layer.
- `docs/rules/`: engineering standards for coding, testing, and security.
- `docs/automation/`: automation and hook intent notes.
- `docs/tasks/`: task records and handoff notes.

## Maintenance rule

Keep long-lived verified facts in `docs/project-context.md`. Keep temporary investigation notes in `docs/tasks/` or another task-local location.
