# Agent Work Area

This workspace-level directory holds task-local material. Use the smallest material that makes the next action, planned evidence, current truth, and safe resumption clear. Do not create a task folder merely to satisfy a format.

Task-local files live under:

```text
agent-work/tasks/<task-name>/
  plan.md
  status.md
  context.md
  notes.md
  harness-feedback.md
```

## Progressive task-material profile card

`{{HARNESS_DIR}}/docs/layers/03-process.md` selects the smallest progressive task-material profile that fits current evidence. This guide is the only authority for choosing task-local material. Direct, Planned, and Tracked are not independent labels, combinable modes, or a risk matrix: `Direct < Planned < Tracked`.

| Profile | Use when current evidence requires | Required material | Where actual evidence lives |
| --- | --- | --- | --- |
| Direct | Every Direct condition below holds | None | Final response |
| Planned | Direct no longer fits because any planning trigger below holds, but safe resumption does not require a ledger | `plan.md` | Final response |
| Tracked | Planned work also needs a resumable current-state and evidence ledger because any tracking trigger below holds | `plan.md` + `status.md` | `status.md` only |

Planning material does not grant action permission. Classify each boundary action under Policy.

### Direct

Use Direct only when **all** conditions hold:

- the work is read-only or one localized, reversible change;
- it has one clear observable acceptance criterion;
- it has no meaningful implementation or design choice;
- it has no API, data, migration, authentication, dependency, security, cross-module, or external-operation boundary;
- it has no expected handoff, interruption, delegation, or recovery need; and
- the request and current workspace files are enough to resume safely.

Create no task file. In the final response, record actual checks or manual steps, results, skipped checks with their impact, and remaining unknowns.

If any condition stops being true, stop treating work as Direct. Re-check Process and Policy and select the required material before continuing.

### Planned

Create `agent-work/tasks/<task-name>/plan.md` **before implementation**, or before the next implementation step when current work is reclassified, when any condition holds:

- two or more implementation steps, related edits, changed areas, components, or file families;
- two or more acceptance criteria;
- a meaningful implementation choice, trade-off, ordering dependency, rollback concern, or compatibility concern;
- an API, data, migration, compatibility, authentication, dependency, security, cross-module, or external-operation boundary;
- planned verification has non-obvious, manual, multi-stage, or integration evidence requirements;
- the user asks for a plan; or
- the work is Tracked.

A plan is an execution input, never a completion summary or evidence ledger. It records the approved goal, boundaries, smallest approach, and planned verification. Do not backfill one merely to narrate completed work; when reclassification makes planning necessary, document the remaining approved work before continuing.

```md
# Task plan

## Goal and boundaries
- Goal:
- Non-goals and constraints:

## Success criteria
- <observable behavior or result>

## Smallest approach
- <why this path fits the current architecture>

## Planned verification
- <check or manual observation>
```

### Tracked

Tracked work is always Planned. Create and maintain both:

```text
agent-work/tasks/<task-name>/plan.md
agent-work/tasks/<task-name>/status.md
```

Use Tracked when any condition holds:

- work is blocked, under Recovery, delegated, parallel, or likely to cross sessions;
- it cannot safely resume from the request and current files alone;
- its scope changes materially;
- it has material failures, unknowns, external prerequisites, or approval dependencies; or
- multiple stages must be integrated before a truthful outcome can be stated.

`plan.md` is the execution input. `status.md` is the sole task-local operational and evidence ledger: it records current state, actual observations, scope changes, deferred work, applicable authorization boundary or user approval reference, and the next safe action; do not create `verification.md` or another competing task evidence ledger.

Use these distinct terms:

| Kind | Values | Meaning |
| --- | --- | --- |
| Work state | `active` / `blocked` / `stopped` / `closed` | Whether task work can currently proceed. |
| Criterion result | `passed` / `failed` / `blocked` / `skipped` / `unknown` | What the evidence proves about one acceptance criterion. |
| Task outcome | `passed` / `partial` / `blocked` / `failed` / `unknown` | Honest conclusion across material acceptance criteria. |

