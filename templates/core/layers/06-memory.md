# Memory Layer Memo

## Purpose

Define what an AI agent should preserve for future work and what should remain task-local. This layer protects long-lived context from noise and unverified assumptions.

## When to use

Use this layer after discovering verified stable facts, after finishing Tracked tasks, when project notes are outdated, or when a discovery could change a future comparable task's safe next step.

## Finding routing

Classify a verified discovery by what future work needs from it. Use one primary destination; do not duplicate the same mutable fact across records.

| Discovery | Primary destination | Boundary |
| --- | --- | --- |
| Current task progress, actual checks, unknowns, blockers, risks, or next action | `agent-work/tasks/<task-name>/status.md` for Tracked work; final response for Direct work | Serves the current task only; it is not durable project memory. |
| Current project structure, current verification boundary, current environment constraint, module ownership, command, or other durable fact | `{{HARNESS_DIR}}/docs/project-context.md` or applicable module knowledge | Describes what the project is currently like; re-check its current source before relying on it. |
| Reusable action knowledge: a safe approach, trap, diagnostic path, or decision pattern for a comparable future task | Project-maintained `{{HARNESS_DIR}}/docs/experience/<topic>.md` | Describes when and how to act safely, not what the project is currently like. A first verified discovery may qualify; repetition is not required. |
| Help, ambiguity, conflict, friction, unnecessary cost, or missing guidance in the Harness protocol or documentation itself | Optional `agent-work/tasks/<task-name>/harness-feedback.md` | Feedback about the Harness only; it does not replace task status, observations, authorization, scope, or completion conclusions. |

If none applies, do not preserve it beyond the final response. Do not create records merely to close a task.

## Agent protocol

1. Separate current task observations from durable project facts and reusable action knowledge. Verify facts against current files, command output, tests, configuration, or user confirmation before preserving them.
2. For Tracked work, task-local state stays in `agent-work/tasks/<task-name>/status.md`. It includes progress, temporary investigation details needed to continue, unresolved approval blockers, risks, actual observations, and handoff state. Direct work reports equivalent observations in the final response.
3. When updating user-managed `{{HARNESS_DIR}}/docs/project-context.md`, record only verified durable facts with durable value. Give each fact scope a source, scope, and freshness boundary, including a `Refresh when` condition when useful. Current workspace evidence always overrides the index.
4. Route durable facts by scope. Module-local durable facts belong in the affected module entry's marker-external knowledge area only after verification. Root or cross-module durable facts belong in `{{HARNESS_DIR}}/docs/project-context.md` under the most suitable existing heading.
5. When a project uses `Task fact routing`, update it only when the task-to-heading mapping changes. Keep it a compact locator; do not put source trees, test inventories, raw command output, temporary investigation, task state, or module-local details there.
6. Create or update an experience record only when the discovery is verified, can help a future comparable task avoid a wrong, unsafe, or wasteful next step, and can state `Use when`, `Source of truth`, `Safe approach`, `Do not assume`, and `Refresh when`. A first verified discovery may qualify; do not wait for recurrence.
7. An experience record is guidance, not action authorization. Before following it, re-check its Source of truth and classify the current action under Policy. Current user instructions, current workspace evidence, and stricter Policy always win.
8. Use `harness-feedback.md` only for Harness protocol or documentation friction. Project code, environment, and operational discoveries belong in task state, project context, or Experience according to the routing table.
9. Do not promote one-off failures, raw logs, temporary debugging traces, unverified guesses, secrets, private data, or sensitive operational details. “First verified discovery may qualify” does not mean every first discovery must become Experience.
10. Approval blockers and risks are task-local until resolved. Move them into durable project context only when they become verified recurring constraints.

## Allowed actions

- Record task progress, observations, and handoff notes.
- Suggest updates to stable project context when facts are verified.
- Create or update Experience when a verified first discovery has clear future reuse value and boundaries.
- Write optional Harness feedback when task execution exposes Harness documentation friction.
- Mark uncertain facts as open questions instead of long-lived truth.

## Forbidden actions

- Do not save credentials, tokens, personal data, or sensitive operational details.
- Do not preserve temporary errors, one-off logs, or abandoned hypotheses as stable facts or Experience.
- Do not treat `status.md` as durable project memory.
- Do not overwrite project context with guesses.
- Do not duplicate information already maintained by source files or package metadata unless a human-readable index is needed.
- Do not use Experience as a substitute for current evidence or Policy.
- Do not use Harness feedback as a task status, verification, authorization, scope, or completion record.

## Outputs

- Task-local status ledgers and final responses for current task findings.
- Candidate stable facts for `{{HARNESS_DIR}}/docs/project-context.md`.
- Candidate reusable action knowledge under `{{HARNESS_DIR}}/docs/experience/`.
- Optional Harness documentation feedback under `agent-work/tasks/<task-name>/harness-feedback.md`.
- Open questions needing user confirmation.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Loop: `{{HARNESS_DIR}}/docs/layers/07-loop.md`
- Stable facts: `{{HARNESS_DIR}}/docs/project-context.md`
- Task work area: `agent-work/`
