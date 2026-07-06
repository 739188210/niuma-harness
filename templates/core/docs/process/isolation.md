# Workspace Isolation Process

Use this playbook when working in the shared workspace would create avoidable risk or coordination cost. Isolation keeps one task's in-progress changes from polluting another's and makes rollback safe.

This is a concrete playbook selected by the Process layer. Use `docs/layers/03-process.md` for routing and this file for isolation execution.

## Goal

Create a separate, reversible workspace for work that should not run directly against the shared tree.

## When to isolate

Isolate when shared-tree work would create avoidable risk or coordination cost, such as:

- Multi-step feature or refactor with intermediate broken states.
- Risky change (security, data, public API, migration, release, generated output) where rollback must be clean.
- Parallel tasks, multiple agents, or multiple CLI sessions editing the same repo.
- Experimental work that may be discarded.
- Overlap with another active task in the shared tree.
- A change footprint large enough that rollback or review would be materially harder in the shared tree.

Do not isolate merely because a task has more than one step. Isolation has setup and cleanup cost; use it when it materially reduces risk or coordination cost.

## Steps

1. Confirm the target is a git repository. If not, ask the user before proceeding.
2. Confirm the intended worktree action satisfies `docs/policy/action-boundary.md` local worktree isolation rules.
3. If the host tool or higher-priority instructions require explicit user approval for worktree creation, stop and ask instead of running git worktree commands.
4. Create a worktree on a newly created local task branch: `git worktree add <path> -b <branch>`.
5. Work entirely inside the worktree for this task. Do not edit the shared tree while isolated.
6. Run verification (tests, build) inside the worktree before considering the task done.

## Boundaries

- Isolation protects the working directory, not the final merge. Shared files (schema, migrations, lockfiles, public modules) can still conflict at merge time — surface that risk.
- Do not push, set upstream tracking, create merge requests, touch remotes, delete the worktree, or delete branches unless the user explicitly asks.
- The shared working tree does not need to be clean before isolation, but isolation must not stage, revert, overwrite, clean, or otherwise modify shared-tree files.
- Copying local-only config or using credentials is not part of worktree creation; classify those actions separately through Policy.
- Reverting inside a worktree is still a repair attempt — re-run Observation afterward.

## Recovery

If worktree setup fails (path conflict, branch exists, git metadata failure, or invalid isolation path), do not force it. Resolve the specific blocker or fall back to task-scoped work in the shared tree. Use `docs/layers/05-recovery.md` for general failure handling.

## Cleanup

When the task is accepted, report the worktree path, branch, and base branch, and ask whether to keep, merge, or remove it. Do not silently leave worktrees or branches behind.

## Outputs

- Worktree path and branch name.
- Base branch the work was started from.
- Verification evidence from inside the worktree.
- Cleanup decision (kept / merged / removed) and follow-up.
