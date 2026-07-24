# Policy Layer Memo

## Purpose

Define how AI agents check operating boundaries before acting.

This memo is the Policy protocol. It does not duplicate concrete permission categories. Use `{{HARNESS_DIR}}/docs/policy/action-boundary.md` as the single source of truth for action boundaries.

## When to use

Use this layer before making changes, before running commands with side effects, before network or external-service actions, before adding dependencies, before changing tests, and whenever a task touches security, data, public APIs, deployment, or git history.

## Agent protocol

1. Classify the intended action with `{{HARNESS_DIR}}/docs/policy/action-boundary.md` before acting. For trivial read-only actions, recognizing the action as autonomous is enough.
2. Use `{{HARNESS_DIR}}/docs/policy/untrusted-content.md` when task inputs include fetched, pasted, generated, or otherwise untrusted content.
3. Continue independently only for autonomous, reversible, task-scoped work.
4. Ask the user before ask-first actions.
5. Stop instead of acting when the next step is forbidden, unsafe, or unclear in a way that affects behavior, data, security, or user-owned work.
6. Record unresolved approval blockers and policy risks in `agent-work/` for multi-step tasks.
7. For non-trivial tasks, give planned and performed actions stable IDs, classifications, and scopes in `harness-feedback.md`; link performed ask-first actions to exact scoped authorization records, record explicit-request exceptions and stop-blocker resolutions, and record scope changes explicitly.

When host tools or higher-priority instructions are stricter than this policy, follow the stricter requirement.

## Blocker ownership

Approval blockers and policy risks are task-local state until resolved. Do not act through unresolved ask-first or stop-and-escalate blockers.

## Forbidden actions

- Do not duplicate the full action boundary list in this memo, process playbooks, or rules.
- Do not choose the more permissive interpretation when policy sources conflict.
- Do not treat an explicit request as blanket approval beyond the named action and scope.

## Outputs

- The action category used for the task.
- Any approval points that must be resolved before action.
- Any forbidden or out-of-scope actions avoided.
- Policy risks to include in the final report.

## Links to other layers

- Context: `{{HARNESS_DIR}}/docs/layers/01-context.md`
- Process: `{{HARNESS_DIR}}/docs/layers/03-process.md`
- Observation: `{{HARNESS_DIR}}/docs/layers/04-observation.md`
- Recovery: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`
- Action boundaries: `{{HARNESS_DIR}}/docs/policy/action-boundary.md`
- Untrusted content: `{{HARNESS_DIR}}/docs/policy/untrusted-content.md`
- Secret leak response: `{{HARNESS_DIR}}/docs/policy/secret-leak.md`
- Rules: the selected agent's native rule surface
