# Process Layer Memo

## Purpose

Choose the smallest execution form that makes the goal, evidence, and safe resumption clear. This layer does not classify work as a task type, assign risk tiers, or repeat Policy, Observation, Recovery, or task-material rules.

## When to use

Use this layer before implementation or other multi-step work, when Direct eligibility is unclear, and whenever complexity, boundaries, or resumption needs change.

## Agent protocol

1. Inspect the smallest request-relevant current source, configuration, build, test, README, or command evidence.
2. Apply `{{HARNESS_DIR}}/docs/layers/02-policy.md` and `{{HARNESS_DIR}}/docs/policy/action-boundary.md` before a non-read-only action. Policy decides permission; it is not an execution form.
3. Define the smallest useful goal, observable acceptance criteria, and evidence that can prove them.
4. Use `agent-work/README.md` as the only decision card for Direct, Planned, or Tracked work and its task material.
5. For behavior that a stable automated target can express, plan focused test-first evidence under `{{HARNESS_DIR}}/docs/layers/04-observation.md`. Otherwise state suitable replacement evidence before implementation.
6. Re-check Process and Policy before material scope expansion or when current evidence invalidates the execution form, acceptance criteria, boundary, or resumption assumptions.

## Execution-form decision

Choose the smallest form from `agent-work/README.md`:

- `Direct`: a clear, local, reversible task with one observable criterion and no meaningful design, boundary, or recovery need.
- `Planned`: work needing a pre-implementation `plan.md` because acceptance, choices, ordering, structural decisions, or verification are non-obvious.
- `Tracked`: work needing a current `status.md` because it is blocked, interrupted, delegated, parallel, externally dependent, materially uncertain, changing scope, or otherwise unsafe to resume from current files alone.

These are not labels to combine or a risk matrix. Complexity determines whether work is Planned, Policy boundaries determine whether an action may proceed, and recoverability determines whether work is Tracked. A Tracked task may also be Planned; `status.md` remains the sole current-state and evidence ledger.

## Ownership boundaries

Process owns execution-form selection, the smallest goal, acceptance criteria, and verification planning. Observation owns evidence and outcome semantics. Recovery owns failure handling. `agent-work/README.md` owns task-file selection and roles.

## Allowed actions

- Select or revise the execution form from current evidence.
- Define the smallest useful acceptance criteria and verification before changing behavior.
- Reduce a task back to a safe scope when its assumptions no longer hold.

## Forbidden actions

- Do not start editing when the needed execution form or Policy boundary is unresolved.
- Do not silently expand a local task into broad or unrelated work.
- Do not skip verification planning for a changed result.
- Do not treat a task name as a substitute for current evidence, acceptance criteria, or permission.

## Outputs

- Chosen execution form and any task material created.
- Success criteria and expected verification.
- Any Policy boundary, scope change, or user decision needed.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Policy: `{{HARNESS_DIR}}/docs/layers/02-policy.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Task-material decision card: `agent-work/README.md`
