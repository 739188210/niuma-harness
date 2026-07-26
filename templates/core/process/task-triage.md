# Task Triage Process

Use this playbook before choosing a more specific workflow.

This is a concrete playbook selected by the Process layer. Use `{{HARNESS_DIR}}/docs/layers/03-process.md` for routing rules and this file for triage steps.

## Goal

Classify the request, load the minimum required context, identify policy risks, and choose the next playbook.

## Base minimum reading set

Triage owns the minimum conditional reading set. Read only what is needed to classify, route, and safely start this task; do not pre-read every Harness document.

1. Confirm the request-named files and smallest current source, configuration, build, test, README, or command evidence already inspected at entry; inspect the smallest missing evidence needed to verify task-specific facts.
2. When the task needs Harness navigation, fact priority, the Policy exception, or a stable project fact, read `{{HARNESS_DIR}}/docs/index.md`, then `{{HARNESS_DIR}}/docs/project-context.md` only when stable facts are needed. Do not follow every link.
3. In `{{HARNESS_DIR}}/docs/project-context.md`, read the matching fact scope, its sources, known gaps, and freshness boundary, including its `Refresh when` condition. When `Task fact routing` exists and matches the task, use it to select the smallest relevant headings; when it is absent or does not match, select headings from the task request instead. For example, read Workspace topology to locate an affected area, Build and verification commands when planning a check, and Engineering conventions only when they affect the proposed work. Missing coverage does not require a whole-project scan: inspect the smallest relevant current evidence now. A source change, task-relevant known gap, or conflict with current evidence requires rechecking only the selected scope from its listed current sources; use its `Refresh when` condition to identify source changes.

Project context is a locator for stable facts, not proof of current task behavior. Current verifiable workspace evidence remains higher priority and never yields to context reading.

## Conditional reading

Read the following only when its condition applies. These conditions do not create another task classification or risk tier.

| Condition | Additional reading | Boundary |
|---|---|---|
| A matching fact scope is stale, has a task-relevant known gap, or conflicts with current evidence. | The scope's listed sources and the smallest relevant current workspace evidence. | Refresh only the task-relevant fact or mark its gap; do not turn missing coverage into scope expansion. |
| The next action is not trivial read-only work, or the task involves security, data, permissions, public APIs, dependencies, releases, destructive effects, or unclear risk. | `{{HARNESS_DIR}}/docs/policy/action-boundary.md`; read `{{HARNESS_DIR}}/docs/layers/02-policy.md` when the Policy protocol is needed. | Policy is checked before the action and is not overridden by ordinary fact priority. |
| Declared modules, task paths, or current evidence indicate module boundaries or cross-module work. | `{{HARNESS_DIR}}/docs/module-topology.md`, then only affected module supplements and current module files. | For cross-module work, read every affected module's Cross-module verification triggers. |
| The request, current files, or project material points to a durable architecture, contract, dependency, security, or shared-convention decision. | Search for and read only relevant Accepted, unsuperseded records under `{{HARNESS_DIR}}/docs/decisions/`, then re-check their Source of truth. | An ADR explains rationale; it does not replace current facts or Policy. |
| A recurring scenario, known trap, or current reference points to reusable experience. | Read only scope-matching Active records under `{{HARNESS_DIR}}/docs/experience/`, then re-check their Source of truth. | Experience is guidance; it does not replace current facts or Policy. |
| The task needs an execution anchor, recoverable state, or resumes a named task. | Read `agent-work/README.md`; for a named task resume, follow the Recovery entry in `{{HARNESS_DIR}}/docs/layers/07-loop.md`. | Do not enumerate task directories, pre-read, create, or copy a complete task package merely for format. Re-triage only when current evidence invalidates the original classification, risk tier, success criteria, or selected playbook. |

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

1. Establish the base minimum reading set.
2. Classify the task:
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
3. Assign a lightweight risk/impact tier:
   - `quick`: clear, low-risk, localized work that can be verified with a minimal check.
   - `normal`: ordinary feature, bug fix, refactor, documentation, or verification work that needs explicit success criteria and evidence.
   - `careful`: work involving security, user data, permissions, public APIs, database shape, dependencies, releases, destructive operations, broad shared code, or high cost of failure.

   The tier does not replace Policy. `quick` still requires Observation, and `careful` does not automatically require heavy documentation; it means state the risk, check Policy, and choose evidence before acting.
4. Choose the playbook:
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
5. Apply only the conditional reads that now apply. If a task-relevant fact scope needs refresh, inspect its current sources, record only verified durable facts, then resume the selected playbook using verified facts.
6. Define success criteria, the smallest useful next step, an evidence plan, and whether the work needs task-local execution material or a `status.md` ledger. After classification and risk routing, decide whether direct execution is safe or whether the task needs an execution anchor. Use the task-material protocol in `agent-work/README.md`; do not create another classification or risk tier for task files.
7. Stop and ask when the request lacks enough information, expands scope, or crosses a Policy boundary.

## Observation

Before leaving triage, identify what evidence will show that the next step succeeded. Use `{{HARNESS_DIR}}/docs/layers/04-observation.md` for verification expectations.

## Recovery

Use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` when classification is unclear after reading available context. Do not guess; report the ambiguity and ask for the missing decision.
