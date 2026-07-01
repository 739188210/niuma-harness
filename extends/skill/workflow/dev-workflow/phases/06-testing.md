# Phase 6: Testing

## Goal

Verify the implementation with unit, persistence, integration, contract, and (when relevant) UI / E2E tests.

## Input

- Implemented code from phase 5
- `TEST.md`

## Output

- `{name}-domain/src/test/java/` — unit + persistence + domain integration tests
- `{name}-controller/src/test/java/` — controller integration + OpenAPI/GraphQL contract tests
- `{name}-ui/` — Vitest unit tests (when UI changed)
- `server/{name}-center/{name}-center-web/` — Playwright E2E (when end-to-end flow changed)

## Process

```text
Code from phase 5
    │
    ▼
6.1 Backend unit + persistence (domain)
    │ fail → fix code/tests
    ▼ pass — 6.1 gate locked
6.2 Backend integration + contract (controller)
    │ fail → fix code/tests
    ▼ pass — 6.2 gate locked
6.3 UI + E2E (only if frontend changed)
    │ fail → fix code/tests
    ▼ pass — 6.3 gate locked
Self-Review Checklist → update PRD.md Execution Tracking
```

## Steps

1. **6.1 Backend unit + persistence**
   - Add tests for domain services, mappers, utilities, value objects.
   - Add persistence tests (Testcontainers PostgreSQL) for repositories and complex MyBatis Dynamic SQL queries.
   - Run `./gradlew :module:{name}:{name}-domain:test`. Fix until green. Lock 6.1.
2. **6.2 Backend integration + contract**
   - Add controller integration tests covering every spec operation, status code, error response.
   - Add OpenAPI / GraphQL contract tests against example payloads.
   - Run `./gradlew :module:{name}:{name}-controller:test`. Fix until green. Lock 6.2.
3. **6.3 UI + E2E** (only if `{name}-ui` or `{name}-center-web` changed)
   - Vitest unit tests for components and composables: `pnpm --filter @jereh/{name}-ui test`.
   - Playwright E2E for critical user journeys: `pnpm --filter @jereh/{name}-center-web e2e`.
   - Lock 6.3.
4. Run lint and type checks: `pnpm --filter @jereh/{name}-ui type-check` and equivalent for the consuming pages.
5. Run the self-review checklist. Fix any unchecked item and re-validate only the affected items. Re-running a locked sub-gate is only required when a fix touches that layer.
6. After the checklist is fully checked, update the `Execution Tracking` row for phase 6 in `PRD.md`.

## Coverage Guidance

- Use the per-layer targets stated in `TEST.md`. Do not set a global percentage.
- Critical paths: domain services and persistence — aim for high branch coverage on invariants and error branches.
- Acceptable to have low coverage on: generated code, framework boilerplate, value-object getters.
- If `TEST.md` has not set targets, default to: domain service branch coverage ≥ 80%; controller integration covers every spec operation including documented error responses.

## Self-Review Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

Backend unit + persistence:
- [ ] Every public domain service method has a unit test.
- [ ] Error branches and invariant violations are tested.
- [ ] Persistence tests use Testcontainers, not the shared dev DB.
- [ ] Unit tests are independent, fast, and use fixtures; no shared mutable state.

Backend integration + contract:
- [ ] Every exposed operation has at least one integration test.
- [ ] Response status, payload shape, and error codes are verified.
- [ ] Cross-domain calls and auth paths are tested where applicable.
- [ ] Integration tests use sibling `{name}-api` or generated clients, not internal domain classes.
- [ ] Generated clients (Java + TypeScript) compile and type-check.

UI / E2E (if applicable):
- [ ] Vitest covers component logic and composable behaviour.
- [ ] Playwright covers the critical user journey end-to-end against a running server center.
- [ ] No flaky tests; retries used only for known transient infrastructure flakes.

Stability:
- [ ] All test suites pass; no skipped tests without a tracked reason.
- [ ] No hidden coupling between modules through test fixtures.
- [ ] Coverage meets the targets stated in `TEST.md`.

## Gate

All checklist items are checked. Each completed sub-gate (6.1 / 6.2 / 6.3 where applicable) remains locked (its test suite is still green).

## Loop Control

If any item fails, fix tests or code and re-check the affected items. If the issue is rooted in design or test data, loop back to phase 4, 3, or 2. If the same root cause blocks two consecutive cycles, escalate per the escalation rule in SKILL.md.

## Exit Criteria

- Backend tests exist and pass at every applicable layer (unit, persistence, integration, contract).
- UI / E2E tests exist and pass when the frontend changed.
- Lint and type checks pass.
- Coverage meets `TEST.md` targets.
- Self-review checklist is fully checked.
- `PRD.md` Execution Tracking row for phase 6 is updated.
