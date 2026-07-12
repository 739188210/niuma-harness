# Java Backend Pattern Rules

## Purpose

These rules define Java backend-oriented architecture and layering preferences. Apply framework-specific guidance only when the project uses that framework or an equivalent local pattern.

## Project fit

Follow the project's configured Java version, build tool, formatter, package layout, dependency conventions, and local framework patterns.

Prefer existing project conventions. Do not assume a specific Java version, build tool, backend framework, persistence layer, dependency-injection style, cache, or messaging stack.

A new framework, dependency, or architectural pattern is reasonable when it materially improves correctness, maintainability, interoperability, security, or complexity control. State the reason and follow Policy before introducing it.

Prefer small, local changes that fit the current module boundary.

## Module boundaries

Keep cross-module contracts where the project expects them.

Avoid depending on unrelated sibling modules unless there is an established API, client, event, or integration boundary.

Prefer existing framework helpers, base classes, converters, mapper utilities, and shared abstractions before creating new ones.

Do not move types across module boundaries without checking callers and compatibility.

## Layer responsibilities

When the project has API/controller/resource, service/application/domain, and persistence/repository/mapper layers, preserve their responsibilities.

API layers handle transport concerns: routing, request parsing, validation triggers, auth checks, request context, and response shaping.

Service/application layers own business behavior, permissions, state transitions, transactions, idempotency, and cross-entity workflows.

Persistence layers own data access and query predicates. Avoid placing business decisions in SQL, mapper defaults, or repository helpers unless they are purely data-access concerns.

## Data models and mapping

Use the project's existing model categories and names, such as DTO, VO, DO, Entity, Request, Response, Command, Event, or Projection.

Keep external response models from accidentally exposing internal fields.

Keep input models focused on caller input and validation.

Keep persistence models aligned with stored data and framework expectations.

Use the project's existing mapping style. Avoid scattering field adaptation across controllers, services, and persistence code.

## Dependency injection and transactions

Use the project's existing dependency injection and object creation style.

Prefer constructor injection for new shared or heavily tested components when it fits the local framework and convention.

Avoid static access to framework-managed beans or global state unless the project has a reviewed pattern for it.

Put transaction boundaries where the project expects them, usually around service/application operations that must be atomic.

Keep transactions short. Avoid slow network calls, blocking I/O, or long-running computation inside database transactions when practical.

Call out consistency risk when changing write paths, retries, callbacks, batch jobs, async workflows, or concurrent updates.

## Validation, cache, and integrations

Validate external input at the boundary and re-check critical invariants in service/application code when they affect permissions, ownership, state transitions, uniqueness, money, quota, or compliance-sensitive behavior.

When the project uses caching, keep keys stable, namespaced, scoped to permission or tenant boundaries, and invalidated after writes that change cached data.

For async jobs, message handlers, scheduled tasks, retries, and callbacks, make idempotency, failure handling, and partial-success behavior explicit.

Use project file, storage, HTTP, RPC, MQ, or provider clients when available instead of direct low-level access.

For uploads, downloads, imports, exports, and external calls, expose clear failure states and avoid partial silent success.
