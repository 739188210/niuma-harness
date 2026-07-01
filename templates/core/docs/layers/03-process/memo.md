# Process Layer Memo

## Purpose

Route work through the right task workflow. This layer defines how to choose, switch, or escalate workflows.

This memo is a process-routing protocol. It does not replace concrete task playbooks. Specific task steps belong in `docs/process/`.

## When to use

Use this layer after loading context and policy, before implementation, and whenever the task type changes during execution.

## Agent protocol

1. Classify the task: triage, bugfix, feature, refactor, review, release, documentation, cleanup, investigation, or verification.
2. Select the closest workflow from `docs/process/`.
3. If the work is multi-step, risky, or parallel, isolate the workspace first (`docs/process/isolation.md`) before acting. For large or risky work, consider staged subagent dispatch (`docs/process/subagent-development.md`).
4. Define the smallest useful goal and success criteria.
5. Break work into observable steps.
6. Escalate to the user if the task scope expands beyond the selected workflow.

## Allowed actions

- Use `docs/process/task-triage.md` when the task type or scope is unclear.
- Use `docs/process/bugfix.md` for defect reproduction and repair.
- Use `docs/process/feature-development.md` for new or changed behavior.
- Use `docs/process/refactor.md` for behavior-preserving structural changes.
- Use `docs/process/review.md` for reviewing changed work.
- Use `docs/process/release.md` for release readiness or approved release work.
- Use `docs/process/isolation.md` to isolate multi-step, risky, or parallel work before acting.
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

- Context: `docs/layers/01-context/memo.md`
- Policy: `docs/layers/02-policy/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Workflows: `docs/process/`
