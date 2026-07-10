# Python Testing Rules

## Purpose

These rules define Python verification preferences. They supplement Observation evidence and focus on runtime behavior, import safety, boundary inputs, packaging, and compatibility with the project's supported Python versions.

## Project fit

Use the project's existing test framework, test layout, fixtures, naming style, dependency isolation, and documented commands.

Do not introduce pytest, unittest helpers, tox, nox, coverage, mypy, pyright, ruff, or a new test runner unless the project already uses it or the task clearly needs it.

## Minimum evidence by change type

| Change type | Minimum evidence |
|---|---|
| Public function, class, module, CLI, or package API change | Verify caller-visible behavior and compatibility with existing imports or entry points. |
| Pure function, parser, mapper, serializer, validator, or utility change | Add or update focused tests for normal, edge, and invalid inputs. |
| Type hint, dataclass, `TypedDict`, `Protocol`, or structured data change | Run the project's type check or the smallest runtime test that proves the changed contract. |
| File, path, archive, subprocess, environment, network, or external-service boundary change | Verify valid input, invalid input, missing resource, permission/error handling, and cleanup behavior where relevant. |
| Async, generator, iterator, context manager, retry, cache, or concurrency change | Verify success, failure, cancellation/cleanup, idempotency, and resource release where relevant. |
| CLI or script change | Verify arguments, defaults, exit codes, stdout/stderr, config/env behavior, and failure messages where relevant. |
| Packaging, dependency, import path, entry point, Python version, or build config change | Run the project's install/build/import/type/test command that proves the changed risk. |
| Test-only change | Run the changed test or the smallest relevant test group. |

## Test shape

Prefer tests that prove observable behavior rather than implementation details.

Keep fixtures small and explicit.

Use temporary files, temporary directories, fake environment variables, and local test doubles instead of real user paths, real secrets, or live external services.

Mock external systems at stable boundaries for focused tests. Use integration tests when import behavior, packaging, framework behavior, filesystem behavior, subprocess behavior, or real client configuration is the risk.

Include negative tests for invalid input, missing values, malformed data, permission errors, boundary values, duplicate data, timeout/retry behavior, and error mapping when those risks changed.

## Runtime and import checks

Python changes can fail at import time. For changed packages, modules, scripts, or entry points, verify that the relevant import or command still starts successfully.

When a change depends on a specific Python version, dependency version, optional extra, or platform behavior, run the check in the closest available project-supported environment and state any unverified combinations.

Do not claim compatibility with Python versions, optional dependencies, operating systems, or package managers that were not checked.

## Type checks and linters

Use the project's existing type checker and linter when they are part of the normal verification path.

Type checks are useful evidence for annotation-heavy changes, public contracts, generic code, protocols, and cross-module data shapes.

Linters are useful evidence for import order, unused code, unreachable code, broad exceptions, and style regressions.

Do not treat type-check or lint success as a substitute for runtime behavior when runtime behavior changed.

## Coverage focus

Focus coverage on behavior, boundary parsing, error paths, serialization, filesystem/process/network interactions, async/concurrency behavior, resource cleanup, and public API compatibility.

Do not chase coverage for trivial constants, plain data containers, generated code, or framework boilerplate unless they carry project-specific behavior.
