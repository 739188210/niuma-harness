# Review Process

Use this playbook when reviewing changed work.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process.md` for routing rules and this file for review execution.

## Goal

Identify blocking issues before work is considered ready, without turning review into unrelated redesign.

## Required artifact/checklist

Before reporting completion, make sure the task record or final response includes:

- Review scope.
- Intended task goal compared with actual changes.
- Findings grouped by severity.
- Blocking vs non-blocking status.
- Verification evidence reviewed or requested.

## Steps

1. Load Context: read `docs/index.md`, `docs/project-context.md`, and the changed files or diff.
2. Check Policy: use `docs/policy/action-boundary.md` before recommending risky or scope-expanding actions.
3. Confirm the intended task goal and compare it with the actual changes.
4. Review correctness, security, maintainability, test coverage, and verification evidence.
5. Apply relevant engineering standards from `docs/rules/` when rule files are installed.
6. Classify findings by severity.
7. Request fixes for blocking findings before reporting the work ready.
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

## Outputs

- Review scope.
- Findings grouped by severity.
- Blocking issues that must be resolved.
- Verification evidence reviewed or requested.
- Follow-up items and remaining risk.
