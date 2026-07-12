# FastAPI Security Rules

## Purpose

These rules define FastAPI-specific security hygiene. They apply only to FastAPI projects. If the project does not use FastAPI, do not apply this rule set.

## Project fit

Use the project's existing authentication, authorization, validation, dependency, CORS, middleware, response-model, logging, and secret-management patterns.

Do not introduce a new auth framework, token scheme, CORS package, rate limiter, validation stack, or middleware layer for a small local change without a clear reason.

## Authentication and authorization

Protected routes must use the project's established authentication and authorization dependencies.

Do not rely on client-visible UI state, route naming, OpenAPI tags, hidden fields, or caller-provided roles as authorization.

Code that reads or mutates user-owned, tenant-owned, organization-owned, or role-restricted data must preserve the relevant permission boundary.

If JWTs, API keys, OAuth, sessions, or signed tokens are used, validate them through the project's existing security path rather than adding ad hoc parsing in route handlers.

## Request validation and limits

Validate request bodies, query parameters, path parameters, headers, cookies, uploaded files, callback URLs, redirect URLs, and pagination/sort controls where relevant.

Keep validation close enough to the FastAPI boundary to reject malformed requests before business logic depends on them.

Use request size limits, file size/type checks, rate limits, or abuse controls where the project already supports them or where the changed endpoint materially increases risk.

## CORS, cookies, and headers

Keep CORS origins environment-specific.

Do not combine wildcard CORS origins with credentialed requests.

Use the project's existing cookie, CSRF, session, proxy-header, trusted-host, and security-header patterns.

Do not weaken browser-facing security settings for local convenience without an explicit task requirement and Policy approval.

## Responses and error handling

Use `response_model`, explicit response schemas, or the project's equivalent filtering pattern where it prevents accidental exposure of secrets, internal IDs, permission fields, or internal model state.

External-facing errors must not expose stack traces, SQL errors, internal file paths, hostnames, dependency details, raw exception messages, validation internals beyond the public contract, or environment values.

Map authentication, authorization, validation, not-found, conflict, and rate-limit failures to deliberate HTTP status codes and response shapes.

## Logging and external calls

Do not log passwords, tokens, authorization headers, cookies, API keys, private keys, verification codes, sensitive payloads, raw provider responses, or full request bodies that may contain sensitive data.

Do not send credentials, tokens, private files, or unnecessary personal data to third-party services from route handlers, dependencies, background tasks, or exception paths.

Validate outbound callback URLs, webhooks, provider endpoints, and user-controlled download/upload destinations.
