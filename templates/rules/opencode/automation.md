# OpenCode Automation Rules

## Purpose

These rules define OpenCode-specific automation guidance. They supplement the selected process playbook; use `docs/policy/action-boundary.md` for permission boundaries.

## Configuration

OpenCode configuration may include provider, agent, shell, MCP, LSP, permission, and additional instruction-file settings. Keep project-specific automation explicit, reviewable, and reversible.

The `opencode.json.instructions` field is an array of file paths, glob patterns, or URLs, not inline instruction text. Niuma adds exact paths for selected canonical files under `{{HARNESS_DIR}}/docs/rules/`; OpenCode loads them alongside the project `AGENTS.md`. Preserve user instruction sources and unrelated configuration fields.

Do not store credentials or private endpoints in generated harness docs or task notes. Use the runtime's supported secret management pattern.

## Permissions

Use OpenCode permission and auto-approval mechanisms cautiously:

- Prefer prompting for writes, shell commands, network access, and external side effects unless the action is clearly safe and task-scoped.
- Avoid session-wide auto-approval for exploratory, security-sensitive, external, or destructive work.
- Do not loosen tool permissions to bypass `docs/policy/action-boundary.md`.

## Task tracking

When OpenCode has no dedicated task-list mechanism, use `agent-work/tasks/<task-name>/` as the task-local ledger for multi-step, risky, parallel, or interruptible work.
