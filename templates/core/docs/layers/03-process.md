# Process Layer Memo

## Purpose

Route work through the right task workflow. This layer defines how to choose, switch, or escalate workflows.

This memo is a process-routing protocol. It does not replace concrete task playbooks. Specific task steps belong in `docs/process/`.

## When to use

Use this layer after loading context and policy, before implementation, and whenever the task type changes during execution.

## Agent protocol

1. Classify the task: triage, bugfix, feature, refactor, review, release, documentation, cleanup, investigation, or verification.
2. Select the closest workflow from `docs/process/`.
3. Follow any confirmation gate defined by the selected workflow before writing detailed plans or implementation docs.
4. If working in the shared tree would create avoidable risk or coordination cost, isolate the workspace first (`docs/process/isolation.md`) before acting. Do not isolate merely because a task has more than one step. For large or risky work, consider staged subagent dispatch (`docs/process/subagent-development.md`).
5. Define the smallest useful goal and success criteria.
6. Break work into observable steps.
7. Escalate to the user if the task scope expands beyond the selected workflow.

## Task state ownership

The selected workflow owns the success criteria and required task state for the task type. It decides which task notes, plans, checklists, and evidence records are needed beyond the shared `status.md` ledger.

For multi-step, risky, parallel, or delegated work, decide who updates `status.md`, who records task notes, and who summarizes verification evidence before work begins. Parallel or delegated work must keep ownership explicit so task ledgers and evidence are not mixed or overwritten.

For delegated work, the parent flow or active task owner is responsible for integrating delegated outputs before completion; use `docs/process/subagent-development.md` for the integration gate.

## Trigger and artifact routing

Use this as a routing aid only. The selected workflow owns the full checklist, success criteria, and evidence details.

| Trigger/category | Route to | Required artifact/checklist |
|---|---|---|
| "bug", "broken", "regression", "failing test", "does not work" | `docs/process/bugfix.md` | Reproduction signal and fix verification. |
| "add", "implement", "change behavior", "support", "user can" | `docs/process/feature-development.md` | Acceptance criteria and verification evidence. |
| "refactor", "cleanup", "simplify", "rename", "restructure" without behavior change | `docs/process/refactor.md` | Behavior baseline and preservation evidence. |
| "review", "audit", "check this PR/diff" | `docs/process/review.md` | Findings with severity and reviewed evidence. |
| "release", "publish", "ship", "tag", "package" | `docs/process/release.md` | Release target, approval boundary, and package or artifact scope. |
| "security", "data", "API", "dependency", or other risky/wide-scope work | `docs/process/task-triage.md` plus Policy | Classification, policy boundary, selected workflow, and evidence plan. |
| "done", "verify", "prove", "is this complete?" | Current selected workflow plus Observation | Completion evidence using the Observation schema. |

Trigger words are routing hints, not permission to bypass Policy. If multiple rows match, start with `docs/process/task-triage.md`. Do not duplicate the selected workflow's steps in this memo.

## Allowed actions

- Use `docs/process/task-triage.md` when the task type or scope is unclear.
- Use `docs/process/bugfix.md` for defect reproduction and repair.
- Use `docs/process/feature-development.md` for new or changed behavior.
- Use `docs/process/refactor.md` for behavior-preserving structural changes.
- Use `docs/process/review.md` for reviewing changed work.
- Use `docs/process/release.md` for release readiness or approved release work.
- Use `docs/process/isolation.md` when shared-tree work would create avoidable risk or coordination cost.
- Use `docs/process/subagent-development.md` to coordinate large or risky work across isolated subagents with staged review.
- Create task-local notes for multi-step work.
- Adjust the workflow when new evidence shows the original classification was wrong.

## Forbidden actions

- Do not start editing before selecting a process for non-trivial work.
- Do not silently expand a small task into a large refactor.
- Do not skip verification planning for code or behavior changes.
- Do not keep following a workflow after its assumptions are proven wrong.
- Do not duplicate full playbook steps in this memo; put concrete procedures in `docs/process/` instead.

## Outputs

- Task classification and selected workflow.
- A concise execution plan or task checklist.
- Success criteria and expected verification checks.
- Any scope escalation or user decision needed.

## Links to other layers

- Context: `docs/layers/01-context.md`
- Policy: `docs/layers/02-policy.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`
- Workflows: `docs/process/`
