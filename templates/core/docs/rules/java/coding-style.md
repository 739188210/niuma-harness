# Java Coding Style Rules

## Purpose

These rules define Java backend-oriented coding preferences. Apply framework-specific guidance only when the project uses that framework or an equivalent local pattern.

## Project fit

Follow the project's configured Java version, build tool, formatter, package layout, dependency conventions, and local framework patterns.

Prefer existing project conventions. Do not assume a specific Java version, build tool, backend framework, persistence layer, dependency-injection style, cache, or messaging stack.

A new framework, dependency, or architectural pattern is reasonable when it materially improves correctness, maintainability, interoperability, security, or complexity control. State the reason and follow Policy before introducing it.

Prefer small, local changes that fit the current module boundary.

## Formatting and naming

Match the module's existing formatter, indentation, import style, and file organization.

Use standard Java naming unless the local project defines a stronger convention: `PascalCase` types, `camelCase` methods and fields, `SCREAMING_SNAKE_CASE` constants, lowercase packages.

Follow existing suffix conventions such as `DTO`, `VO`, `DO`, `Entity`, `Repository`, `Mapper`, `Service`, or `Controller`; do not invent new naming families.

Avoid unrelated formatting churn in focused changes.

## APIs and types

Keep public methods, interfaces, DTOs, entities, serialized fields, persistence mappings, and cross-module contracts clear and stable.

Do not change public signatures or wire formats unless the task requires it and the compatibility risk is called out.

Prefer precise domain types and generics over loosely typed maps, raw collections, or stringly typed values when the project has a suitable model.

## Null, Optional, and mutability

Make nullability expectations clear at boundaries using the project's existing annotations, validation, or conventions.

Use `Optional<T>` mainly for return values that may be absent. Avoid `Optional` fields, request/response properties, and parameters unless the project already uses them.

Do not call `Optional.get()` without proving presence.

Prefer immutable local values and final dependencies when practical. Use mutable DTOs, entities, or framework-bound objects when required by local conventions.

Avoid unnecessary shared mutable state in services, components, and static fields.

## Language features

Use language features supported by the project's configured Java version and local conventions.

Records, pattern matching, switch expressions, text blocks, sealed types, and similar features are useful when they improve clarity and are supported by the build.

Do not replace established DTO/entity/framework patterns with newer language features unless the project already uses them for that purpose.

## Exceptions, streams, and comments

Use the project's existing exception hierarchy, error-code mechanism, and logging pattern.

Do not swallow exceptions silently or leak stack traces, SQL errors, internal paths, hostnames, dependency details, or raw exception messages to external clients.

Use streams for clear transformations; use loops when branching, mutation, checked exceptions, or error handling would make a stream hard to read.

Add comments for non-obvious business rules, compatibility constraints, permission decisions, concurrency behavior, or security-sensitive logic. Do not restate the code.
