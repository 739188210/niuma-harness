# Feature Development Process

Use this playbook when adding new behavior or changing existing user-facing behavior.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for feature execution.

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
- Implementation summary and files changed.
- Verification evidence using the Observation schema.
- Skipped checks and remaining unknowns, including any material risks.

## Steps

1. Load Context: read `{{HARNESS_DIR}}/docs/index.md`, `{{HARNESS_DIR}}/docs/project-context.md`, and relevant existing implementation patterns.
2. Check Policy: use `{{HARNESS_DIR}}/docs/policy/action-boundary.md` and pause when the next action is ask-first, forbidden, or stop-and-escalate. Apply the Policy re-evaluation procedure before treating an explicit request as an exception to a default prohibition. Isolate first (`{{HARNESS_DIR}}/docs/process/isolation.md`) only when shared-tree work would create avoidable risk or coordination cost, such as intermediate broken states, parallel edits, experimental work, high-risk behavior changes, or overlap with another active task. For large features, consider staged subagent dispatch (`{{HARNESS_DIR}}/docs/process/subagent-development.md`).
3. Confirm understanding before planning when the feature has unclear scope, missing acceptance criteria, or meaningful design choices whose answer can change the implementation direction.
4. Classify each acceptance criterion before implementation: test-first when it has a stable automated target, otherwise declare the automation-unsuitability reason and replacement evidence before implementation.
5. For test-first criteria, follow `{{HARNESS_DIR}}/docs/process/test-driven-development.md`; do not implement before the focused RED evidence.
6. Choose the smallest implementation path that fits the current architecture.
7. Plan verification before implementation. Use `{{HARNESS_DIR}}/docs/layers/04-observation.md` for evidence expectations.
8. Implement the feature with task-scoped changes.
9. Run relevant verification commands.
10. Record changes, verification results, skipped checks, and remaining unknowns, including any material risks.

## When to pause

Pause and ask when `{{HARNESS_DIR}}/docs/policy/action-boundary.md` classifies the next action as ask-first, forbidden, or stop-and-escalate.

Feature-specific pause points:

- acceptance criteria are unclear
- implementation would expand beyond the requested feature slice

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when tests, builds, commands, context, or acceptance criteria fail. Do not weaken verification to make the feature appear complete.

## Memory and task notes

For multi-step features, create a task folder under `agent-work/tasks/<task-name>/` and keep status, context, plan, verification, and handoff notes there.

Use `{{HARNESS_DIR}}/docs/layers/06-memory.md` before moving any task finding into `{{HARNESS_DIR}}/docs/project-context.md`.

