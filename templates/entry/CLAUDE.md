# Claude Code Entry

This workspace uses a Niuma Harness.

## Task entry

For task work, start from the runtime map:

1. Read `{{HARNESS_DIR}}/docs/index.md`.
2. Use `{{HARNESS_DIR}}/docs/project-context.md` for stable project facts.
3. Follow the operating protocols in `{{HARNESS_DIR}}/docs/layers/`.
4. Use `{{HARNESS_DIR}}/docs/process/` for concrete task playbooks.
5. Use `{{HARNESS_DIR}}/docs/rules/` for engineering standards when rule files are installed.
6. Record multi-step task state in the workspace-level `agent-work/` directory.

If project context is incomplete, inspect the current workspace before acting. Do not guess missing facts.

## Harness guide

Read `{{HARNESS_DIR}}/HARNESS_GUIDE.md` when setting up, maintaining, or explaining the harness structure. For normal task execution, treat `{{HARNESS_DIR}}/docs/index.md` as the entry point.
