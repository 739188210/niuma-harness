# Workspace Isolation Process

Use this playbook to isolate multi-step, risky, or parallel work before it touches the shared workspace. Isolation keeps one task's in-progress changes from polluting another's and makes rollback safe.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process/memo.md` for routing and this file for isolation execution.

## Goal

Create a separate, reversible workspace for work that should not run directly against the shared tree.

## When to isolate

Isolate when any hold:

- Multi-step feature or refactor with intermediate broken states.
- Risky change (security, data, public API, migration) where rollback must be clean.
- Parallel tasks, multiple agents, or multiple CLI sessions editing the same repo.
- Experimental work that may be discarded.

Do not isolate for trivial single-step tasks. Isolation has setup and cleanup cost; use it when the work warrants it.

## Steps

1. Confirm the target is a git repository. If not, ask the user before proceeding.
2. Surface any uncommitted changes in the shared tree before isolating; do not hide them.
3. Create a worktree on a new branch: `git worktree add <path> -b <branch>`.
4. Work entirely inside the worktree for this task. Do not edit the shared tree while isolated.
5. Run verification (tests, build) inside the worktree before considering the task done.

## Boundaries

- Isolation protects the working directory, not the final merge. Shared files (schema, migrations, lockfiles, public modules) can still conflict at merge time — surface that risk.
- Do not push, create merge requests, delete the worktree, or delete branches unless the user explicitly asks.
- Reverting inside a worktree is still a repair attempt — re-run Observation afterward.

## Recovery

If worktree setup fails (path conflict, branch exists, dirty tree), do not force it. Resolve the specific blocker or fall back to task-scoped commits in the shared tree. Use `docs/layers/05-recovery/memo.md` for general failure handling.

## Cleanup

When the task is accepted, report the worktree path, branch, and base branch, and ask whether to keep, merge, or remove it. Do not silently leave worktrees or branches behind.

## Outputs

- Worktree path and branch name.
- Base branch the work was started from.
- Verification evidence from inside the worktree.
- Cleanup decision (kept / merged / removed) and follow-up.
