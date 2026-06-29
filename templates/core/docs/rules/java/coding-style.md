---
paths:
  - "**/*.java"
---
# Java Coding Style

This rule is tailored for this repository's Java 17, Spring Boot, Maven, MyBatis-Plus, Lombok, and multi-module backend projects.

## Project First

- Follow the nearest project documentation first: root `CLAUDE.md`, `docs/index.md`, module `CLAUDE.md`, module `README.md`, and existing package patterns.
- Do not introduce a competing architecture or naming style when the module already has a convention.
- Prefer small, local changes that fit the existing module boundary.

## Formatting

- Match the module's existing formatter and indentation.
- One public top-level type per file.
- Keep imports explicit and remove unused imports.
- Avoid unrelated formatting churn in files touched for a focused change.
- If Checkstyle, Spotless, or formatter plugins exist in the module, use them as the source of truth.

## Naming

- Classes, interfaces, enums, and annotations: `PascalCase`.
- Methods, fields, parameters, and local variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Packages: lowercase and aligned with the module package root.
- Database-related Java names should match project conventions:
  - Data objects: `XxxDO`
  - Create requests: `XxxCreateReqVO`
  - Update requests: `XxxUpdateReqVO`
  - Page requests: `XxxPageReqVO`
  - Responses: `XxxRespVO` or a more specific existing suffix
  - Mapper: `XxxMapper`
  - Service interface: `XxxService`
  - Service implementation: `XxxServiceImpl`

## Lombok and Data Objects

- Use Lombok consistently with the target module.
- MyBatis-Plus DO classes should follow existing project patterns, commonly:
  - `@TableName`
  - `@TableId` where required
  - `@Data`
  - `@EqualsAndHashCode(callSuper = true)` when extending a base DO
  - `@ToString(callSuper = true)` when extending a base DO
  - `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` when the module uses them
- Business DOs that require tenant isolation should extend the project tenant base DO.
- Do not replace established DO/VO/Lombok patterns with Java records unless the local module already uses records for that purpose.

## Java 17 Features

Use Java 17 features when they improve clarity and do not conflict with local conventions:

- Pattern matching with `instanceof` is acceptable.
- Text blocks are acceptable for readable SQL, JSON, or templates.
- Switch expressions are acceptable for clear enum or status mapping.
- Records are optional for small internal immutable value types, but should not replace project VO/DO patterns by default.
- Sealed classes should be introduced only when they solve a real closed-hierarchy problem.
- Do not use Java 21-only syntax.

## Immutability and Mutability

- Prefer immutable local values and final dependencies.
- Avoid unnecessary shared mutable state in services and components.
- Return defensive copies from public APIs when exposing mutable collections.
- DO/VO classes may remain mutable when required by frameworks, validation, serialization, or MyBatis-Plus.

## Optional Usage

- `Optional<T>` may be used for internal finder methods that naturally may not return a value.
- Do not use `Optional` as a field type or request/response property.
- Do not use `Optional` as a method parameter.
- Never call `get()` without checking presence; prefer `orElseThrow`, `map`, and `flatMap`.
- Follow existing mapper/service return conventions when they use nullable values.

## Error Handling

- Use the project's existing exception and error-code mechanism.
- Do not leak stack traces, SQL errors, internal paths, or raw exception messages to API clients.
- Avoid broad `catch (Exception e)` except at framework boundaries or when wrapping with clear context.
- Log enough context for diagnosis, but do not log secrets, tokens, passwords, or sensitive personal data.
- Prefer explicit validation and domain errors over relying on downstream null pointer or database errors.

## Streams

- Use streams for clear transformations.
- Keep stream pipelines short and readable.
- Avoid side effects inside stream operations.
- Use loops when branching, mutation, or error handling would make a stream hard to read.

## Comments

- Add comments only when they clarify non-obvious business rules, data-permission decisions, compatibility constraints, or security-sensitive behavior.
- Do not add comments that restate the code.
