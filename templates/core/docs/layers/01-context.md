# Context Layer Memo

## Purpose

Make the workspace understandable before an AI agent plans or edits. This layer defines how to find, verify, and use context.

This memo is a context protocol. It does not store project facts. Stable project facts belong in `{{HARNESS_DIR}}/docs/project-context.md`. Follow the fact priority in `{{HARNESS_DIR}}/docs/index.md`: project context helps locate verified durable facts, while current files determine task-specific facts.

## When to use

Use this layer at the start of every task, after a context reset, when entering an unfamiliar area of the codebase, or when existing notes conflict with current files.

## Agent protocol

1. Read `{{HARNESS_DIR}}/docs/index.md` to locate code, docs, workflows, verification commands, fact priority, and the Policy exception.
2. Classify each task-relevant source as current verifiable fact, current navigation/runtime material, governance or reusable knowledge, or historical/task material. A file existing in the repository is not automatically a current fact.
3. Read only the task-relevant parts of `{{HARNESS_DIR}}/docs/project-context.md`, current README files, and verified runbooks to find stable facts and current operating guidance that may apply.
4. Inspect current source, configuration, build definitions, tests, and command output when a fact affects the task; do not rely only on stale notes, plans, migration material, ADRs, or experience. Current verifiable evidence determines task-specific facts.
5. Identify whether the task is module-local, cross-module, or workspace-level. For declared modules, use `{{HARNESS_DIR}}/docs/module-topology.md`, then inspect only affected local supplements, including their marker-external module knowledge area, and current module files before proposing changes. Treat module knowledge as a locator for durable facts; current module files determine task-specific facts.
6. Use Rules, accepted and unsuperseded ADRs, and active experience as governance or reusable guidance. Use historical materials only as background, search terms, or hypotheses until verified against higher-priority current sources.
7. If project materials conflict, record the conflict in task-local notes and update or flag durable context only after verification. For action permission, security boundaries, or ownership conflicts, stop applying ordinary fact priority and follow the more specific, stricter Policy rule.
8. For non-trivial tasks, record the task-relevant project files and Harness docs with their purpose, reused implementations, known gaps, and a context-sufficiency claim in `harness-feedback.md`; this is self-reported evidence, not proof of a read event.

## Allowed actions

- Read project maps, context notes, source files, configuration files, and package manifests.
- Search for related implementations, tests, commands, and references.
- Record missing or outdated context as a task-local note.
- Recommend updates to long-lived context after verification.

## Forbidden actions

- Do not guess project structure, stack, commands, or ownership when files can be inspected.
- Do not treat old notes as more authoritative than current source files.
- Do not edit unrelated context files while still exploring.
- Do not write unverified assumptions into long-lived project context.
- Do not duplicate project facts in this memo; put them in `{{HARNESS_DIR}}/docs/project-context.md` instead.

## Outputs

- A short statement of the relevant project context for the task.
- The files, modules, or commands that will guide the work.
- Any context gaps or conflicts that need confirmation.
- Candidate stable facts for the Memory layer if new verified facts are discovered.

## Links to other layers

- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Memory: `{{HARNESS_DIR}}/docs/layers/06-memory.md`
- Project map: `{{HARNESS_DIR}}/docs/index.md`
- Stable facts: `{{HARNESS_DIR}}/docs/project-context.md`
