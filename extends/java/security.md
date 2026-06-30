---
paths:
  - "**/*.java"
  - "**/*.yaml"
  - "**/*.yml"
  - "**/*.xml"
---
# Java Security

This rule extends the common security rules for this repository's Spring Boot backend modules.

## Secrets and Configuration

- Never hardcode passwords, tokens, private keys, API keys, database credentials, or access secrets.
- Sensitive values must come from environment variables, secret managers, or deployment configuration.
- Local secret files must stay out of git.
- Do not print resolved secrets in logs, startup banners, actuator endpoints, or exception messages.
- Treat Nacos, Redis, database, MQ, OSS, AI provider, and OAuth credentials as secrets.

## Authentication and Authorization

- Use the project's established Spring Security/token/OAuth2 infrastructure.
- Do not implement custom password hashing or token crypto.
- Passwords must never use MD5, SHA1, reversible encryption, or plain text storage.
- Service methods that read or mutate user-owned or tenant-owned data must enforce ownership, tenant, role, or data-permission rules.
- Do not rely on frontend menu visibility as authorization.
- Admin, app, internal, and Feign/RPC APIs must have clear trust boundaries.

## Data Permission and Tenant Isolation

- New queries must be reviewed for tenant isolation.
- Data-permission bypass utilities must be rare, documented, and scoped to the smallest possible block.
- Batch exports, reports, search endpoints, and dropdown APIs must also respect tenant and data permissions.
- Cache keys and async jobs must include tenant/user context when the data is tenant-sensitive.

## SQL Injection Prevention

- Do not concatenate user input into SQL.
- Use MyBatis/MyBatis-Plus parameter binding and wrapper APIs.
- Dynamic column names, sort fields, table names, and raw SQL fragments must be whitelisted.
- Search keywords used in `LIKE` queries should be escaped or handled through safe project helpers.
- XML mapper `${}` usage is high risk and must be justified; prefer `#{}`.

## Input Validation

- Validate all external input at controller boundaries.
- Use Jakarta Validation annotations on ReqVOs where practical.
- Validate pagination size upper bounds.
- Validate enum/status values against allowed constants.
- Validate date ranges, IDs, file names, file sizes, upload types, and batch sizes.
- Re-check critical business invariants in service code.

## XSS and Output Safety

- Treat rich text, HTML fragments, Markdown, file names, and user display names as untrusted.
- Sanitize or escape user-controlled HTML before storage or before rendering.
- Do not return raw HTML from backend APIs unless the consumer contract explicitly requires it and sanitization is defined.

## Logging and Error Messages

- Never log passwords, tokens, authorization headers, refresh tokens, private keys, verification codes, or full identity documents.
- Mask phone numbers, emails, IDs, and other personal data where logs are required.
- API errors must not expose stack traces, SQL errors, internal file paths, bean names, hostnames, or dependency details.
- Log detailed diagnostics server-side with correlation IDs where available.

## File and Path Security

- Reject path traversal attempts such as `../` and absolute paths from user input.
- Do not use user-provided file names as storage paths without normalization.
- Validate file content type and extension; extension alone is not enough for sensitive workflows.
- For downloads, verify permission to access the file metadata before returning a URL or stream.

## External Calls

- Use configured clients and timeouts for Feign, HTTP, MQ, and AI/provider calls.
- Validate and constrain callback URLs and redirect URLs.
- Do not send secrets or unnecessary personal data to third-party services.
- Handle retries carefully to avoid duplicate writes.

## Dependency Security

- Use the repository's BOM and dependency management.
- Avoid adding new dependencies for small utilities.
- Review transitive dependencies for risky additions.
- Run dependency audit commands when security-sensitive dependencies change, such as `mvn dependency:tree` or the project's configured scanner.
