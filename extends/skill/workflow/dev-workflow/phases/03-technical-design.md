# Phase 3: Technical Design

## Goal

Produce the API contract, machine-readable spec, and database migrations together as one coherent technical design.

## Input

- `PRD.md`
- `DESIGN.md`

## Output

- `{name}-api/src/main/java/com/jereh/{name}/api/` (DTOs, UseCase interfaces, events)
- `{name}-spec/{name}.yaml` (OpenAPI)
- `{name}-spec/{name}.graphqls` and `queries/` (GraphQL, if needed)
- `{name}-domain/src/main/resources/migration/{name}/V{version}__*.sql`
- `{name}-domain/src/main/resources/mybatis-generator.xml`

> Module structure conventions (paths, package names, IoT subtree etc.) come from `module/CONVENTIONS.md`. This phase assumes the module skeleton already exists.

## Process

```text
PRD + DESIGN
    │
    ▼
3.1 API Contract → {name}-api (no persistence/controller deps)
    │ fail → redo 3.1
    ▼ pass
3.2 Spec → {name}-spec (codegen succeeds)
    │ fail → redo 3.2
    ▼ pass
3.3 Database → Flyway + MBG (generated POJOs compile)
    │ fail → redo 3.3
    ▼ pass
Self-Review Checklist → update PRD.md Execution Tracking
```

## Steps

1. **3.1 API Contract** — create or update `{name}-api`:
   - DTOs in `api/dto/` (records; no behavior).
   - UseCase interfaces in `api/service/` (one method per actor goal; commands mutate exactly one aggregate root).
   - Domain events in `api/event/` (past-tense names, versioned payload).
2. **3.2 Spec** — create or update `{name}-spec`:
   - **OpenAPI** (`{name}.yaml`) covers writes and single-table CRUD; every UseCase method that exposes externally maps to an operation.
   - **GraphQL** (`{name}.graphqls` + `queries/`) covers reads and cross-table joins.
   - Define a single error model (status code → error code → message). Idempotency keys are declared on every non-safe operation that may retry.
   - Run codegen and confirm controller stub and client SDK both generate. No hand-edits to generated files.
3. **3.3 Database** — derive tables, columns, indexes, constraints from aggregates:
   - Write Flyway migrations under `migration/{name}/V{n}__*.sql`. Migrations are forward-only.
   - Configure `mybatis-generator.xml`; run MBG and verify generated POJOs compile against the migrated schema.
   - Migrations must run before MBG; MBG generates from the live (or test) DB after Flyway has applied.
4. Draw sequence diagrams for the critical flows (happy path, validation failure, downstream unavailability) if the flow is non-trivial.
5. Run the self-review checklist. Fix any unchecked item and re-validate only the affected items.
6. After the checklist is fully checked, update the `Execution Tracking` row for phase 3 in `PRD.md`.

## Self-Review Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

API contract:
- [ ] Every DESIGN use case has a UseCase interface method.
- [ ] Each command mutates exactly one aggregate root.
- [ ] Every DTO field matches the design intent.
- [ ] `{name}-api` has no persistence or controller dependencies.
- [ ] Cross-domain dependencies use sibling `{name}-api` modules only.

Spec:
- [ ] OpenAPI covers writes / single-table CRUD; GraphQL covers reads / joins.
- [ ] Every UseCase method that crosses a process boundary maps to a spec operation.
- [ ] Field types, formats, validation constraints, and required/optional match DTOs.
- [ ] Error model is consistent (status → error code → message).
- [ ] Idempotency strategy declared for every non-safe, retriable operation.
- [ ] Codegen succeeds for controller stubs and client SDK; no hand-edited generated files.

Database:
- [ ] Tables map to DESIGN aggregates/entities; column types, indexes, constraints match.
- [ ] Migrations are forward-only, single-purpose, named `V{n}__{verb}_{noun}.sql`.
- [ ] MBG-generated POJOs compile against migrations.

## Gate

All checklist items are checked.

## Loop Control

If any item fails, revise the technical design outputs and re-check the affected items. If the same root cause blocks two consecutive cycles, loop back to phase 2 Product Design or phase 1 Requirements per the escalation rule in SKILL.md.

## Exit Criteria

- `{name}-api`, `{name}-spec`, Flyway migrations, and MBG config exist.
- Codegen succeeds.
- Self-review checklist is fully checked.
- `PRD.md` Execution Tracking row for phase 3 is updated.
