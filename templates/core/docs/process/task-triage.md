# Task Triage Process

Use this playbook before choosing a more specific workflow.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process.md` for routing rules and this file for triage steps.

## Goal

Classify the request, load the minimum required context, identify policy risks, and choose the next playbook.

## Required artifact/checklist

Before reporting completion, make sure the task record or final response includes:

- Task classification.
- Selected playbook or reason no playbook is needed.
- Policy boundary or blocker.
- Success criteria or smallest useful next step.
- Whether a `status.md` ledger is needed for multi-step, risky, parallel, or interruptible work.
- Evidence plan.

## Steps

1. Load Context: read `docs/index.md` and `docs/project-context.md` for stable facts.
2. Check Policy: use `docs/layers/02-policy.md` for protocol and `docs/policy/action-boundary.md` for concrete action boundaries.
3. Classify the task:
   - question or explanation only
   - small edit
   - bug fix
   - feature development
   - refactor
   - review
   - release readiness
   - security-sensitive change
   - documentation update
   - verification or investigation
4. Choose the closest playbook:
   - Bug fix: `docs/process/bugfix.md`
   - Feature development: `docs/process/feature-development.md`
   - Refactor: `docs/process/refactor.md`
   - Review: `docs/process/review.md`
   - Release readiness: `docs/process/release.md`
   - Other tasks: use the closest playbook and keep task notes when needed.
5. Define success criteria, the smallest useful next step, and whether the work needs a `status.md` ledger.
6. Stop and ask when the request lacks enough information, expands scope, or crosses a Policy boundary.

## Observation

Before leaving triage, identify what evidence will show that the next step succeeded. Use `docs/layers/04-observation.md` for verification expectations.

## Recovery

Use `docs/layers/05-recovery.md` when classification is unclear after reading available context. Do not guess; report the ambiguity and ask for the missing decision.

## Outputs

- Task classification.
- Selected playbook or reason no playbook is needed.
- Required context and rules.
- Success criteria or blocker.
- `status.md` ledger decision when work may be multi-step, risky, parallel, or interruptible.
- Verification evidence plan.
