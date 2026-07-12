# Web Security Rules

## Purpose

These rules define web-specific security hygiene. They supplement common security rules and do not replace Policy boundaries or security review.

## XSS

Do not bypass the framework's default escaping.

Avoid raw HTML rendering such as `innerHTML` or `dangerouslySetInnerHTML`. Use it only when the task requires it and the project already has a vetted sanitizer or trusted-rendering pattern.

Do not build script, style, event-handler attributes, redirects, or URLs from unsanitized input.

## Browser-visible data

Treat browser-delivered code and config as public unless the framework or deployment model proves otherwise.

Do not expose secrets, tokens, private endpoints, session identifiers, internal debug payloads, or sensitive user data in client bundles, HTML, source maps, storage, logs, screenshots, or client-readable environment variables.

## Auth and permissions

Client-side checks improve user experience but are not authorization boundaries.

Do not rely on hidden buttons, disabled controls, route guards, or client-only role checks as the only protection for sensitive actions or data.

## External resources

Be cautious when adding third-party scripts, iframes, analytics, widgets, fonts, images, or CDN assets.

Use existing project-approved providers when possible. Do not send sensitive identifiers to external services unless the task explicitly requires it.

## Headers, cookies, and CSP

Do not weaken existing security headers, cookie flags, auth/session behavior, or Content Security Policy.

Changes to CSP, cookies, auth, sessions, tokens, permissions, or security headers are security-sensitive. Apply Policy before changing them.

Do not cargo-cult header blocks from another project. Match the current deployment and asset model.

## Forms

Do not remove existing CSRF, same-site, validation, or anti-abuse protections.

Client-side validation is not enough for state-changing behavior; preserve the server/API validation path.
