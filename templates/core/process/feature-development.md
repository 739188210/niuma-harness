# Feature Development Process

Use this playbook when adding behavior or changing existing user-facing behavior.

## Goal

Implement the smallest safe feature slice that satisfies verified acceptance criteria.

## Before implementation

1. Apply the base reading and conditional routing in `{{HARNESS_DIR}}/docs/process/task-triage.md`.
2. Inspect the relevant implementation patterns and acceptance-criterion targets.
3. When scope, acceptance criteria, or a design choice is unclear, state the goal, non-goals, assumptions, smallest path, and open question; ask before coding when the answer changes direction.
4. Use `agent-work/README.md` to select Direct, a pre-work plan, or a status ledger.
5. Classify each criterion before implementation: use test-first for a stable automated target; otherwise state why automation is unsuitable and what replacement evidence will be used.

## Steps

1. Choose the smallest implementation path that fits the current architecture.
2. For test-first criteria, follow `{{HARNESS_DIR}}/docs/process/test-driven-development.md` before implementation.
3. Implement only the approved feature slice.
4. Run the planned focused checks and broader checks justified by changed risk.
5. Record actual evidence and outcome through `{{HARNESS_DIR}}/docs/layers/04-observation.md` in the final response or `status.md`.

## Pause

Ask before an action crosses Policy, acceptance criteria remain unclear, or implementation expands beyond the requested slice.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when evidence, commands, context, or acceptance criteria fail; do not weaken verification to make the feature appear complete.

## Memory

Route verified durable findings through `{{HARNESS_DIR}}/docs/layers/06-memory.md`.
