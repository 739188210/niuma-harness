# Memory Layer Memo

## Purpose

Define what an AI agent should preserve for future work and what should remain task-local. This layer protects long-lived context from noise and unverified assumptions.

## When to use

Use this layer after discovering verified stable facts, after finishing multi-step tasks, when project notes are outdated, or when a recurring lesson would help future agents.

## Agent protocol

1. Separate stable project facts from temporary task observations, and verify facts against current files or user confirmation before preserving them.
2. Task-local state stays in `agent-work/tasks/<task-name>/`. This includes progress ledgers, task notes, temporary investigation details, unresolved approval blockers, risks, and verification summaries. Keep other task-local investigation details in the workspace-level `agent-work/` directory or the current task record. Treat `agent-work/tasks/<task-name>/status.md` as task-local operational state; its minimum fields are defined by `{{HARNESS_DIR}}/docs/layers/07-loop.md`.
3. Bootstrap `{{HARNESS_DIR}}/docs/project-context.md` when its structured bootstrap record has `"status": "pending"`: perform the one-time initial project scan defined in that file, record only verified durable facts, and mark the result `complete` or `partial`.
4. Route durable, reusable facts by scope. Module-local durable facts belong in the affected module entry's marker-external knowledge area only after verification against current files or user confirmation. Root or cross-module durable facts belong in `{{HARNESS_DIR}}/docs/project-context.md` under the same standard. A durable fact is reusable across multiple tasks and does not depend on one task's temporary outcome; for example, build/test commands, architecture, module ownership, or external constraints. Task-specific findings stay in `agent-work/`.
5. Put important long-lived decision rationale in project-maintained records under `{{HARNESS_DIR}}/docs/decisions/` when future work must understand why a durable direction was chosen. A decision record explains why a direction was chosen; it does not replace verified facts, current files, or task evidence.
6. Put verified reusable experience with clear applicability and invalidation conditions in project-maintained records under `{{HARNESS_DIR}}/docs/experience/`; it is neither a stable fact nor a decision rationale. Promote it only after verification and condensation from task-local evidence, and state its scope, applicability, source of truth, last verification, and invalidation conditions.
7. Approval blockers and risks are task-local until resolved. Move them into durable project context only when they become verified recurring constraints.
8. Do not store secrets, private data, or unverified guesses.

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
- Do not promote every task decision, one-off log, unverified guess, or sensitive detail into a decision record.
- Do not promote raw task notes, one-off failures, temporary logs, unverified guesses, or sensitive details into experience records.

## Outputs

- Task-local notes and status ledgers for temporary findings and recovery state.
- Candidate stable facts for `{{HARNESS_DIR}}/docs/project-context.md`.
- Candidate long-lived decision records under `{{HARNESS_DIR}}/docs/decisions/` when their rationale must survive the task.
- Candidate reusable experience records under `{{HARNESS_DIR}}/docs/experience/` when a verified lesson should survive the task.
- Open questions needing user confirmation.
- Links between related context, process, and verification records.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Loop: `{{HARNESS_DIR}}/docs/layers/07-loop.md`
- Stable facts: `{{HARNESS_DIR}}/docs/project-context.md`
- Task work area: `agent-work/`
