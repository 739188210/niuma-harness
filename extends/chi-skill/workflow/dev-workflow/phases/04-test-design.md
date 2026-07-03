# Phase 4: Test Design

## Goal

Define how the feature will be verified, including test layers, test data, and acceptance mapping.

## Input

- Confirmed `PRD.md`
- Approved `DESIGN.md`
- Completed technical design (`{name}-api`, `{name}-spec`, DB)

## Output

- `TEST.md` in the target module root
- Test data plan or fixture design

## Test Layers (Jereh stack)

| Layer | Where | Tools |
|---|---|---|
| Unit | `{name}-domain/src/test/java` | JUnit 5 + AssertJ + Mockito |
| Persistence | `{name}-domain/src/test/java` | Testcontainers (PostgreSQL) + Flyway |
| Domain integration | `{name}-domain/src/test/java` | Spring Boot Test slice + Testcontainers |
| Controller integration | `{name}-controller/src/test/java` | `@WebMvcTest` / `@SpringBootTest` |
| OpenAPI / GraphQL contract | `{name}-controller/src/test/java` | Generated server stub vs. example request/response |
| Client compile | `{name}-client/` | `./gradlew :module:{name}:{name}-client:build` (Java) + `pnpm --filter @jereh/{name}-client type-check` |
| UI unit | `{name}-ui/` | Vitest + Vue Test Utils |
| E2E | `server/{name}-center/{name}-center-web/` | Playwright |

## Steps

1. Select the test layers required for this feature (most module work touches Unit + Persistence + Controller integration + Contract; UI/E2E only when UI changes).
2. Map every DESIGN scenario and every PRD acceptance criterion to at least one test, named `{Layer}: {scenario}`.
3. Define test data strategy:
   - **Fixtures / object mothers** for in-memory test data builders.
   - **Testcontainers** for PostgreSQL-backed tests; one container per test class group; tear-down resets.
   - **Cross-domain calls** mock the sibling `{name}-api`; do not depend on another domain's `{name}-domain` internals.
4. State the run command for each layer (see Test Layers table; expand with module path).
5. State coverage expectation per layer (e.g. domain service ≥ 80% branch; controller integration covers every spec operation including error responses). Do **not** invent a global percentage if the project has not set one — declare the per-layer target instead.
6. Write `TEST.md`. At the top, link to the Execution Tracking table in `PRD.md` instead of duplicating it.
7. Run the self-review checklist. Fix any unchecked item and re-validate only the affected items.
8. After the checklist is fully checked, update the `Execution Tracking` row for phase 4 in `PRD.md`.

## Standard TEST.md Structure

1. **Scope** — feature and layers under test.
2. **Scenario → Test Mapping** — table: DESIGN scenario / PRD acceptance → test class / method, layer.
3. **Test Data Strategy** — fixtures, object mothers, Testcontainers usage, reset rules.
4. **Run Commands** — gradle / pnpm commands per layer.
5. **Coverage Targets** — per-layer expectations.
6. **Notes / Deviations** — any implementation choice that diverges from DESIGN, with rationale.

## Self-Review Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

- [ ] Selected layers cover every PRD acceptance criterion.
- [ ] Every DESIGN scenario maps to at least one test.
- [ ] Error branches and edge cases each have a test.
- [ ] Persistence tests use Testcontainers (or equivalent isolated DB), not the shared dev DB.
- [ ] Cross-domain integration tests mock or use sibling `{name}-api` only.
- [ ] Generated clients (Java + TypeScript) are compiled / type-checked as part of the plan.
- [ ] Test data is repeatable and independent; no order-dependent assumptions.
- [ ] Per-layer run command is stated and reproducible.

## Gate

All checklist items are checked.

## Loop Control

If any item fails, revise `TEST.md` and re-check the affected items. If the same root cause blocks two consecutive cycles, loop back to phase 3 Technical Design or phase 2 Product Design per the escalation rule in SKILL.md.

## Exit Criteria

- `TEST.md` exists, follows the Standard TEST.md Structure, and links to `PRD.md` Execution Tracking.
- Test data plan is documented.
- Self-review checklist is fully checked.
- `PRD.md` Execution Tracking row for phase 4 is updated.
