# Automation and Hook Intent

This file records automation intent that has been verified or intentionally adopted for this project.

This MVP does not install tool-specific hooks automatically. Actual hook configuration belongs in the relevant tool, CI system, or repository settings. This file is the shared record of what automation should exist and why.

## Protocol

- Do not invent commands.
- Only record commands after verifying they exist in the current workspace.
- Prefer project-local tools and scripts over one-off remote package execution.
- Treat automation as supporting evidence for the Observation layer, not as a replacement for judgment.
- If an automation idea is not verified yet, mark it as `Unknown until verified`.

## Automation intents

| Intent | When to consider | Verified command | Status |
|---|---|---|---|
| Format changed files | After edits when the project has a formatter | Unknown until verified | proposed |
| Run focused tests | Before completion when tests exist for the touched area | Unknown until verified | proposed |
| Check secrets | Before commit, release, or sharing artifacts | Unknown until verified | proposed |
| Verify build | Before release or broad integration changes | Unknown until verified | proposed |

## Links to layers

- Policy: `docs/layers/02-policy/memo.md`
- Observation: `docs/layers/04-observation/memo.md`
- Recovery: `docs/layers/05-recovery/memo.md`

## Maintenance

Update this file when a command is verified, renamed, removed, or replaced. Keep task-specific automation results in the workspace-level `agent-work/` directory; keep durable automation intent here.
