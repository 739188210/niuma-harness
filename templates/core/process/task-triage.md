# Task Triage Process

Use this playbook before choosing a more specific workflow.

## Goal

Classify the request, load the minimum relevant context, identify policy risks, choose a playbook, and decide whether task state must survive outside the conversation.

## Base minimum reading set

1. Confirm the request-named files and smallest current source, configuration, build, test, README, or command evidence already inspected at entry.
2. When Harness navigation, fact priority, the Policy exception, or stable facts are needed, read `{{HARNESS_DIR}}/docs/index.md`, then only relevant headings in `{{HARNESS_DIR}}/docs/project-context.md`.
3. Current workspace evidence remains higher priority than retained project context.

## Conditional reading

| Condition | Additional reading | Boundary |
| --- | --- | --- |
| The next action is not trivial read-only work, or it touches security, data, permissions, public APIs, dependencies, releases, destructive effects, or unclear risk. | `{{HARNESS_DIR}}/docs/policy/action-boundary.md`; read `{{HARNESS_DIR}}/docs/layers/02-policy.md` when needed. | Check Policy before acting. |
| Declared modules, task paths, or current evidence indicate cross-module work. | `{{HARNESS_DIR}}/docs/module-topology.md`, then only affected module supplements and current module files. | Read affected cross-module verification triggers. |
| A recurring scenario or known trap may apply. | Search and read only relevant active records under `{{HARNESS_DIR}}/docs/experience/`, then re-check their source of truth. | Experience is guidance, never current fact. |
| Work is blocked, cross-session, delegated, parallel, changing scope, or cannot safely resume from current files alone. | `agent-work/README.md`; for a named resume follow `{{HARNESS_DIR}}/docs/layers/07-loop.md`. | Decide whether status tracking is needed; do not create files merely for format. |

## Required checklist

Before reporting completion, make sure the final response or status ledger includes:

- Task classification and risk/impact tier.
- Selected playbook or reason no playbook is needed.
- Policy boundary or blocker.
- Success criteria or smallest useful next step.
- Direct or status-tracked material choice and any task-local files created.
- Actual checks, skipped checks, and remaining unknowns.

## Steps

1. Establish the base minimum reading set.
2. Classify the task: question, small edit, bugfix, feature, refactor, review, release, security-sensitive change, documentation, investigation, verification, or cleanup.
3. Assign a risk/impact tier:
   - `quick`: clear, low-risk, localized work with a minimal check.
   - `normal`: ordinary work needing explicit success criteria and evidence.
   - `careful`: security, user data, permissions, public APIs, database shape, dependencies, releases, destructive operations, broad shared code, or high cost of failure.
4. Choose the playbook: bugfix, feature development, refactor, review, or release. Documentation and cleanup use refactor; investigation and verification use the read-only review path.
5. Apply only the conditional reading that now applies.
6. Define success criteria, the smallest useful next step, and planned checks. Use `agent-work/README.md` to decide whether work stays Direct or needs status tracking; create a plan only when it has real pre-work value.
7. Stop and ask when the request lacks enough information, expands scope, or crosses a Policy boundary.

## Observation

Before leaving triage, identify the smallest evidence that will show the next step succeeded. Direct work reports actual observations in the final response; status-tracked work records them in `status.md`.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when classification is unclear after reading available context. Do not guess; report the ambiguity and ask for the missing decision.
