# Task Triage Process

Use this playbook before choosing a more specific workflow.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process/memo.md` for routing rules and this file for triage steps.

## Goal

Classify the request, load the minimum required context, identify policy risks, and choose the next playbook.

## Steps

1. Load Context: read `docs/index.md` and `docs/project-context.md` for stable facts.
2. Check Policy: read `docs/layers/02-policy/memo.md` when the request may modify files, run commands, add dependencies, touch security, or change public behavior.
3. Classify the task:
   - question or explanation only
   - small edit
   - bug fix
   - feature development
   - refactor
   - security-sensitive change
   - documentation update
   - verification or investigation
4. Choose the closest playbook:
   - Bug fix: `docs/process/bugfix.md`
   - Feature development: `docs/process/feature-development.md`
   - Other tasks: use the closest playbook and keep task notes when needed.
5. Define success criteria and the smallest useful next step.
6. Stop and ask when the request lacks enough information, expands scope, or crosses a Policy boundary.

## Observation

Before leaving triage, identify what evidence will show that the next step succeeded. Use `docs/layers/04-observation/memo.md` for verification expectations.

## Recovery

If classification is unclear after reading available context, do not guess. Report the ambiguity and ask for the missing decision.

## Outputs

- Task classification.
- Selected playbook or reason no playbook is needed.
- Required context and rules.
- Success criteria or blocker.
