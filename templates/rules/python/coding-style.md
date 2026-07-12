# Python Coding Style Rules

## Purpose

These rules define Python engineering preferences. They apply to Python libraries, CLIs, scripts, backends, automation, data processing, and test utilities.

## Project fit

Follow the project's configured Python version, package manager, formatter, linter, type checker, test framework, and package layout.

Prefer existing project conventions. Do not assume a specific Python framework, package manager, formatter, linter, type checker, test framework, validation library, or dependency stack.

A new dependency, framework, or tool is reasonable when it materially improves correctness, maintainability, security, interoperability, or complexity control. State the reason and follow Policy before introducing it.

Prefer small, local changes that fit the current package or module boundary.

## Formatting and imports

Use the project's existing formatter, linter, import sorter, and naming conventions.

Do not introduce formatting churn unrelated to the task.

Keep imports explicit and remove unused imports.

Avoid wildcard imports except in files where the project intentionally exposes a public package surface.

## Type hints

Use type hints for public APIs, shared helpers, complex data structures, and values crossing module or trust boundaries.

Let obvious local variables remain inferred.

Avoid `Any` when a narrower type is practical. Use `object`, `Mapping`, `Sequence`, `Protocol`, `TypedDict`, or type variables when they better express the contract.

Keep annotations aligned with runtime behavior. Do not add decorative type hints that hide uncertainty.

## `None`, defaults, and mutability

Make `None` handling explicit when a value can be absent.

Avoid mutable default arguments such as `[]`, `{}`, or `set()`.

Prefer immutable data or copies when exposing internal collections to callers.

Use mutable models, dictionaries, or objects when required by the project framework, serialization, or local convention.

## Data shapes and protocols

Use the project's existing approach for structured data: dictionaries, dataclasses, named tuples, `TypedDict`, Pydantic models, attrs, or framework-specific models.

`dataclass`, `NamedTuple`, `TypedDict`, and `Protocol` are useful when they clarify data shape or behavior without adding unnecessary abstraction.

Do not introduce repository protocols, DTO families, validation models, or package structures unless the project already uses them or the task clearly needs them.

## Resources and iteration

Use context managers for files, locks, network clients, database sessions, temporary directories, and other resources that need cleanup.

Use generators or iterators when streaming or lazy evaluation improves memory use or clarity.

Avoid hidden global state and import-time side effects unless the project has an intentional pattern for them.

## Exceptions and logging

Raise specific exceptions with useful context.

Do not swallow exceptions silently.

Avoid broad `except Exception` unless at a boundary where errors are logged, translated, retried, or intentionally contained.

Use the project's logging pattern instead of `print()` in production code.

Do not log secrets, tokens, credentials, sensitive payloads, or excessive user data.

## Docstrings and comments

Use docstrings for public modules, classes, functions, and non-obvious behavior when the project style expects them.

Add comments for non-obvious business rules, compatibility constraints, security-sensitive behavior, or surprising implementation choices.

Do not add comments that merely restate the code.
