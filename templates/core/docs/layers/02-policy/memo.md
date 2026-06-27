# Policy Layer Memo

## Purpose

Define the operating boundaries for AI agents. This layer says what agents may do independently, what they must not do, and when they must stop for user approval.

## When to use

Use this layer before making changes, before running commands with side effects, before adding dependencies, before changing tests, and whenever a task touches security, data, public APIs, deployment, or git history.

## Agent protocol

1. Classify the requested action as safe, risky, or forbidden.
2. Continue independently only for safe, reversible, task-scoped work.
3. Ask the user before risky, irreversible, outward-facing, or scope-expanding actions.
4. Prefer minimal changes that directly support the task.
5. Report any policy conflict instead of silently choosing the more permissive option.

## Allowed actions

- Read and search files needed for the task.
- Edit files directly related to the approved task.
- Run local read-only checks and project-local verification commands.
- Add task-local notes and verification evidence.
- Suggest policy updates when repeated ambiguity appears.

## Forbidden actions

- Do not delete user work, reset history, commit, push, publish, deploy, or rotate secrets unless explicitly requested.
- Do not introduce new dependencies without approval.
- Do not weaken tests, disable checks, or remove assertions just to pass verification.
- Do not modify authentication, authorization, payment, data migration, or security-sensitive behavior without explicit review.
- Do not store secrets, credentials, tokens, or private user data in project files or task notes.

## Outputs

- A clear statement of whether the task can proceed autonomously.
- Any approval points that must be resolved before action.
- Any forbidden or out-of-scope actions avoided.
- Policy risks to include in the final report.

## Links to other layers

- Context: `docs/layers/01-context/memo.md`
- Process: `docs/layers/03-process/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`
- Rules: `docs/rules/`
