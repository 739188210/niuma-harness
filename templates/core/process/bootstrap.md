# Project Bootstrap and Context Maintenance Process

Use this managed process when `{{HARNESS_DIR}}/docs/project-context.md` is missing, its bootstrap record is `pending` or `partial`, durable facts need maintenance, or current workspace evidence conflicts with recorded context.

## Goal

Build and maintain a concise, verified project fact base for future work without turning durable context into task logs, guesses, or a duplicate of current source files.

## Bootstrap

Bootstrap is the one-time initial project scan after `niuma-harness init`. It is not scoped to the current user request.

Triage reads the bootstrap record as part of its base minimum reading set. When it has `"status": "pending"` and triage identifies the first non-trivial task, complete the initial scan before normal execution of the selected playbook. Bootstrap is a context-maintenance prerequisite, not a task classification, risk tier, or replacement playbook. After the scan, resume the selected playbook using the verified facts. A small task, an obvious reference implementation, or a task-local shortcut is not a reason to skip required bootstrap.

### Minimum scan

1. Inspect package manifests, lockfiles, workspace or monorepo configuration, README files, and project documentation.
2. Inspect source roots, test roots, framework configuration, build/lint/typecheck/test configuration, and existing Harness documents.
3. Identify the project summary, technology stack, code map, engineering conventions, verified build and verification commands, reference implementations, and material open questions or known gaps.
4. For a declared multi-module workspace, also verify module boundaries, dependencies, local manifests, source/test roots, and module versus integration checks.
5. Record only facts verified from current files, command results, or explicit user confirmation.

## Bootstrap record

The marker-delimited bootstrap record remains in `{{HARNESS_DIR}}/docs/project-context.md`; keep it there because it is part of the current execution-record and Audit contract.

- `pending`: no useful initial scan is complete.
- `partial`: the scan is blocked or intentionally limited by explicit user instruction; state the scope and gaps in `knownGaps`. A `partial` record triggers further bootstrap only when its known gaps or durable-fact maintenance are material to the current task; do not turn unrelated context debt into scope expansion.
- `complete`: the basic project map, stack, commands, and known gaps are usefully initialized. Use a canonical UTC timestamp, workspace-relative regular-file paths in `filesInspected`, substantive Project summary, Technology stack, and Code map sections, plus at least one explicit verification command.

Do not remove or change the marker's schema and fields while maintaining project facts.

## Durable fact maintenance

Update `{{HARNESS_DIR}}/docs/project-context.md` only when a fact is verified, reusable across future tasks, concise enough to remain useful, and safe to store.

Maintain facts about:

- Project purpose and high-level shape.
- Technology stack, package managers, and workspace layout.
- Source roots, test roots, app/package boundaries, and important entry points.
- Verified install, test, lint, typecheck, build, and local run commands.
- Stable engineering conventions, reusable patterns, and reference implementations.
- Known gaps and open questions that materially affect future work.

When current workspace evidence conflicts with a recorded fact, use the current evidence for the task. Then update or mark the durable fact stale after verification.

`Task fact routing`, when a project uses it, is an optional navigation aid: update it only when a durable task-to-heading mapping changes. It is not a bootstrap record field, completion requirement, or required project artifact. Do not make it a second code map or use it to copy source/test lists, commands, module-local details, or task material.

Do not store secrets, credentials, private data, task logs, one-off command output, temporary failures, debugging traces, one-task root causes, throwaway scripts, unverified guesses, or current uncommitted file lists. Keep such material under `agent-work/` instead.

## Observation

Before recording or changing durable context, identify the current files, commands, or user confirmation that verify each fact. Treat unverified or stale material as a gap, not durable truth.

## Recovery

If project boundaries, commands, or facts cannot be determined safely, set or retain `partial` status, record the limiting reason in `knownGaps`, keep task-specific uncertainty in `agent-work/`, and ask for the missing decision when necessary.
