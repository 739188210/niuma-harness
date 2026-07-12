# Project Context

This file stores verified stable facts about this project. It is maintained by agents and humans as durable project knowledge is discovered.

## Metadata

<!-- niuma-bootstrap-record:begin -->
```json
{
  "schemaVersion": 1,
  "status": "pending",
  "recordedAt": null,
  "filesInspected": [],
  "scanScope": "Not scanned",
  "knownGaps": ["Initial project bootstrap has not been completed."]
}
```
<!-- niuma-bootstrap-record:end -->

`status` is `pending`, `partial`, or `complete`. Use a canonical UTC timestamp for `recordedAt` after inspection. Paths in `filesInspected` are workspace-relative regular files. A `partial` record names the limited scan and its gaps; a `complete` record also requires substantive Project summary, Technology stack, and Code map sections plus at least one explicit verification command below.

## Bootstrap protocol

Bootstrap is a one-time full initial project scan after `niuma-harness init`. It initializes this file for future tasks and is not scoped to the current user request.

When bootstrap status is `pending`, the first agent handling non-trivial work must complete this bootstrap before normal task execution. A small task, an obvious reference implementation, or a task-local shortcut is not a valid reason to skip bootstrap.

Minimum bootstrap scan:

1. Inspect package manifests, lockfiles, workspace or monorepo config, README files, and project docs.
2. Inspect source roots, test roots, framework config, build/lint/typecheck/test config, and existing harness docs.
3. Identify the project summary, technology stack, code map, engineering conventions, verified build and verification commands, reference implementations, and open questions or known gaps.
4. Record only facts verified from current files or explicit user confirmation.
5. Do not record secrets, credentials, private data, one-off logs, temporary task state, or guesses.
6. Set `status` to `complete` only when the basic project map, stack, commands, and known gaps are usefully initialized.
7. Set `status` to `partial` only when the scan is blocked, intentionally limited by explicit user instruction, or cannot safely determine the project boundary. Record the reason in `knownGaps`.
8. Keep the marker block when bootstrap is complete; audit reads it. Remove only this explanatory `Bootstrap protocol` section so the file stays focused on durable project context and ongoing maintenance standards.

After bootstrap, keep this file focused on durable facts that future tasks should reuse. Task-local notes, debugging traces, and handoff state belong in `agent-work/tasks/<task-name>/`.

## Maintenance standard

Update this file after bootstrap only when a task verifies a durable fact that future tasks should reuse.

A durable fact is eligible when it is:

- Verified against current workspace files or explicit user confirmation.
- Stable enough to help future tasks, not just the current task.
- Concise enough to remain useful as always-consulted project context.
- Safe to store without exposing secrets or private data.

Maintain these categories when evidence exists:

- Project purpose and high-level shape.
- Technology stack, package managers, and workspace layout.
- Source roots, test roots, app/package boundaries, and important entry points.
- Verified install, test, lint, typecheck, build, and local run commands.
- Stable engineering conventions and reusable implementation patterns.
- Reference implementations that future tasks can copy or adapt.
- Known gaps and open questions that materially affect future work.

Do not store:

- Task logs, one-off command output, temporary failures, or debugging traces.
- Single-task bug root causes, throwaway scripts, temporary mocks, or current uncommitted file lists.
- Detailed function inventories that are likely to drift.
- Unverified guesses, stale facts, secrets, credentials, tokens, or private data.

When a durable fact changes, update or remove the stale fact instead of appending conflicting notes. Prefer a concise fact with evidence over a long explanation.

## Project summary

## Technology stack

## Code map

## Engineering conventions

## Build and verification commands

```bash
# install

# test

# lint/typecheck/build
```

## Reference implementations

## Open questions
