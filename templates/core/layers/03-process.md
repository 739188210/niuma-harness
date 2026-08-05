# Process Layer Memo

## Purpose

Route work through the smallest applicable workflow. This layer chooses a path; it does not repeat Policy, evidence, recovery, or task-material rules.

## When to use

Use this layer after triage selects it, before implementation, and whenever task type or scope changes.

## Agent protocol

1. When routing is needed, start with `{{HARNESS_DIR}}/docs/process/task-triage.md`; triage classifies the task, applies conditional reading, and selects a workflow.
2. Select one primary workflow: bugfix, feature, refactor, review, or none for a lightweight read-only answer.
3. For changed behavior or bug regressions, decide before implementation whether stable automated test-first evidence applies. Use `{{HARNESS_DIR}}/docs/process/test-driven-development.md` when eligible; otherwise declare suitable replacement evidence before implementation.
4. Define the smallest useful goal, success criteria, and observable steps.
5. Use `agent-work/README.md` as the only decision card for Direct eligibility and plan or status-ledger triggers.
6. Re-check Process and Policy before expanding scope, changing task type, or crossing a new boundary.

## Workflow routing

| Task intent | Workflow | Workflow-specific focus |
| --- | --- | --- |
| Bug, regression, broken behavior | `process/bugfix.md` | Reproduce the symptom, repair the first cause, verify the same behavior. |
| New or changed behavior | `process/feature-development.md` | Confirm acceptance criteria and implement the smallest feature slice. |
| Behavior-preserving restructure | `process/refactor.md` | Preserve a verified behavior baseline. |
| Review or audit | `process/review.md` | Report evidence-backed findings; fixing needs explicit approval. |
| Read-only question or lightweight investigation | No primary workflow | Use Context, Policy when relevant, and Observation. |

Trigger words are routing hints, not permission to bypass Policy. If multiple rows fit or scope is unclear, return to triage.

## Ownership boundaries

The selected workflow owns its task-type success criteria and gates. Observation owns generic evidence and outcome semantics. Recovery owns generic failure handling. `agent-work/README.md` owns task-file selection and roles.

## Allowed actions

- Use triage when the task type or scope is unclear.
- Use the selected primary workflow for task-specific steps.
- Adjust the workflow when current evidence shows the original classification was wrong.

## Forbidden actions

- Do not start editing before selecting a process when routing is needed.
- Do not silently expand a small task into a broad refactor or unrelated feature.
- Do not skip verification planning for code or behavior changes.
- Do not keep following a workflow after its assumptions are proven wrong.

## Outputs

- Task classification and selected workflow.
- Success criteria and expected verification.
- Any scope escalation or user decision needed.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Workflows: `{{HARNESS_DIR}}/docs/process/`
