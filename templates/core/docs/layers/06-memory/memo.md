# Memory Layer Memo

## Purpose

Define what an AI agent should preserve for future work and what should remain task-local. This layer protects long-lived context from noise and unverified assumptions.

## When to use

Use this layer after discovering verified stable facts, after finishing multi-step tasks, when project notes are outdated, or when a recurring lesson would help future agents.

## Agent protocol

1. Separate stable project facts from temporary task observations.
2. Verify facts against current files or user confirmation before preserving them.
3. Keep task-local investigation details in the workspace-level `agent-work/` directory or the current task record.
4. Propose updates to `docs/project-context.md` only for durable, reusable facts. A fact is durable when it is reused across multiple tasks and does not change with a single task's outcome (for example build/test commands, architecture, module ownership, or external constraints); task-specific findings stay in `agent-work/`.
5. Do not store secrets, private data, or unverified guesses.

## Allowed actions

- Record task progress, verification evidence, and handoff notes.
- Suggest updates to stable project context when facts are verified.
- Link related documents so future agents can find the right source quickly.
- Mark uncertain facts as open questions instead of long-lived truth.

## Forbidden actions

- Do not save credentials, tokens, personal data, or sensitive operational details.
- Do not preserve temporary errors, one-off logs, or abandoned hypotheses as stable facts.
- Do not overwrite project context with guesses.
- Do not duplicate information already maintained by source files or package metadata unless a human-readable index is needed.

## Outputs

- Task-local notes for temporary findings.
- Candidate stable facts for `docs/project-context.md`.
- Open questions needing user confirmation.
- Links between related context, process, and verification records.

## Links to other layers

- Context: `docs/layers/01-context/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Loop: `docs/layers/07-loop/memo.md`
- Stable facts: `docs/project-context.md`
- Task work area: `agent-work/`
