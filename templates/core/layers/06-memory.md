# Memory Layer Memo

## Purpose

Define what an AI agent should preserve for future work and what should remain task-local. This layer protects long-lived context from noise and unverified assumptions.

## When to use

Use this layer after discovering verified stable facts, after finishing status-tracked tasks, when project notes are outdated, or when a recurring lesson would help future agents.

## Agent protocol

1. Separate stable project facts from temporary task observations, and verify facts against current files or user confirmation before preserving them.
2. Task-local state stays in `agent-work/tasks/<task-name>/`. This includes progress ledgers, temporary investigation details, unresolved approval blockers, risks, actual observations, and handoff state. Treat `agent-work/tasks/<task-name>/status.md` as task-local operational state; its minimum fields are defined by `{{HARNESS_DIR}}/docs/layers/07-loop.md`.
3. When updating user-managed `{{HARNESS_DIR}}/docs/project-context.md`, record only verified durable facts with durable value. Give each fact scope a source, scope, and freshness boundary, including a `Refresh when` condition when useful. Current workspace evidence always overrides the index.
4. Route durable facts by scope. Module-local durable facts belong in the affected module entry's marker-external knowledge area only after verification. Root or cross-module durable facts belong in `{{HARNESS_DIR}}/docs/project-context.md` under the most suitable existing heading.
5. When a project uses `Task fact routing`, update it only when the task-to-heading mapping changes. Keep it a compact locator; do not put source trees, test inventories, raw command output, temporary investigation, task state, or module-local details there.
6. Put verified reusable experience with clear applicability and invalidation conditions in project-maintained records under `{{HARNESS_DIR}}/docs/experience/`. It is neither a stable fact nor task execution state. Promote it only after verification and condensation from task-local observations, and state its scope, applicability, source of truth, last verification, and invalidation conditions.
7. Do not create an experience record or project-context update merely to close a task. Promote only material with real long-term value; one-off root causes, raw logs, temporary failures, and unverified guesses remain task-local.
8. Approval blockers and risks are task-local until resolved. Move them into durable project context only when they become verified recurring constraints.
9. Do not store secrets, private data, or unverified guesses.

## Allowed actions

- Record task progress, observations, and handoff notes.
- Suggest updates to stable project context when facts are verified.
- Link related documents so future agents can find the right source quickly.
- Mark uncertain facts as open questions instead of long-lived truth.

## Forbidden actions

- Do not save credentials, tokens, personal data, or sensitive operational details.
- Do not preserve temporary errors, one-off logs, or abandoned hypotheses as stable facts.
- Do not treat `status.md` as durable project memory.
- Do not overwrite project context with guesses.
- Do not duplicate information already maintained by source files or package metadata unless a human-readable index is needed.
- Do not promote raw task notes, one-off failures, temporary logs, unverified guesses, or sensitive details into experience records.

## Outputs

- Task-local status ledgers and notes for temporary findings and recovery state.
- Candidate stable facts for `{{HARNESS_DIR}}/docs/project-context.md`.
- Candidate reusable experience records under `{{HARNESS_DIR}}/docs/experience/` when a verified lesson should survive the task.
- Open questions needing user confirmation.
- Links between related context, process, and observation records.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Loop: `{{HARNESS_DIR}}/docs/layers/07-loop.md`
- Stable facts: `{{HARNESS_DIR}}/docs/project-context.md`
- Task work area: `agent-work/`
