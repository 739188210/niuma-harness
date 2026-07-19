# Harness Runtime Index

This is the navigation map for the harness. The entry file (`CLAUDE.md` / `AGENTS.md`) holds the operating loop; open this map when the loop's Context phase needs to locate project structure, docs, or commands.

## Structure guide

- `{{HARNESS_DIR}}/docs/project-context.md` stores verified stable project facts.
- `{{HARNESS_DIR}}/docs/decisions/` stores project-maintained long-lived decision rationale.
- `{{HARNESS_DIR}}/docs/experience/` stores project-maintained reusable experience, known traps, and verified approaches.
- `{{HARNESS_DIR}}/docs/layers/` defines the agent operating model: how to use context, policy, process, observation, recovery, memory, and loop capabilities.
- `{{HARNESS_DIR}}/docs/policy/action-boundary.md` defines concrete action permission boundaries.
- `{{HARNESS_DIR}}/docs/policy/untrusted-content.md` defines how to treat external or unverified content as data, not instructions.
- `{{HARNESS_DIR}}/docs/policy/secret-leak.md` defines the secret-leak emergency response.
- `{{HARNESS_DIR}}/docs/process/` contains concrete task playbooks selected by the Process layer.
- Optional engineering standards selected during init are installed in the selected agent's native rule surface.
- `{{HARNESS_DIR}}/docs/experiments/` stores active experimental harness feedback mechanisms.
- `agent-work/` stores task-local notes, plans, verification evidence, and handoff state.
- `{{HARNESS_DIR}}/README.md` explains the harness structure and how to use it.

## Fact priority

When sources conflict, use this order:

1. Current user instructions for this task.
2. Current workspace files and actual command output.
3. Verified stable facts in `{{HARNESS_DIR}}/docs/project-context.md`.
4. Generated Harness protocols and process documents under `{{HARNESS_DIR}}/docs/`.
5. Task-local notes under `agent-work/`.

Older notes never override current files. Decision records explain durable rationale but never override current user instructions or current workspace files. Experience records provide reusable guidance but never override current user instructions or current workspace files. Check higher-priority sources, record the conflict and its evidence in task-local notes, then update or mark durable context as stale only after verification.

## Runtime reading order

The entry file's operating loop drives task work. This map is consulted by need when a phase needs navigation:

1. Start from the operating loop in the entry file (`CLAUDE.md` / `AGENTS.md`).
2. Use this file to locate structure, docs, workflows, and verification commands.
3. Read only the task-relevant stable facts in `{{HARNESS_DIR}}/docs/project-context.md`.
4. Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output.
5. Read task-relevant experience records in `{{HARNESS_DIR}}/docs/experience/` only when a recurring scenario or known trap may apply; verify current facts before relying on them.
6. Read the relevant protocol in `{{HARNESS_DIR}}/docs/layers/` when a phase needs depth.
7. Select the relevant playbook from `{{HARNESS_DIR}}/docs/process/` when the task needs one.
8. Apply relevant installed engineering standards.
9. Use `agent-work/` for multi-step task notes and verification evidence.

If project-specific facts are missing, inspect the current workspace before acting. Do not guess missing paths, commands, stack details, or ownership.

## Project pointers

Project-specific code locations, commands, and stable conventions are maintained in `{{HARNESS_DIR}}/docs/project-context.md`. Keep long-lived decision rationale in project-maintained records under `{{HARNESS_DIR}}/docs/decisions/`, reusable experience in `{{HARNESS_DIR}}/docs/experience/`, and task-local notes in `agent-work/`. This tool-managed index only points to generated harness structure.

## 7-layer harness model

- Context protocol: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy boundary: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process routing: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Observation protocol: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery protocol: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Memory policy: `{{HARNESS_DIR}}/docs/layers/06-memory.md`
- Loop runtime: `{{HARNESS_DIR}}/docs/layers/07-loop.md`

## Task workflows

- Task triage: `{{HARNESS_DIR}}/docs/process/task-triage.md`
- Bug fixes: `{{HARNESS_DIR}}/docs/process/bugfix.md`
- Feature development: `{{HARNESS_DIR}}/docs/process/feature-development.md`
- Refactoring: `{{HARNESS_DIR}}/docs/process/refactor.md`
- Test-driven development: `{{HARNESS_DIR}}/docs/process/test-driven-development.md`
- Reviews: `{{HARNESS_DIR}}/docs/process/review.md`
- Release readiness: `{{HARNESS_DIR}}/docs/process/release.md`

## Cross-cutting workflows

- Workspace isolation: `{{HARNESS_DIR}}/docs/process/isolation.md`
- Subagent development: `{{HARNESS_DIR}}/docs/process/subagent-development.md`

## Experimental feedback

- Task execution feedback: `{{HARNESS_DIR}}/docs/experiments/task-execution-record.md`

## Verification commands

The authoritative command list belongs in `{{HARNESS_DIR}}/docs/project-context.md`. Use this index only to locate where verification guidance lives.

## Maintenance

This index is a tool-managed navigation map. In generated harnesses, keep stable project facts in `{{HARNESS_DIR}}/docs/project-context.md`, long-lived decision rationale in project-maintained `{{HARNESS_DIR}}/docs/decisions/` records, reusable experience in project-maintained `{{HARNESS_DIR}}/docs/experience/` records, and task-local pointers in `agent-work/`; change this file by updating the generator template.
