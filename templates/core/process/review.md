# Review Process

Use this playbook when reviewing changed work.

## Goal

Identify evidence-backed blocking issues without turning review into unrelated redesign.

## Steps

1. Apply the base reading and conditional routing in `{{HARNESS_DIR}}/docs/process/task-triage.md`, then inspect the change, intended goal, and available verification evidence.
2. Treat review as read-only reporting. Re-classify before any implementation, destructive, external, security-sensitive, scope-expanding, or test-changing follow-up.
3. Compare the intended goal with actual changes; review correctness, security, maintainability, coverage, and evidence.
4. Group findings by severity and mark work not ready while blocking findings remain unresolved.
5. Record review scope, findings, evidence reviewed or requested, and remaining unknowns through `{{HARNESS_DIR}}/docs/layers/04-observation.md` in the final response or selected status ledger.

## Fix boundary

A review reports findings. Implementing a fix is a separate action unless the user explicitly asks for review-and-fix; then route it through bugfix, refactor, or feature.

## Severity

- CRITICAL: security vulnerability, data-loss risk, destructive behavior, or clearly broken user-facing behavior.
- HIGH: likely bug, missing required validation, unsafe edge case, or important verification gap.
- MEDIUM: maintainability, clarity, or coverage concern that should be considered.
- LOW: minor style, naming, or documentation note.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when the change conflicts with its goal or review evidence is missing.

## Memory

Route verified durable findings through `{{HARNESS_DIR}}/docs/layers/06-memory.md`.
