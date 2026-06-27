# Harness Runtime Index

Use this file as the runtime map for AI tools working in this workspace.

## Structure guide

- `docs/project-context.md` stores verified stable project facts.
- `docs/layers/` defines the agent operating model: how to use context, policy, process, observation, recovery, memory, and loop capabilities.
- `docs/process/` contains concrete task playbooks selected by the Process layer.
- `docs/rules/` contains project engineering standards used while following a playbook.
- `docs/tasks/` stores task-local notes, plans, verification evidence, and handoff state.
- `HARNESS_GUIDE.md` explains the harness structure for people maintaining it.

## Runtime reading order

For task work:

1. Use this file as the navigation map.
2. Read `docs/project-context.md` for stable project facts.
3. Read the relevant protocol in `docs/layers/`.
4. Select the relevant playbook from `docs/process/` when the task needs one.
5. Apply relevant standards from `docs/rules/`.
6. Use `docs/tasks/` for multi-step task notes and verification evidence.

If project-specific facts are missing, inspect the current workspace before acting. Do not guess missing paths, commands, stack details, or ownership.

## Project pointers

Project-specific code locations, commands, and stable conventions are maintained in `docs/project-context.md`. Keep only short navigation notes here when they help agents find the right source quickly.

## 7-layer harness model

- Context protocol: `docs/layers/01-context/memo.md`
- Policy boundary: `docs/layers/02-policy/memo.md`
- Process routing: `docs/layers/03-process/memo.md`
- Observation protocol: `docs/layers/04-observation/memo.md`
- Recovery protocol: `docs/layers/05-recovery/memo.md`
- Memory policy: `docs/layers/06-memory/memo.md`
- Loop runtime: `docs/layers/07-loop/memo.md`

## Task workflows

- Task triage: `docs/process/task-triage.md`
- Bug fixes: `docs/process/bugfix.md`
- Feature development: `docs/process/feature-development.md`

## Verification commands

The authoritative command list belongs in `docs/project-context.md`. Agents may add short runtime pointers here only when they reduce navigation friction.

## Maintenance

Update this index when important docs or standard workflows change. Keep stable project facts in `docs/project-context.md`; keep this file focused on navigation.
