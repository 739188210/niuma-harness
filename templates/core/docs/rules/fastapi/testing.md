# FastAPI Testing Rules

## Purpose

These rules define FastAPI-specific verification preferences. They apply only to FastAPI projects. If the project does not use FastAPI, do not apply this rule set.

## Project fit

Use the project's existing FastAPI test client, async test setup, fixtures, dependency overrides, app factory, database/session setup, and documented commands.

Do not introduce a new HTTP client, async test plugin, fixture stack, container setup, or test runner unless the project already uses it or the task clearly needs it.

## Minimum evidence by change type

| Change type | Minimum evidence |
|---|---|
| Route, router, status code, response model, or OpenAPI-visible change | Verify the route returns the intended status, stable response fields, and error shape where relevant. |
| Request body, query, path parameter, header, cookie, or validation change | Verify valid input, invalid input, missing input, and boundary values where relevant. |
| Authentication, authorization, user/tenant context, or protected route change | Verify allowed and denied requests through the same dependency path used by the route. |
| Dependency, app factory, middleware, exception handler, or lifespan change | Verify app startup/request handling and cleanup behavior through the project test setup. |
| Database/session, transaction, external client, cache, background task, or async workflow change | Verify success, failure, rollback/cleanup, and idempotency where relevant. |
| Test-only change | Run the changed test or the smallest relevant FastAPI/API test group. |

## Dependency overrides

Override the exact dependency object used by `Depends`, not a similar helper or lower-level function that bypasses route wiring.

Clear `app.dependency_overrides` or use the project's fixture pattern so overrides do not leak across tests.

Prefer dependency overrides or stable boundary fakes over real external services for focused route tests.

## Client and async behavior

Use the project's established sync or async client pattern.

If the application uses async database sessions, async external clients, lifespan-managed state, or async dependencies, verify behavior with the project's async-capable test setup.

Do not treat a direct function call to a route handler as enough evidence when FastAPI routing, validation, dependency injection, middleware, or response serialization is the risk.

## Coverage focus

Focus coverage on route contracts, validation, auth and permission boundaries, dependency wiring, response filtering, exception mapping, lifespan state, background tasks, and async cleanup.

Do not chase coverage for generated OpenAPI output, trivial router registration, or framework boilerplate unless it carries project-specific behavior.
