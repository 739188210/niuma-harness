# TypeScript Testing Rules

## Purpose

These rules define TypeScript and JavaScript verification preferences. They supplement Observation evidence and focus on type safety, runtime behavior, async paths, and module/build risks.

## Minimum evidence by change type

| Change type | Minimum evidence |
|---|---|
| Type-only change | Run the project's typecheck or focused compile check when available. |
| Shared utility, parser, formatter, mapper, hook, composable, or runtime logic change | Add or update a focused automated test for caller-visible behavior. |
| Async flow, promise handling, retry, timeout, cancellation, or error mapping change | Verify both success and failure paths. |
| Public API, exported type, package entry, or shared model change | Verify affected callers, compatibility, or compile-time usage. |
| Module format, import/export, path alias, tsconfig, bundler, or package config change | Run the relevant typecheck, build, or focused module-resolution check. |
| JavaScript file with JSDoc or type-migration change | Run available lint/typecheck/build checks that cover the file. |
| Test-only change | Run the changed test or the smallest relevant test group. |

## Type checks are not behavior tests

Passing TypeScript checks is not enough for runtime logic changes.

When a change affects behavior, data transformation, branching, async flow, or error handling, prefer an executable test that would fail on the broken behavior.

## Runtime boundaries

For code that parses or trusts external data, test representative invalid input as well as valid input when practical.

This includes JSON, API responses, request bodies, CLI args, environment variables, storage, and messages from other processes.

## Type-level coverage

For type utilities, exported generic helpers, or public type contracts, use the project's existing type-test approach when one exists.

Do not introduce a new type-testing framework only for a small local type change unless the project direction supports it.

## Browser-facing TypeScript

If the project also selected the `web` rule set, apply `web/testing.md` for browser-rendered UI, route, responsive, or interaction changes.

If it did not, still verify browser-facing behavior according to the project's available checks and Observation requirements.

## Test shape

Prefer tests that assert observable behavior over implementation details.

Avoid tests that only lock the current type spelling, private helper names, or incidental object shape unless that shape is the public contract.

Keep fixtures small and typed. Avoid large opaque fixtures when a minimal representative input proves the behavior.
