# Refactor Process

Use this playbook when restructuring code while preserving intended behavior.

## Goal

Make the smallest useful structural improvement without changing intended behavior.

## Steps

1. Apply the base reading and conditional routing in `{{HARNESS_DIR}}/docs/process/task-triage.md`, then inspect the affected implementation, tests, and behavior baseline.
2. State the refactor goal, behavior that must remain unchanged, and scope boundary. Use `agent-work/README.md` to select Direct, a plan, or a status ledger.
3. Identify verification before editing; the baseline is the behavior boundary.
4. Split work into small reversible changes, touching only files needed for the refactor goal.
5. Run focused verification after meaningful steps and record actual evidence and outcome through `{{HARNESS_DIR}}/docs/layers/04-observation.md`.

## Scope guard

Stop if behavior changes, verification fails, or the work becomes a feature. Route behavior changes through feature or bugfix. Changing tests during a refactor is ask-first unless purely mechanical and assertion-preserving. Do not manufacture an artificial RED, update snapshots, loosen assertions, skip tests, or change verification configuration to accommodate the refactor.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` for failed evidence or unsafe scope.

## Memory

Route verified durable findings through `{{HARNESS_DIR}}/docs/layers/06-memory.md`.
