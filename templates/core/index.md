# Harness Runtime Index

This is the complete runtime navigation map for the harness. The entry file (`CLAUDE.md` / `AGENTS.md`) holds the always-loaded operating loop; use this map to find detailed protocols, policy, playbooks, project facts, and task-local materials.

## Runtime navigation

<!-- niuma-navigation:begin -->

### Project knowledge and maintenance

- [Project knowledge index](project-context.md)
- [Decision-record guide](decisions/README.md)
- [Experience-record guide](experience/README.md)

### Operating protocols

- [Context](layers/01-context.md)
- [Policy](layers/02-policy.md)
- [Process](layers/03-process.md)
- [Observation](layers/04-observation.md)
- [Recovery](layers/05-recovery.md)
- [Memory](layers/06-memory.md)
- [Loop](layers/07-loop.md)

### Concrete policy

- [Action boundary](policy/action-boundary.md)
- [Secret-leak response](policy/secret-leak.md)
- [Untrusted content](policy/untrusted-content.md)

### Task workflows

- [Task triage and lightweight default routing](process/task-triage.md)
- [Bug fixes](process/bugfix.md)
- [Feature development](process/feature-development.md)
- [Refactoring](process/refactor.md)
- [Test-driven development](process/test-driven-development.md)
- [Reviews](process/review.md)
- [Release readiness](process/release.md)
- [Workspace isolation](process/isolation.md)
- [Subagent development](process/subagent-development.md)

### Runtime materials

- [Task execution feedback](experiments/task-execution-record.md)
- [Harness maintainer orientation](../README.md)
- [Task-local work area](../../agent-work/README.md)

<!-- niuma-navigation:end -->

## Fact priority

Use this order to evaluate ordinary project information:

1. Current user instructions for this task decide the task objective, scope, and explicit constraints. They do not replace current verifiable project facts.
2. Current verifiable facts: current source, configuration, build definitions, tests, and actual command output.
3. Current project navigation and runtime material: current README, `{{HARNESS_DIR}}/docs/project-context.md`, and verified runbooks.
4. Governance and reusable knowledge: applicable Rules, accepted and unsuperseded ADRs, and active experience records.
5. Historical and task material: historical notes, migration material, old proposals, plans, task records, and superseded or expired experience.

A file existing in the repository does not by itself make it a current fact. Historical material may provide background, search terms, or hypotheses, but verify it against higher-priority current sources before relying on it. Record material conflicts and their evidence in task-local notes; update, supersede, or mark durable context stale only after verification.

## Policy exception

Action permission, security boundaries, and ownership conflicts are not decided by ordinary fact priority. For those conflicts, the more specific and stricter Policy rule decides. Current user instructions, README files, ADRs, experience, plans, and current project files cannot silently bypass the applicable Policy boundary.

## Module routing

For a declared multi-module workspace, read `{{HARNESS_DIR}}/docs/module-topology.md` after root context to identify affected modules. Then read only their local `CLAUDE.md` or `AGENTS.md` supplements, including marker-external module knowledge maintained by the project and Agents. That knowledge covers verified module boundaries, dependencies and dependents, source/test/configuration locations, local commands, constraints, and Cross-module verification triggers; `init` supplies only an empty skeleton. Current module files remain authoritative. For cross-module work, read every affected module's Cross-module verification triggers; module-local checks alone are insufficient when broader validation is required. Root policy and integration verification requirements remain in force.

## Runtime reading order

1. Start from the operating loop in the entry file (`CLAUDE.md` / `AGENTS.md`).
2. Use this navigation map to locate task-relevant materials.
3. In `{{HARNESS_DIR}}/docs/project-context.md`, read Context coverage and, when it exists and matches the task, the `Task fact routing` table to select only task-relevant stable-fact headings.
4. Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output.
5. Refresh a fact scope only when a source changes, its known gap matters to the task, or current evidence conflicts; missing coverage means inspect the relevant workspace evidence, not the whole project.
6. Read task-relevant experience records only when a recurring scenario or known trap may apply; verify current facts before relying on them.
7. Read the relevant layer protocol and select the relevant playbook when the task needs depth.
8. Apply relevant installed engineering standards and use `agent-work/` for multi-step task notes and verification evidence.

If project-specific facts are missing, inspect the current workspace before acting. Do not guess missing paths, commands, stack details, or ownership.

## Verification commands

The authoritative command list belongs in `{{HARNESS_DIR}}/docs/project-context.md`. Use this index only to locate where verification guidance lives.
