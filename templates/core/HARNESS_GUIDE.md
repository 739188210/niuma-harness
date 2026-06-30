# Niuma Harness Guide

This directory contains the AI engineering harness for the workspace.

Generated entry file(s): `{{ENTRY_FILES}}`

## Purpose

This guide explains the generated harness structure for people maintaining or reviewing the harness. Normal agent task execution is driven by the operating loop in the entry file (`CLAUDE.md` / `AGENTS.md`); `docs/index.md` is the navigation map that loop's Context phase consults.

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

The entry file (`CLAUDE.md` / `AGENTS.md`) is always in agent context and carries the operating loop. When the loop's Plan phase needs navigation, agents consult `docs/index.md`, which points to the stable project facts, layer protocols, task playbooks, engineering rules, automation intent, and the workspace-level `agent-work/` task area.

If project-specific facts are incomplete, agents should inspect the current workspace and update durable facts only when verified. The harness should be useful immediately after init; it should not depend on a human filling every placeholder before agents can begin.

## Directory map

- `docs/index.md`: navigation map and reading order; reached from the entry loop's Context phase.
- `docs/project-context.md`: verified stable project facts, not task-local notes.
- `docs/layers/`: 7-layer harness protocols and agent operating model.
- `docs/policy/`: concrete action permission boundaries for agents.
- `docs/process/`: concrete task playbooks selected by the Process layer.
- `docs/rules/`: optional engineering standards selected during init.
- `docs/automation/`: automation and hook intent notes.
- `agent-work/`: workspace-level task-local records and verification evidence.

## What changes after init

### Usually stable scaffold files

These files define how the harness works. They should not change during normal task execution:

- `HARNESS_GUIDE.md`
- `docs/index.md`
- `docs/layers/`
- `docs/process/`
- `manifest.json`

`manifest.json` is tool-managed state for `doctor/check`; do not edit it by hand unless you know why.

### Project-maintained files

These files may evolve as the project, team, and tool environment become clearer:

- `docs/project-context.md`: verified stable project facts.
- `docs/policy/action-boundary.md`: team-maintained action permission boundaries.
- `docs/rules/`: selected or team-maintained engineering standards.
- `docs/automation/hooks.md`: verified automation intent.
- `CLAUDE.md` / `AGENTS.md`: entry files carrying the always-loaded operating contract (the 7-step Loop). The contract zone is tool-managed; only the project-notes zone is free to edit.

Do not use these files for temporary task notes or one-off debugging logs.

### Runtime-generated task files

Agents may create task-local records under `agent-work/tasks/` during multi-step work:

```text
agent-work/tasks/<task-name>/
  context.md
  plan.md
  verification.md
  notes.md
```

These files hold task-local memory, verification evidence, and handoff state. Durable project facts should move through the Memory layer before being recorded in `docs/project-context.md`.

## Maintenance rule

Keep long-lived verified facts in `docs/project-context.md`. Keep temporary investigation notes in `agent-work/`.
