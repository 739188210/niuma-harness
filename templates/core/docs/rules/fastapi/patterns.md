# FastAPI Pattern Rules

## Purpose

These rules define FastAPI-specific engineering preferences. They apply only to FastAPI projects. If the project does not use FastAPI, do not apply this rule set.

## Project fit

Follow the project's existing app construction, router layout, dependency style, schema/model approach, async conventions, middleware, lifecycle hooks, and test setup.

Prefer existing project conventions. Do not assume a specific folder layout, `create_app()` factory, database library, session type, auth library, schema library version, or service/repository pattern.

A new dependency, framework extension, or architectural pattern is reasonable when it materially improves correctness, maintainability, security, interoperability, or complexity control. State the reason and follow Policy before introducing it.

## App and router structure

Keep route handlers focused on HTTP concerns: request parsing, dependency wiring, response status, response model, and error mapping.

Move reusable business logic out of route handlers when it is shared, complex, or independently testable.

Do not introduce service, CRUD, repository, or dependency layers only for symmetry. Use them when the project already does or when the task clearly benefits from the boundary.

Register routers, middleware, exception handlers, and startup/lifespan behavior using the project's existing app construction pattern.

## Dependencies and request context

Use FastAPI dependencies for request-scoped concerns such as authentication, authorization, database/session access, tenant/user context, feature flags, and shared clients when the project uses that pattern.

Override or compose existing dependencies rather than duplicating request setup logic.

Keep dependency side effects explicit. Avoid hidden global mutation during import.

## Async boundaries

Match the project's async/sync style.

Do not call blocking I/O directly from async route handlers unless the project already isolates it safely or the call is trivial and accepted by local convention.

Use the project's established pattern for database sessions, transactions, external clients, background tasks, and cleanup.

## Schemas and responses

Use the project's existing schema/model approach for request bodies, query models, response models, and serialization.

Set `response_model` or equivalent response validation where the project uses it or where it prevents accidental data exposure.

Keep API response shapes stable unless the task explicitly changes the contract.

Map validation, domain, permission, and not-found errors to deliberate HTTP status codes and response shapes.

## Lifespan and shared resources

Use the project's existing lifespan, startup/shutdown, or application-state pattern for shared clients, pools, caches, schedulers, and other resources that need cleanup.

Do not create long-lived clients, sessions, pools, or background workers at import time unless that is the project's intentional pattern.

Make cleanup behavior explicit for resources introduced by the change.
