# Java Security Rules

## Purpose

These rules define Java backend-oriented security hygiene. Apply framework-specific guidance only when the project uses that framework or an equivalent local pattern.

## Project fit

Use the project's existing authentication, authorization, validation, persistence, serialization, logging, dependency-management, and secret-management patterns.

Do not introduce a new security framework, crypto scheme, validation stack, dependency scanner, or secret-management approach for a small local change without a clear reason.

## Secrets and configuration

Do not hardcode passwords, tokens, API keys, private keys, signing secrets, database credentials, private endpoints, or provider credentials in source code, tests, fixtures, logs, generated examples, or committed configuration.

Treat deployment config, environment variables, local config files, service discovery config, database/cache/MQ settings, OAuth config, cloud provider config, and AI/provider config as potentially sensitive.

Do not print resolved secrets in logs, startup banners, health endpoints, diagnostics, or exception messages.

## Authentication and authorization

Use the project's established authentication, authorization, session, token, OAuth, or SSO infrastructure.

Do not implement custom password hashing, token signing, session management, or crypto unless the task explicitly requires security design and review.

Server-side checks are required for sensitive actions and data. Do not rely on frontend visibility, disabled controls, hidden routes, or client-provided roles as authorization.

Code that reads or mutates user-owned, tenant-owned, organization-owned, or role-restricted data must preserve the relevant permission boundary.

## Input, deserialization, and output

Validate external input at system boundaries and re-check critical business invariants in service/application code.

Avoid unsafe deserialization of untrusted data, including polymorphic deserialization, class-name binding, reflection-based loading, and type resolution from external input.

Validate IDs, enum/status values, pagination limits, date ranges, file names, file sizes, upload types, callback URLs, redirect URLs, sort fields, and batch sizes when relevant.

Treat rich text, HTML fragments, Markdown, file names, and user display names as untrusted. Sanitize or escape them according to the consumer contract before storing or returning them.

## SQL, query, and expression injection

Do not concatenate user input into SQL, JPQL, HQL, native queries, expression languages, template expressions, search DSL, or filter strings.

Use the project's parameter binding, query builder, ORM, mapper, repository, or prepared-statement pattern.

Dynamic column names, sort fields, table names, raw SQL fragments, expressions, and filter operators must be allowlisted.

Escape or safely handle search keywords used in `LIKE`, regex, full-text, or search-engine queries according to the project pattern.

## Files, processes, and external calls

Reject path traversal, absolute-path injection, and unsafe path normalization from external input.

Do not use user-provided file names directly as storage paths.

Validate file type, size, extension, and content expectations before processing uploads or imports.

For downloads, verify permission before returning a URL, stream, or path.

Avoid shell command construction from user input. Prefer APIs that separate executable and arguments.

Validate callback URLs, redirect URLs, webhooks, provider endpoints, and user-controlled outbound destinations.

Do not send secrets or unnecessary personal data to third-party services.

## Logging, errors, and dependencies

Do not log passwords, tokens, authorization headers, cookies, private keys, verification codes, identity documents, sensitive payloads, or raw provider responses.

External API errors must not expose stack traces, SQL errors, internal file paths, bean names, hostnames, dependency details, class names, or raw exception messages.

Use the project's dependency management, BOM, lockfile, plugin management, and approved repositories.

A new dependency is reasonable when it materially improves correctness, security, interoperability, or maintainability. Review transitive dependencies for risky additions when changing security-sensitive libraries.
