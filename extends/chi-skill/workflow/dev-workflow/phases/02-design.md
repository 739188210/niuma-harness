# Phase 2: Product Design

## Goal

Produce a domain design document (`DESIGN.md`) that fully covers the PRD without over-engineering.

## Input

- Confirmed `PRD.md`
- Existing domain conventions (`module/CONVENTIONS.md`)

## Output

- `DESIGN.md` in the target module root

## Steps

1. Identify bounded contexts, aggregates, entities, value objects, and domain events from the PRD.
2. Map each PRD functional requirement to one or more design elements (aggregate operation, event, or query).
3. Define use case interfaces (one method per actor goal, mapped to a single aggregate root transaction when mutating).
4. Sketch the conceptual data model — entities, relationships, key invariants — independent of storage.
5. Keep the design as simple as the requirement allows; no speculative abstraction.
6. Write `DESIGN.md`. At the top, link to the Execution Tracking table in `PRD.md` instead of duplicating it.
7. Run the self-review checklist (cross-cutting checks in SKILL.md apply implicitly). Fix any unchecked item and re-validate only the affected items.
8. After the checklist is fully checked, update the `Execution Tracking` row for phase 2 in `PRD.md`.

## Standard DESIGN.md Structure

1. **Overview & ADR Summary** — key architecture decisions and their rationale (one line each).
2. **Bounded Context** — name, responsibility, neighbors (upstream / downstream).
3. **Aggregates & Entities** — aggregate root, entities, value objects, invariants.
4. **Domain Events** — past-tense names (`UserRegistered`, `OrderShipped`), payload fields, producers, consumers.
5. **Use Cases** — list of UseCase interfaces (one method per actor goal).
6. **Conceptual Data Model** — entities + key relationships (logical, not table-level).
7. **Cross-Domain Integration** — which sibling `{name}-api` modules are called / called by, integration style (sync UseCase, event, query).
8. **Risks & Open Questions** — anything not resolved.

## Self-Review Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

- [ ] Every PRD functional requirement maps to at least one design element.
- [ ] All user scenarios have a corresponding use case or flow.
- [ ] Acceptance criteria map to verifiable design decisions.
- [ ] Each aggregate has exactly one aggregate root; mutating operations name the aggregate.
- [ ] Invariants are expressible as business rules without UI or persistence details.
- [ ] Domain events are named in past tense and carry only facts consumers need.
- [ ] No speculative abstractions; patterns are introduced only when needed.
- [ ] Dependencies on other modules go through their published `{name}-api` only.
- [ ] A future reader can implement from this document alone.

## Gate

All checklist items are checked.

## Loop Control

If any item fails, revise `DESIGN.md` and re-check the affected items. Do not ask the user. If the same root cause blocks two consecutive cycles, loop back to phase 1 Requirements per the escalation rule in SKILL.md.

## Exit Criteria

- `DESIGN.md` exists, follows the Standard DESIGN.md Structure, and links to `PRD.md` Execution Tracking.
- Self-review checklist is fully checked.
- `PRD.md` Execution Tracking row for phase 2 is updated.
