# Feature Development Process

Use this playbook when adding new behavior or changing existing user-facing behavior.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process.md` for routing rules and this file for feature execution.

## Goal

Implement the smallest safe feature slice that satisfies verified acceptance criteria.

## Confirm understanding before planning

Before writing a detailed plan, PRD, architecture note, task list, or implementation, restate the requested feature and confirm the work when scope or acceptance is not already clear.

Keep the confirmation short:

- Goal
- Non-goals
- Key assumptions
- Acceptance criteria
- Proposed smallest path
- Open questions

If an open question can change the implementation direction, ask the user before planning or coding. Do not pause for confirmation when the user request, acceptance criteria, and smallest path are already clear and the next action is autonomous under Policy. If the user already gave complete requirements and approval to proceed, record that and continue.

## Required artifact/checklist

Before reporting completion, make sure the task record or final response includes:

- Acceptance criteria used.
- Non-goals and assumptions when they affect scope.
- Smallest feature slice chosen.
- Verification evidence using the Observation schema.
- Skipped checks and remaining risks.

## Steps

1. Load Context: read `docs/index.md`, `docs/project-context.md`, and relevant existing implementation patterns.
2. Check Policy: use `docs/policy/action-boundary.md` and pause when the next action is ask-first or forbidden. Isolate first (`docs/process/isolation.md`) only when shared-tree work would create avoidable risk or coordination cost, such as intermediate broken states, parallel edits, experimental work, high-risk behavior changes, or overlap with another active task. For large features, consider staged subagent dispatch (`docs/process/subagent-development.md`).
3. Confirm understanding before planning when the feature has unclear scope, missing acceptance criteria, or meaningful design choices whose answer can change the implementation direction.
4. Choose the smallest implementation path that fits the current architecture.
5. Plan verification before implementation. Use `docs/layers/04-observation.md` for evidence expectations.
6. Add or update focused tests for behavior changes. If automated testing is not available for the change, record the manual verification that replaces it and why.
7. Implement the feature with task-scoped changes.
8. Run relevant verification commands.
9. Record changes, verification results, skipped checks, and remaining risk.

## When to pause

Pause and ask when `docs/policy/action-boundary.md` classifies the next action as ask-first, forbidden, or stop-and-escalate.

Feature-specific pause points:

- acceptance criteria are unclear
- implementation would expand beyond the requested feature slice

## Recovery

Use `docs/layers/05-recovery.md` when tests, builds, commands, context, or acceptance criteria fail. Do not weaken verification to make the feature appear complete.

## Memory and task notes

For multi-step features, create a task folder under `agent-work/tasks/<task-name>/` and keep status, context, plan, verification, and handoff notes there.

Use `docs/layers/06-memory.md` before moving any task finding into `docs/project-context.md`.

## Outputs

- Acceptance criteria used.
- Implementation summary.
- Files changed.
- Verification evidence.
- Skipped checks and why.
- Remaining risk or follow-up.
