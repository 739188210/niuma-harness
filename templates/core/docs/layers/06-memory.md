# Memory Layer Memo

## Purpose

Define what an AI agent should preserve for future work and what should remain task-local. This layer protects long-lived context from noise and unverified assumptions.

## When to use

Use this layer after discovering verified stable facts, after finishing multi-step tasks, when project notes are outdated, or when a recurring lesson would help future agents.

## Agent protocol

1. Separate stable project facts from temporary task observations.
2. Verify facts against current files or user confirmation before preserving them.
3. Keep task-local investigation details in the workspace-level `agent-work/` directory or the current task record.
4. Bootstrap `docs/project-context.md` when its metadata says `Bootstrap status: pending`: inspect current workspace files, record only verified basic durable facts, and mark the result `complete` or `partial`.
5. Treat `agent-work/tasks/<task-name>/status.md` as task-local operational state. Its minimum fields are defined by `docs/layers/07-loop.md`.
6. Propose updates to `docs/project-context.md` only for durable, reusable facts. A fact is durable when it is reused across multiple tasks and does not change with a single task's outcome (for example build/test commands, architecture, module ownership, or external constraints); task-specific findings stay in `agent-work/`.
7. Do not store secrets, private data, or unverified guesses.

## Ownership boundaries

Task-local state stays in `agent-work/tasks/<task-name>/`. This includes progress ledgers, task notes, temporary investigation details, unresolved approval blockers, risks, and verification summaries.

Durable facts belong in `docs/project-context.md` only after verification against current files or user confirmation. A durable fact should be reusable across tasks and should not depend on one task's temporary outcome.

Approval blockers and risks are task-local until resolved. Move them into durable project context only when they become verified recurring constraints.

## Allowed actions

- Record task progress, verification evidence, and handoff notes.
- Suggest updates to stable project context when facts are verified.
- Link related documents so future agents can find the right source quickly.
- Mark uncertain facts as open questions instead of long-lived truth.

## Forbidden actions

- Do not save credentials, tokens, personal data, or sensitive operational details.
- Do not preserve temporary errors, one-off logs, or abandoned hypotheses as stable facts.
- Do not treat `status.md` as durable project memory.
- Do not overwrite project context with guesses.
- Do not duplicate information already maintained by source files or package metadata unless a human-readable index is needed.

## Outputs

- Task-local notes and status ledgers for temporary findings and recovery state.
- Candidate stable facts for `docs/project-context.md`.
- Open questions needing user confirmation.
- Links between related context, process, and verification records.

## Links to other layers

- Context: `docs/layers/01-context.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`
- Loop: `docs/layers/07-loop.md`
- Stable facts: `docs/project-context.md`
- Task work area: `agent-work/`
