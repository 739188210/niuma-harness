# Review Process

Use this playbook when reviewing changed work.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process.md` for routing rules and this file for review execution.

## Goal

Identify blocking issues before work is considered ready, without turning review into unrelated redesign.

## Steps

1. Load task-relevant context through `docs/layers/01-context.md`; include the changed files or diff.
2. Check Policy: classify the review as read-only reporting before acting. Recommendations may be reported as review findings; re-classify before performing risky, destructive, external, security-sensitive, scope-expanding, or test-changing follow-up actions.
3. Confirm the intended task goal and compare it with the actual changes.
4. Review correctness, security, maintainability, test coverage, and verification evidence.
5. Apply relevant installed engineering standards.
6. Classify findings by severity.
7. Mark work as not ready while blocking findings remain unresolved.
8. Only implement fixes when the user explicitly approved implementation changes; otherwise route fixes through the relevant bugfix, refactor, or feature playbook.
9. Re-run or request focused verification after material fixes.

## Fix boundary

A review reports findings. Fixing findings is a separate action unless the user explicitly asked for review-and-fix.

## Severity levels

- CRITICAL: security vulnerability, data loss risk, destructive behavior, or clearly broken user-facing behavior.
- HIGH: likely bug, missing required validation, unsafe edge case, or important verification gap.
- MEDIUM: maintainability, clarity, or coverage concern that should be considered.
- LOW: minor style, naming, or documentation note.

## Recovery

Use `docs/layers/05-recovery.md` when the diff does not match the stated goal, review evidence is missing, or a fix creates new failures.

## Memory and task notes

For multi-step reviews, keep status, findings, fix decisions, and verification evidence under `agent-work/tasks/<task-name>/`. Move only verified durable lessons through the Memory layer before updating `docs/project-context.md`.

For two-stage review across isolated subagents on large or risky work, see `docs/process/subagent-development.md`.

## Required artifact/checklist

Before reporting completion, include:

- Review scope.
- Intended task goal compared with actual changes.
- Findings grouped by severity.
- Blocking vs non-blocking status.
- Verification evidence reviewed or requested.
- Follow-up items, remaining unknowns, and material risks.
