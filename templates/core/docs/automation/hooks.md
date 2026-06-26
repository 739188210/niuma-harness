# Automation and Hook Intent

This MVP does not install tool-specific hooks automatically.

Use this document to describe automation you may want to map to Claude Code hooks, Codex hooks, opencode plugins, Git hooks, or CI jobs.

| Intent | Trigger | Suggested command | Status |
|---|---|---|---|
| Format changed files | after file edit | `<fill command>` | planned |
| Run focused tests | before completion | `<fill command>` | planned |
| Check secrets | before commit or release | `<fill command>` | planned |
| Verify build | before release | `<fill command>` | planned |

## Maintenance

Keep actual hook configuration in the relevant tool-specific location. Keep this file as the shared source for automation intent.