Only an outcome of `passed` permits the final response to call the task complete. `closed` may have a `partial` or `blocked` outcome when work is handed off or stopped with the user’s knowledge.

Use this minimum shape:

```md
# Task status

- Work state:
- Task outcome:
- Goal and current scope:
- Confirmed progress:
- Last verified evidence:
- Remaining unknowns:
- Blockers or risks:
- Next safe action:
- Resume condition:

## Acceptance and evidence
| Criterion | Planned evidence | Actual evidence | Result |
| --- | --- | --- | --- |
| <criterion> | <required signal> | <actual fact> | passed / failed / blocked / skipped / unknown |
```

Add this section only for a material scope change:

```md
## Scope change
- Before:
- After:
- Trigger: user request | discovered constraint | policy boundary
- Evidence/reference:
- Changed acceptance criteria:
- Deferred or blocked work:
```

A narrowed scope can pass only as the revised task. It does not silently make the original scope complete.

## Evidence and outcome quick rules

- Evidence is scoped: focused tests do not prove full regression; builds do not prove typechecks; typechecks do not prove runtime workflows; a migration source does not prove it was applied; and unauthenticated browser access does not prove authenticated acceptance.
- Record only actual observations: command or manual check, actual result, skipped checks with reason and impact, and remaining unknowns. Unrun checks are unknown, not passed.
- A broad failure is only suspected pre-existing until the same failure was observed before the task, its location and type are demonstrably outside changed scope, or trusted CI, a baseline, or verified historical evidence establishes it. Even then, record the broad check as not passing.
- `passed` means every material criterion has sufficient passing evidence. Material failures, blockers, skipped checks with unresolved impact, or unknowns require `partial`, `blocked`, `failed`, or `unknown`, not complete.
- Policy decides whether an action is allowed. For material authorization, scope, or deferment changes, record the actual user approval or Policy boundary reference in `status.md`; do not infer approval from a plan.

Use `{{HARNESS_DIR}}/docs/layers/04-observation.md` for detailed evidence and outcome semantics, `{{HARNESS_DIR}}/docs/layers/05-recovery.md` for failure handling, `{{HARNESS_DIR}}/docs/policy/action-boundary.md` for authorization, and `{{HARNESS_DIR}}/docs/layers/07-resumption.md` for resume order.

## Optional task material

Create other files only when they add information that cannot stay concise in `status.md`:

- `context.md`: verified current facts, constraints, assumptions, and open questions; not implementation steps or raw command output.
- `notes.md`: temporary investigation notes, failed attempts, candidate approaches, candidate reusable Experience, and handoff detail; not a current-state or verification authority.
- `harness-feedback.md`: optional feedback about Harness protocol or documentation friction. Create it only when the task exposes helpful guidance, ambiguity, conflict, friction, unnecessary cost, or a missing instruction in the Harness documents; project technical discoveries belong in task state, project context, or Experience instead.

A Harness feedback file is free Markdown. Keep it focused on:

```md
# Harness feedback

- Harness document or guidance involved:
- Task situation:
- Observed help, ambiguity, or friction:
- Actual impact on execution:
- Suggested documentation improvement:
- Why this belongs to Harness feedback rather than project context or Experience:
```

Do not use `harness-feedback.md` as a plan, status ledger, evidence log, authorization ledger, scope ledger, or completion report. Its absence never blocks task execution, recovery, or completion.

## Durable facts

Use `{{HARNESS_DIR}}/docs/layers/06-memory.md` to route verified durable facts and reusable Experience. Verified root or cross-module facts belong in `{{HARNESS_DIR}}/docs/project-context.md`; do not put task-local records under `{{HARNESS_DIR}}/docs/`.

## Resume

For Tracked work, the Resumption entry defines the only resume reading order: `{{HARNESS_DIR}}/docs/layers/07-resumption.md`.
