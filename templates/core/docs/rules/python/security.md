# Python Security Rules

## Purpose

These rules define Python security hygiene. They apply to Python code that handles configuration, user input, files, processes, network calls, serialization, automation, and external services.

## Project fit

Use the project's existing configuration, validation, logging, dependency-management, secret-management, and security scanning patterns.

Do not introduce a new security framework, crypto scheme, validation stack, dependency scanner, or secret-management approach for a small local change without a clear reason.

## Secrets and configuration

Do not hardcode passwords, tokens, API keys, private keys, signing secrets, database credentials, private endpoints, provider credentials, or local machine paths in source code, tests, fixtures, logs, generated examples, or committed configuration.

Treat environment variables, `.env` files, local config files, cloud/provider config, database/cache/message settings, and AI/provider config as potentially sensitive.

Do not print resolved secrets in logs, CLI output, diagnostics, exception messages, test snapshots, or generated artifacts.

Use placeholders in examples and fixtures.

## External input and data parsing

Treat CLI arguments, environment variables, request data, JSON/YAML/TOML/CSV/XML, files, archives, queues, webhooks, notebooks, model output, and subprocess output as untrusted until parsed and validated.

Validate IDs, enum/status values, file names, file sizes, paths, URLs, pagination limits, date ranges, sort fields, and batch sizes when relevant.

Prefer safe parsers and explicit schema or shape checks at trust boundaries. Use the project's existing validation approach.

Avoid unsafe deserialization of untrusted data, including pickle, marshal, dynamic object loading, unsafe YAML loaders, or imports/classes selected by external input.

## Files, paths, and archives

Reject path traversal, absolute-path injection, unsafe symlink assumptions, and unsafe path normalization from external input.

Do not use user-provided file names directly as storage paths.

Validate file type, size, extension, and content expectations before processing uploads, imports, generated files, or archives.

When extracting archives, guard against path traversal, overwrites, excessive size, and unexpected file types.

## Processes, dynamic execution, and imports

Avoid shell command construction from user input. Prefer APIs that pass executable and arguments separately.

Do not pass untrusted strings to `eval`, `exec`, dynamic imports, template engines, query languages, shell commands, or code-generation paths.

If dynamic loading is required, constrain it with allowlists and project-owned registries.

Do not execute generated scripts, notebooks, model output, downloaded files, or user-provided plugins unless the task explicitly requires that trust model and Policy allows it.

## Network and external services

Validate callback URLs, redirect URLs, webhooks, provider endpoints, download URLs, and user-controlled outbound destinations.

Do not send secrets, credentials, tokens, private files, or unnecessary personal data to third-party services.

Apply timeouts, retries, and error handling according to the project's network/client pattern.

## Logging, errors, and dependencies

Do not log passwords, tokens, authorization headers, cookies, private keys, verification codes, identity documents, sensitive payloads, raw provider responses, or local private paths.

External-facing errors must not expose stack traces, SQL errors, internal file paths, hostnames, dependency details, raw exception messages, or environment values.

Use the project's dependency management and approved package indexes or mirrors.

A new dependency is reasonable when it materially improves correctness, security, interoperability, or maintainability. Review transitive dependencies for risky additions when changing security-sensitive libraries.
