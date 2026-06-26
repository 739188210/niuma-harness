---
paths:
  - "**/*.java"
---
# Java Backend Patterns

This rule is tailored for this repository's Spring Boot and MyBatis-Plus backend modules.

## Module Boundaries

- Keep shared API constants, enums, DTOs, and client contracts in the module API package when the project defines one.
- Keep runtime implementation in the server module.
- Do not make controllers, services, or mappers depend on unrelated sibling modules unless there is an established API or Feign boundary.
- Prefer existing framework helpers, base classes, converters, and mapper patterns over new abstractions.

## Layering

### Controller

- Controllers handle HTTP concerns: route mapping, permission annotations, request validation, current-user context, and response shaping.
- Controllers should not contain business rules, SQL construction, transaction orchestration, or data-permission workarounds.
- Admin and app/mobile APIs should follow the module's existing package split, commonly `controller/admin` and `controller/app`.
- Request bodies and query params should use validated ReqVO classes instead of raw maps.

### Service

- Services own business rules, transaction boundaries, permission-sensitive decisions, and cross-entity workflows.
- Keep service methods focused and named after business behavior.
- Use `@Transactional` on methods that change multiple records or must be atomic.
- Avoid calling another method in the same class when relying on Spring AOP behavior such as transactions.
- Do not return persistence DOs directly from external-facing controller APIs unless the local module already explicitly does so.

### Mapper / DAL

- Mappers own database access only.
- Prefer MyBatis-Plus wrappers and project mapper helpers where available.
- Do not place business decisions in SQL XML or mapper default methods unless they are purely query predicates.
- Native SQL must be parameterized.
- List and page queries must be bounded and deterministic.

## DO / VO / Convert

- DO classes model database rows and should align with table fields, audit fields, logical deletion, and tenant fields.
- ReqVO classes model user input and should carry validation annotations.
- RespVO classes model API output and should not expose internal-only fields by accident.
- Use the project's existing converter style for DO-to-VO and VO-to-DO mapping.
- Keep backend field adaptation in converters or service-level mapping, not scattered through controllers.

## Dependency Injection

- Prefer constructor injection or Lombok `@RequiredArgsConstructor` for new code when it fits the local module.
- If the existing module consistently uses `@Resource`, follow the local convention for consistency unless there is a concrete reason to change.
- Avoid field injection in new shared or heavily tested components.
- Avoid static access to Spring beans.

## Data Permission and Tenant Boundaries

- New business tables must be reviewed for tenant isolation and data permission requirements.
- If a table requires department or user isolation, ensure the SQL fields, DO fields, and data-permission configuration are all present.
- If a table intentionally does not require data permission, document the business reason.
- Do not bypass data permission in service code unless the method has a documented, reviewed reason.

## Validation

- Validate external input at controller boundaries using Jakarta Validation where practical.
- Re-check critical business invariants in service code, especially permissions, ownership, state transitions, and uniqueness.
- Do not trust client-side validation.
- Normalize and validate IDs, enum values, date ranges, pagination parameters, file names, and search keywords.

## API Response

- Use the project's existing response wrapper and error-code mechanism.
- Do not introduce a new generic `ApiResponse` type when the project already has one.
- Keep error messages stable and client-safe.
- Preserve backward compatibility for existing API fields unless a breaking change is explicitly approved.

## Files and Uploads

- Validate file type, size, extension, and storage path before processing.
- Never trust user-provided file names for filesystem paths.
- Use project file/infra APIs when available instead of direct filesystem access.
- Long-running file parsing or upload workflows should expose clear failure states and avoid partial silent success.

## Caching and Redis

- Use centralized Redis key constants when the module has them.
- Key names should be meaningful, namespaced, and stable.
- Set explicit expiration unless the data is intentionally permanent.
- Avoid caching permission-sensitive data without tenant/user scoping.
- Invalidate or refresh caches after writes that change cached data.

## Transaction and Concurrency

- Put transaction boundaries at service methods, not controllers.
- Keep transactions short and avoid network calls inside a database transaction where possible.
- Use optimistic locking, uniqueness constraints, or distributed locks when concurrent writes can create duplicates or inconsistent state.
- Idempotency should be considered for create, upload, callback, retry, and batch operations.
