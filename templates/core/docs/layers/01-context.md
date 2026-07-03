# Context Layer Memo

## Purpose

Make the workspace understandable before an AI agent plans or edits. This layer defines how to find, verify, and use context.

This memo is a context protocol. It does not store project facts. Stable project facts belong in `docs/project-context.md`.

## When to use

Use this layer at the start of every task, after a context reset, when entering an unfamiliar area of the codebase, or when existing notes conflict with current files.

## Agent protocol

1. Read `docs/index.md` to locate code, docs, workflows, and verification commands.
2. Read `docs/project-context.md` for stable project facts.
3. Inspect current project files when a fact affects the task; do not rely only on stale notes.
4. Identify the task-relevant modules, commands, and constraints before proposing changes.
5. If project notes conflict with current files, treat current files as the source of truth and record the conflict in task notes.

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
- Do not duplicate project facts in this memo; put them in `docs/project-context.md` instead.

## Outputs

- A short statement of the relevant project context for the task.
- The files, modules, or commands that will guide the work.
- Any context gaps or conflicts that need confirmation.
- Candidate stable facts for the Memory layer if new verified facts are discovered.

## Links to other layers

- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Memory: `docs/layers/06-memory.md`
- Project map: `docs/index.md`
- Stable facts: `docs/project-context.md`
