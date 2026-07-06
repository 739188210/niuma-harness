# OpenCode Automation Rules

## Purpose

These rules define OpenCode-specific automation guidance. They supplement the selected process playbook; use `docs/policy/action-boundary.md` for permission boundaries.

## Configuration

OpenCode configuration may include provider, agent, shell, MCP, LSP, and permission settings. Keep project-specific automation explicit, reviewable, and reversible.

Do not store credentials or private endpoints in generated harness docs or task notes. Use the runtime's supported secret management pattern.

## Permissions

Use OpenCode permission and auto-approval mechanisms cautiously:

- Prefer prompting for writes, shell commands, network access, and external side effects unless the action is clearly safe and task-scoped.
- Avoid session-wide auto-approval for exploratory, security-sensitive, external, or destructive work.
- Do not loosen tool permissions to bypass `docs/policy/action-boundary.md`.

## Task tracking

When OpenCode has no dedicated task-list mechanism, use `agent-work/tasks/<task-name>/` as the task-local ledger for multi-step, risky, parallel, or interruptible work.
