# TypeScript Coding Style Rules

## Purpose

These rules define TypeScript and JavaScript engineering preferences. They favor clear type boundaries, safe narrowing, and existing project patterns without forcing a framework or architecture style.

## Type boundaries

Make exported APIs, shared utilities, public class methods, component props, and cross-module data shapes explicit when types improve readability or safety.

Let TypeScript infer obvious local variables.

Prefer named types for repeated object shapes or important domain concepts. Avoid naming every one-off inline object shape only for formality.

```typescript
interface User {
  id: string
  email: string
}

export function formatUser(user: User): string {
  return user.email
}
```

## `unknown`, `any`, and narrowing

Avoid `any` in application code.

Use `unknown` for external, dynamic, or untrusted values, then narrow before reading properties.

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}
```

Use `any` only when the project already has that boundary, when interoperating with untyped libraries, or when a narrower type would be misleading. Keep it local and explain the reason if it is not obvious.

## Types, interfaces, and enums

Prefer `interface` for object shapes intended to be extended or implemented.

Prefer `type` for unions, intersections, tuples, mapped types, conditional types, and utility-type composition.

Prefer string literal unions over `enum` unless an enum is required for interoperability, runtime representation, or existing project convention.

## Runtime boundaries

TypeScript types do not validate runtime data.

Validate or narrow data that crosses trust or format boundaries, such as JSON, API responses, request bodies, CLI args, environment variables, storage, and messages from other processes.

Use the project's existing validation approach. Do not introduce a schema library only because a small local guard is enough. A validation dependency is reasonable when it matches project direction or materially improves correctness.

## Async and errors

Handle asynchronous failures intentionally.

Do not swallow errors silently. Preserve useful context when rethrowing, logging, or converting errors for callers.

Avoid assuming caught errors are `Error` objects; narrow `unknown` first.

## JavaScript files

In `.js` and `.jsx` files, use JSDoc when it improves clarity, editor support, or migration safety.

Keep JSDoc aligned with runtime behavior. Do not add stale or decorative type comments.

## Existing patterns

Follow existing module style, import style, formatting, lint rules, test style, and framework conventions.

Do not introduce repository patterns, API response wrappers, hook abstractions, state-management layers, or folder structures unless the project already uses them or the task clearly needs them.

Prefer small, typed, local changes over broad abstraction.
