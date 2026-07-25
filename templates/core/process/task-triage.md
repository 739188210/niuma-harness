# Task Triage Process

Use this playbook before choosing a more specific workflow.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for triage steps.

## Goal

Classify the request, load the minimum required context, identify policy risks, and choose the next playbook.

## Required artifact/checklist

Before reporting completion, make sure the task record or final response includes:

- Task classification.
- Risk/impact tier: quick, normal, or careful.
- Selected playbook or reason no playbook is needed.
- Policy boundary or blocker.
- Success criteria or smallest useful next step.
- Whether a `status.md` ledger is needed for multi-step, risky, parallel, or interruptible work.
- Evidence plan.

## Steps

1. Load Context: read `{{HARNESS_DIR}}/docs/index.md` and `{{HARNESS_DIR}}/docs/project-context.md` for stable facts.
2. Check Policy: use `{{HARNESS_DIR}}/docs/layers/02-policy.md` for protocol and `{{HARNESS_DIR}}/docs/policy/action-boundary.md` for concrete action boundaries.
3. Classify the task:
   - question or explanation only
   - small edit
   - bug fix
   - feature development
   - refactor
   - review
   - release readiness
   - security-sensitive change
   - documentation update (`documentation` classification)
   - investigation (`review` classification)
   - verification (`verification` classification)
   - cleanup (`refactor` classification)
4. Assign a lightweight risk/impact tier:
   - `quick`: clear, low-risk, localized work that can be verified with a minimal check.
   - `normal`: ordinary feature, bug fix, refactor, documentation, or verification work that needs explicit success criteria and evidence.
   - `careful`: work involving security, user data, permissions, public APIs, database shape, dependencies, releases, destructive operations, broad shared code, or high cost of failure.

   The tier does not replace Policy. `quick` still requires Observation, and `careful` does not automatically require heavy documentation; it means state the risk, check Policy, and choose evidence before acting.
5. Choose the playbook:
   - Bug fix: `{{HARNESS_DIR}}/docs/process/bugfix.md`
   - Feature development: `{{HARNESS_DIR}}/docs/process/feature-development.md`
   - Refactor: `{{HARNESS_DIR}}/docs/process/refactor.md`
   - Review: `{{HARNESS_DIR}}/docs/process/review.md`
   - Release readiness: `{{HARNESS_DIR}}/docs/process/release.md`

   Lightweight default routing for common task intents:

   | Intent | Default route | Extra requirement |
   |---|---|---|
   | Documentation update | `{{HARNESS_DIR}}/docs/process/refactor.md` | Keep the smallest useful scope; verify generated output, internal links, and factual accuracy. |
   | Investigation | `{{HARNESS_DIR}}/docs/process/review.md` read-only observation path | Use the existing `review` classification. Do not modify files; clearly separate facts, inferences, and unknowns. |
   | Verification | `{{HARNESS_DIR}}/docs/process/review.md` plus `{{HARNESS_DIR}}/docs/layers/04-observation.md` | Use the existing `verification` classification. Report only checks actually run and observed results; unrun checks are unknown, not passing. |
   | Cleanup | `{{HARNESS_DIR}}/docs/process/refactor.md` | Use the existing `refactor` classification. Check ownership first; ask before deleting files not created by this task or content that may be user-owned. |
6. Define success criteria, the smallest useful next step, and whether the work needs a `status.md` ledger.
7. After classification and risk routing, decide whether direct execution is safe or whether the task needs an execution anchor. Use the task-material protocol in `agent-work/README.md`; do not create another classification or risk tier for task files.
8. Stop and ask when the request lacks enough information, expands scope, or crosses a Policy boundary.

## Observation

Before leaving triage, identify what evidence will show that the next step succeeded. Use `{{HARNESS_DIR}}/docs/layers/04-observation.md` for verification expectations.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when classification is unclear after reading available context. Do not guess; report the ambiguity and ask for the missing decision.

