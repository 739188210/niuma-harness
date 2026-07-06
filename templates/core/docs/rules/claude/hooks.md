# Claude Code Hooks Rules

## Purpose

These rules define Claude Code-specific automation guidance. They supplement the selected process playbook; use `docs/policy/action-boundary.md` for permission boundaries.

## Hook types

Claude Code hooks can be configured for lifecycle events such as:

- **PreToolUse**: validate or block risky tool calls before execution.
- **PostToolUse**: run formatters, linters, checks, or evidence capture after tool execution.
- **Stop**: run final verification or remind the agent to report skipped checks and remaining unknowns.
- **SessionStart** and **UserPromptSubmit**: load context or validate prompts when needed.

## Configuration

Configure project or user hooks through the Claude Code settings files supported by the current runtime, such as `.claude/settings.json` or user-level settings.

Prefer narrow, project-local automation over broad global hooks. Do not use hooks to bypass Policy, hide failures, or weaken verification.

## Permissions

Use auto-accept permissions cautiously:

- Enable only for trusted, well-defined commands or tools.
- Prefer narrow allowlists over unrestricted permissions.
- Disable broad auto-accept behavior for exploratory, security-sensitive, external, or destructive work.

## Task tracking

Use Claude Code task tracking for multi-step, risky, parallel, or interruptible work. Keep visible task state consistent with the current stage, blockers, and verification evidence.
