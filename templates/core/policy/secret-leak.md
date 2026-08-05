# Secret Exposure Response

## Purpose

Define how an agent contains a discovered secret or sensitive value (credential, token, key, password, private key, or private data) without repeating it or expanding its exposure. Detection requires redaction and careful handling; it does not by itself stop unrelated safe task work.

## Trigger

Use this document when the agent observes a secret or sensitive value in source, configuration, env files, docs, git commits or history, logs, tool output, screenshots, task material, or user-provided content.

## Response: redact, contain, continue safely

1. Do not repeat, print, copy, persist, commit, upload, or use the sensitive value.
2. Redact the value from command-output excerpts, task material, final responses, logs, screenshots, fixtures, examples, and generated files created by the agent. For an existing workspace file, classify any redaction or other remediation under `{{HARNESS_DIR}}/docs/policy/action-boundary.md` before modifying it. When a record is necessary, state only its type, location, and exposure scope (local-only / committed / pushed / public).
3. Continue task-scoped local work when it does not depend on the value and cannot expand its exposure.
4. Classify every action concerning the value separately under `{{HARNESS_DIR}}/docs/policy/action-boundary.md`. Rotation, revocation, deletion, history rewrite, remote cleanup, external notification, credential use, and changes to user-owned content are not authorized by this response.
5. If the requested work requires the value or a sensitive external action, record that exact blocker and ask for a safe substitute or scoped approval. Do not stop unrelated safe work merely because the value was observed.
6. Do not treat local redaction as proof that an exposure is resolved; a value may remain in history, logs, artifacts, or remote systems.

## Forbidden

- Copying the value into `agent-work/`, logs, memory, output, screenshots, fixtures, examples, commits, or external services.
- Using the value as a credential or transmitting it to diagnose the task without separate approval and applicable Policy classification.
- Rotating, revoking, deleting, rewriting history, or changing remote resources on the agent's own initiative.
- Treating a leak as resolved solely because the working-tree copy was redacted or removed.

## Difference from normal Recovery

Apply this response first to prevent further exposure. Then, if the remaining task failure or work stream can proceed without the value, use normal Recovery (`{{HARNESS_DIR}}/docs/layers/05-recovery.md`) for that non-secret work. A secret-dependent action remains blocked until it has a safe substitute or the required approval.

## Links

- Action boundaries: `{{HARNESS_DIR}}/docs/policy/action-boundary.md`
- Untrusted content: `{{HARNESS_DIR}}/docs/policy/untrusted-content.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Memory: `{{HARNESS_DIR}}/docs/layers/06-memory.md` (never persist a leaked value; record only its type and location)
