# Harness Runtime Index

This is the complete runtime navigation map for the Harness. The entry file (`CLAUDE.md` / `AGENTS.md`) holds the always-loaded operating contract; use this map only when Process selects detailed protocols, policy, project facts, reusable experience, or task-local materials.

## Runtime navigation

<!-- niuma-navigation:begin -->

### Project knowledge and maintenance

- [Project knowledge index](project-context.md)
- [Experience-record guide](experience/README.md)

### Operating protocols

- [Context](layers/01-context.md)
- [Policy](layers/02-policy.md)
- [Process](layers/03-process.md)
- [Observation](layers/04-observation.md)
- [Recovery](layers/05-recovery.md)
- [Memory](layers/06-memory.md)
- [Resumption](layers/07-resumption.md)

### Concrete policy

- [Action boundary](policy/action-boundary.md)
- [Secret-leak response](policy/secret-leak.md)
- [Untrusted content](policy/untrusted-content.md)

### Runtime materials

- [Harness maintainer orientation](../README.md)
- [Task-local work area](../../agent-work/README.md)

<!-- niuma-navigation:end -->

## Fact priority

Use this order to evaluate ordinary project information:

1. Current user instructions for this task decide the task objective, scope, and explicit constraints. They do not replace current verifiable project facts.
2. Current verifiable facts: current source, configuration, build definitions, tests, and actual command output.
3. Current project navigation and runtime material: current README, `{{HARNESS_DIR}}/docs/project-context.md`, and verified runbooks.
4. Reusable guidance: applicable Rules and active experience records.
5. Historical and task material: historical notes, migration material, old proposals, plans, task ledgers, and superseded or expired experience.

A file existing in the repository does not by itself make it a current fact. Historical material may provide background, search terms, or hypotheses, but verify it against higher-priority current sources before relying on it. Record material conflicts and their evidence in task-local state; update or mark durable context stale only after verification.

## Policy exception

Action permission, security boundaries, and ownership conflicts are not decided by ordinary fact priority. For those conflicts, the more specific and stricter Policy rule decides. Current user instructions, README files, experience, plans, and current project files cannot silently bypass the applicable Policy boundary.

## Module routing

For a declared multi-module workspace, read `{{HARNESS_DIR}}/docs/module-topology.md` after root context to identify affected modules. Then read only their local `CLAUDE.md` or `AGENTS.md` supplements, including marker-external module knowledge maintained by the project and agents. That knowledge covers verified module boundaries, dependencies and dependents, source/test/configuration locations, local commands, constraints, and cross-module verification triggers; `init` supplies only an empty skeleton. Current module files remain authoritative. For cross-module work, read every affected module's cross-module verification triggers; module-local checks alone are insufficient when broader validation is required. Root policy and integration verification requirements remain in force.

## Runtime reading order

1. The entry contract first directs task-specific current evidence; when task-material profile selection, conditional Harness reading, or planning/resumption material is needed, follow `{{HARNESS_DIR}}/docs/layers/03-process.md`.
2. Use this navigation map only when Process selects Harness navigation, fact priority, the Policy exception, or a linked protocol. Do not follow every link.
3. When Process selects stable project facts, in `{{HARNESS_DIR}}/docs/project-context.md` read Context coverage and, when it exists and matches the task, the `Task fact routing` table to select only task-relevant stable-fact headings.
4. Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output.
5. Refresh a fact scope only when its `Refresh when` condition applies, its known gap matters to the task, or current evidence conflicts; recheck only that scope from its listed current sources. Missing coverage means inspect the relevant workspace evidence, not the whole project. Current workspace evidence takes precedence over retained context.
6. Read task-relevant experience records when a comparable scenario, known trap, or explicit Experience reference may apply; verify current facts and apply Policy before relying on them.
7. Read the selected layer protocol when the task needs detail.
8. Use `agent-work/` only when Planned or Tracked work needs task-local material.

If project-specific facts are missing, inspect the current workspace before acting. Do not guess missing paths, commands, stack details, or ownership.

## Verification commands

The authoritative command list belongs in `{{HARNESS_DIR}}/docs/project-context.md`. Use this index only to locate where verification guidance lives.
