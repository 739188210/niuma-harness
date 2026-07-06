# Codex Automation Rules

## Purpose

These rules define Codex CLI-specific automation guidance. They supplement the selected process playbook; use `docs/policy/action-boundary.md` for permission boundaries.

## Project instructions

Codex reads project instructions from `AGENTS.md` files. Keep the generated harness entry intact and put durable project facts in `docs/project-context.md` instead of duplicating them in automation config.

## Sandbox and approvals

Use Codex sandbox and approval settings to keep work bounded:

- Prefer workspace-scoped write access for implementation work.
- Use read-only modes for review or investigation when edits are not needed.
- Treat network access as a separate approval boundary.
- Do not loosen approval policy to bypass `docs/policy/action-boundary.md`.

## Configuration

Codex configuration may live in files such as `~/.codex/config.toml`, depending on the runtime. Keep project-specific automation explicit, reviewable, and reversible.

## Task tracking

When Codex has no dedicated task-list mechanism, use `agent-work/tasks/<task-name>/` as the task-local ledger for multi-step, risky, parallel, or interruptible work.
