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

Layer files define how agents use each capability. They do not replace the content files they point to. For example, `docs/layers/01-context.md` explains how to use context, while `docs/project-context.md` stores verified project facts. `docs/layers/03-process.md` explains how to choose a workflow, while `docs/process/` stores concrete playbooks.

## Runtime entry

The entry file (`CLAUDE.md` / `AGENTS.md`) is always in agent context and carries the operating loop. When the loop's Plan phase needs navigation, agents consult `docs/index.md`, which points to the stable project facts, layer protocols, task playbooks, engineering rules, automation intent, and the workspace-level `agent-work/` task area.

If project-specific facts are incomplete, agents should inspect the current workspace and update durable facts only when verified. The harness should be useful immediately after init; it should not depend on a human filling every placeholder before agents can begin.

## Assurance boundary

The generated Markdown is an agent-facing operating contract, not a runtime enforcement layer. `init` copies generated harness artifacts into the workspace; it does not copy the `niuma-harness` CLI implementation. `doctor` is available only while the CLI can still be invoked through an installed package or another configured command path, and it checks installed managed state. Preventing tool actions at runtime depends on controls provided by the host, such as permissions, hooks, or a sandbox.

## Directory map

- `docs/index.md`: navigation map and reading order; reached from the entry loop's Context phase.
- `docs/project-context.md`: verified stable project facts, not task-local notes.
- `docs/layers/`: 7-layer harness protocols and agent operating model.
- `docs/policy/`: concrete action permission boundaries for agents.
- `docs/process/`: concrete task playbooks selected by the Process layer.
- Selected engineering standards are installed in each agent's native rule surface.
- `docs/experiments/task-execution-record.md`: package-enabled structured execution-record contract for non-trivial tasks.
- `agent-work/`: workspace-level task-local records and verification evidence.

## What changes after init

### Tool-managed scaffold files

These files define how the harness works and are refreshed from templates on re-init. Do not edit them by hand unless you are intentionally changing the generator templates:

- `HARNESS_GUIDE.md`
- `docs/index.md`
- `docs/layers/`
- `docs/policy/action-boundary.md`: core action permission boundary.
- `docs/policy/secret-leak.md`: emergency secret-leak response.
- `docs/policy/untrusted-content.md`: untrusted-content handling protocol.
- `docs/process/`
- Native Markdown rule files are Niuma-managed: Claude uses `.claude/rules/`; OpenCode uses `.opencode/rules/` and lists those exact paths in `opencode.json.instructions`. Codex receives the selected Markdown content in the managed `AGENTS.md` contract section. User paths, globs, URLs, and unrelated `opencode.json` fields remain outside Niuma ownership.
- `manifest.json`

`manifest.json` is tool-managed state for `doctor/check`; do not edit it by hand. It records command and rule ownership as source, target, and digest, and is the authoritative ownership/history state for this installed harness. Coordinated edits to both an artifact and its recorded digest are treated as an explicit project-state change and are outside Niuma's integrity guarantees.

On re-init, clean ledger-owned rule files refresh from the package; exact-current legacy files are adopted. Drifted or unowned occupied template-known rule files stop before mutation and direct you to `repair --dry-run`. Repair permanently backs up affected paths, restores canonical content, and Doctor exact-validates package, ledger, and disk. Deselect removes only unchanged ledger-owned files; unknown local files and nonempty directories remain. No rule override layer is supported in this release.

### Project-maintained files

These files may evolve as the project, team, and tool environment become clearer:

- `docs/project-context.md`: verified stable project facts.
- `CLAUDE.md` / `AGENTS.md`: entry files carrying the always-loaded operating contract (the 7-step Loop). The contract zone is tool-managed; only the project-notes zone is free to edit.

Do not use these files for temporary task notes or one-off debugging logs.

### Runtime-generated task files

Runtime task records are stored under `agent-work/tasks/`:

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  harness-feedback.md
  notes.md
```

`harness-feedback.md` stores the structured record used for non-trivial tasks, and `verification.md` stores the evidence referenced by that record. The other files support explicit status and progress, context, planning, notes, or handoff state when a task needs them.

These records support manual Harness evaluation. They are agent-authored self-reports and do not prove that actions occurred, commands ran, or the implementation is objectively correct. See `docs/experiments/task-execution-record.md` for the complete record contract. Durable project facts should move through the Memory layer before being recorded in `docs/project-context.md`.

## Maintenance rule

Keep long-lived verified facts in `docs/project-context.md`. Keep temporary investigation notes in `agent-work/`.
