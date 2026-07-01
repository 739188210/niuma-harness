# Phase 5: Implementation

## Goal

Implement the feature in backend and frontend code according to the approved spec and tests.

## Input

- `{name}-spec`
- `{name}-api`
- Flyway migrations + MBG config
- `TEST.md`

## Output

- `{name}-domain/` — services, repositories, configuration, mappers
- `{name}-controller/` — REST/GraphQL adapters
- `{name}-ui/` — components and composables
- `{name}-center/{name}-center-web/` — pages (if needed)

> Module structure conventions come from `module/CONVENTIONS.md`. This phase assumes those modules already exist from phase 3.

## Implementation Mode

Pick one, per scope:

- **Default** — implement an end-to-end vertical slice (domain → controller → ui) per use case, compiling after each slice.
- **TDD** — for non-trivial domain logic, follow RED → GREEN → IMPROVE inside `{name}-domain`:
  1. Write a failing unit test in `{name}-domain/src/test/java` for the next behavior.
  2. Write the minimum production code to pass.
  3. Refactor while keeping tests green; re-run the unit suite.
  4. Commit the increment; move to the next behavior.
  TDD is optional but recommended when the domain has invariants or state transitions that are easy to break silently.

Either mode satisfies this phase's gate; the choice is recorded in `TEST.md` Notes if it affects testing.

## Steps

1. Implement domain services in `{name}-domain/service/`, implementing UseCase interfaces.
2. Add repository interfaces in `{name}-domain/repository/` (single-table CRUD via Spring Data JDBC; complex queries via MyBatis Dynamic SQL inside the service).
3. Add MapStruct mappers in `{name}-domain/util/` (no hand-rolled getter/setter mapping).
4. Implement REST controllers (`implements DefaultApi` generated from OpenAPI) and GraphQL data fetchers in `{name}-controller/`.
5. Implement UI components and composables in `{name}-ui/` consuming `{name}-client` (no hand-written `fetch`, no hardcoded URLs).
6. Build pages in `{name}-center/{name}-center-web/` consuming `{name}-ui`.
7. Run compilation after each logical increment (`./gradlew :module:{name}:{layer}:compileJava` or `pnpm --filter @jereh/{name}-ui type-check`).
8. Run the self-review checklist. Fix any unchecked item and re-validate only the affected items.
9. After the checklist is fully checked, update the `Execution Tracking` row for phase 5 in `PRD.md`.

## Self-Review Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

Correctness:
- [ ] All UseCase interfaces are implemented.
- [ ] Spec operations are wired to domain services.
- [ ] UI flows match PRD scenarios.
- [ ] Every PRD acceptance criterion has a corresponding implementation path.

Boundaries & conventions:
- [ ] Dependency direction respected (`controller → domain → api`; `ui → client`).
- [ ] No direct imports from sibling `{name}-domain` or `{name}-controller` in other modules; cross-domain calls use `{name}-api` UseCase only.
- [ ] MapStruct used for entity/DTO conversion; no hand-rolled mappers.
- [ ] No business logic in controller or UI.
- [ ] Single-table CRUD goes through Spring Data JDBC `CrudRepository`; complex queries use MyBatis Dynamic SQL inside the service.

Safety & quality:
- [ ] No hardcoded secrets, tokens, or internal URLs.
- [ ] No SQL string concatenation; queries are parameterized or generated.
- [ ] Domain exceptions are mapped to the agreed error model.
- [ ] All `@Cacheable` / `@CacheEvict` placements are on domain service methods, not controllers.
- [ ] The project builds with no errors.

## Gate

All checklist items are checked.

## Loop Control

If any item fails, fix the code and re-check the affected items. If a design flaw is discovered, loop back to phase 2 or 3. If the same root cause blocks two consecutive cycles, escalate per the escalation rule in SKILL.md.

## Exit Criteria

- Backend and frontend code compile.
- UseCase interfaces are implemented.
- Controllers and UI follow conventions.
- Self-review checklist is fully checked.
- `PRD.md` Execution Tracking row for phase 5 is updated.
