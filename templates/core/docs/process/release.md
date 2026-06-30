# Release Process

Use this playbook to prepare or perform a release only when the user explicitly asks for release work.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process/memo.md` for routing rules and this file for release readiness.

## Goal

Confirm release readiness with evidence and avoid irreversible or outward-facing actions without approval.

## Steps

1. Load Context: read `docs/index.md`, `docs/project-context.md`, package metadata, and release-related docs.
2. Check Policy: use `docs/policy/action-boundary.md`; publishing, tagging, pushing, deploying, and version bumps are ask-first unless explicitly requested.
3. Confirm the release target, version intent, package or artifact scope, and user approval boundary.
4. Inspect package contents or build artifacts with project-local dry-run commands when available.
5. Run or request the verification checks required for the release scope.
6. Prepare release notes or a summary from verified changes.
7. Stop before outward-facing actions unless the user explicitly approved that exact action.
8. Record commands, outputs, skipped checks, and remaining release risk.

## Release readiness checks

Use project-specific commands from `docs/project-context.md` when verified. If commands are unknown, report them as unknown instead of inventing them.

## Recovery

Use `docs/layers/05-recovery/memo.md` when package contents are wrong, verification fails, metadata is inconsistent, or approval is unclear.

## Memory and task notes

Keep release preparation evidence under `agent-work/tasks/<task-name>/`. Move durable release process lessons through the Memory layer before updating long-lived docs.

## Outputs

- Release target and approval status.
- Package or artifact contents checked.
- Verification evidence.
- Release notes or summary.
- Skipped checks and why.
- Stop points, remaining risks, or completed release actions.
