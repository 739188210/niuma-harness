# TypeScript Security Rules

## Purpose

These rules define TypeScript and JavaScript security hygiene. They focus on runtime boundaries, unsafe dynamic behavior, secrets, and sensitive data handling.

## Secrets and configuration

Do not hardcode API keys, tokens, passwords, private URLs, credentials, or signing secrets in source code, tests, fixtures, logs, screenshots, or generated examples.

Treat environment variables as runtime input. Validate required values at the boundary before use, and avoid logging raw configuration.

Use the project's existing configuration pattern. Do not introduce a new config system only for a small local change.

## External input

Treat external values as `unknown` until validated or narrowed.

This includes JSON, API responses, request bodies, query strings, CLI args, environment variables, local storage, files, messages, webhooks, and data from other processes.

Do not trust TypeScript types alone for data that arrives at runtime.

## Dynamic execution

Avoid `eval`, `new Function`, string-based timers, dynamic imports from untrusted input, and command construction from unsanitized values.

If dynamic behavior is required, keep the allowed set explicit and validate against it.

## Object and key handling

Be careful when assigning untrusted keys into objects.

Avoid prototype-pollution-prone patterns such as blindly merging untrusted input into plain objects, configs, or defaults.

Prefer explicit field picking, schema validation, allowlists, or objects without prototypes when appropriate.

## Files, paths, processes, and network calls

Validate untrusted input before using it in filesystem paths, shell commands, process arguments, URLs, redirects, or network requests.

Prefer APIs that separate arguments from shell parsing. Avoid building shell command strings from user input.

For URLs and redirects, validate protocol, host, path, and destination against the task's trust boundary.

## Errors and logging

Do not leak secrets, tokens, credentials, session data, private payloads, or excessive user data in errors, logs, telemetry, test snapshots, or client-visible responses.

Preserve enough error context for debugging, but redact sensitive values.
