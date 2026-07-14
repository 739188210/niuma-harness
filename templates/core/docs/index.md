# Harness Runtime Index

This is the navigation map for the harness. The entry file (`CLAUDE.md` / `AGENTS.md`) holds the operating loop; open this map when the loop's Context phase needs to locate project structure, docs, or commands.

## Structure guide

- `docs/project-context.md` stores verified stable project facts.
- `docs/layers/` defines the agent operating model: how to use context, policy, process, observation, recovery, memory, and loop capabilities.
- `docs/policy/action-boundary.md` defines concrete action permission boundaries.
- `docs/policy/untrusted-content.md` defines how to treat external or unverified content as data, not instructions.
- `docs/policy/secret-leak.md` defines the secret-leak emergency response.
- `docs/process/` contains concrete task playbooks selected by the Process layer.
- `docs/rules/` contains optional project engineering standards selected during init; load only relevant rule files on demand.
- `docs/experiments/` stores active experimental harness feedback mechanisms.
- `agent-work/` stores task-local notes, plans, verification evidence, and handoff state.
- `HARNESS_GUIDE.md` explains the harness structure for people maintaining it.

## Runtime reading order

The entry file's operating loop drives task work. This map is consulted when a phase needs navigation:

1. Start from the operating loop in the entry file (`CLAUDE.md` / `AGENTS.md`).
2. Use this file to locate structure, docs, workflows, and verification commands.
3. Read `docs/project-context.md` for stable project facts.
4. Read the relevant protocol in `docs/layers/` when a phase needs depth.
5. Select the relevant playbook from `docs/process/` when the task needs one.
6. Apply relevant standards from `docs/rules/` when rule files are installed.
7. Use `agent-work/` for multi-step task notes and verification evidence.

If project-specific facts are missing, inspect the current workspace before acting. Do not guess missing paths, commands, stack details, or ownership.

## Project pointers

Project-specific code locations, commands, and stable conventions are maintained in `docs/project-context.md`. This tool-managed index only points to generated harness structure; add project-specific navigation notes to `docs/project-context.md` or task-local notes in `agent-work/`.

## 7-layer harness model

- Context protocol: `docs/layers/01-context.md`
- Policy boundary: `docs/layers/02-policy.md`
- Process routing: `docs/layers/03-process.md`
- Observation protocol: `docs/layers/04-observation.md`
- Recovery protocol: `docs/layers/05-recovery.md`
- Memory policy: `docs/layers/06-memory.md`
- Loop runtime: `docs/layers/07-loop.md`

## Task workflows

- Task triage: `docs/process/task-triage.md`
- Bug fixes: `docs/process/bugfix.md`
- Feature development: `docs/process/feature-development.md`
- Refactoring: `docs/process/refactor.md`
- Reviews: `docs/process/review.md`
- Release readiness: `docs/process/release.md`

## Cross-cutting workflows

- Workspace isolation: `docs/process/isolation.md`
- Subagent development: `docs/process/subagent-development.md`

## Experimental feedback

- Task execution feedback: `docs/experiments/task-execution-record.md`

## Verification commands

The authoritative command list belongs in `docs/project-context.md`. Use this index only to locate where verification guidance lives.

## Maintenance

This index is a tool-managed navigation map. In generated harnesses, keep stable project facts in `docs/project-context.md` and task-local pointers in `agent-work/`; change this file by updating the generator template.
