# Release Process

Use this playbook when the user explicitly asks to check whether it can be released, or to prepare or perform release work.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for release readiness.

## Goal

Confirm release readiness with evidence and avoid irreversible or outward-facing actions without approval.

## Required artifact/checklist

Before reporting completion, make sure `status.md` for status-tracked work or the final response for Direct work includes:

- Release target and version intent.
- Approval boundary for publish/tag/deploy/version-bump actions.
- Package or artifact scope.
- Contents checked.
- Verification evidence and remaining unknowns, including release risks.
- Release notes or summary when prepared.
- Stop points or completed release actions.

## Steps

1. Apply the base minimum reading set and conditional reads in `{{HARNESS_DIR}}/docs/process/task-triage.md`, then inspect package metadata, release-related docs, and the target package or artifact contents.
2. Confirm the release target, version intent, package or artifact scope, and user approval boundary. A request to check whether it can be released authorizes task-scoped local readiness evidence, not an outward-facing action. Publishing, tagging, pushing, deploying, and version bumps are forbidden unless explicitly requested. An explicit request authorizes only the named action and scope; it never overrides stop-and-escalate and still leaves ask-first gates for credentials, destructive effects, failed verification, unclear scope, or external side effects not explicitly covered by the request.
3. Inspect package metadata, package contents, or build artifacts with available project-local dry-run commands when available. The local dry-run, build, test, lint, artifact, and metadata checks needed for this release-readiness request do not need separate approval when they stay task-scoped and local.
4. Run applicable local verification checks required for the release scope, or request approval for checks that touch external systems, credentials, quotas, or release infrastructure.
5. Prepare release notes or a summary from verified changes.
6. Stop before outward-facing actions unless the user explicitly approved that exact action.
7. Record commands, expected signals, actual results, skipped checks, and remaining unknowns, including release risks.

## Release readiness checks

Use project-specific commands from `{{HARNESS_DIR}}/docs/project-context.md` when verified. If commands are unknown, report them as unknown instead of inventing them.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when package contents are wrong, verification fails, metadata is inconsistent, or approval is unclear.

## Memory and task notes

Keep release preparation status and evidence under `agent-work/tasks/<task-name>/`. Move durable release process lessons through the Memory layer before updating long-lived docs.

