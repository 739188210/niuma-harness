---
name: git-workflow
description: "Git workflow. Triggers: git workflow, commit, create PR, merge, git流程, 提交代码, 创建PR, 合并分支."
metadata:
  author: jereh
  version: "1.0.0"
---

# git-workflow

A self-contained Git workflow for feature development, from branch creation to merge.

## Triggers

- git workflow
- commit
- create PR
- merge
- git流程
- 提交代码
- 创建PR
- 合并分支

## Branch Strategy

| Branch                  | Purpose                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `main`                  | Production-ready code. Only merge via PR.                                                  |
| `dev`                   | Integration branch for daily development.                                                  |
| `test`                  | Stabilization branch for QA / pre-release.                                                 |
| `feat/{user}-<feature>` | New features. Cut from `dev`. `{user}` defaults to `git config user.name`.                 |
| `fix/{user}-<bug>`      | Bug fixes. Cut from `dev`, `test`, or `main`. `{user}` defaults to `git config user.name`. |

## Workflow Overview

```text
  dev
   |
   |-- feat/{user}-x
   |       |
   |       v
   |   check branch (not dev/test/main)
   |       |
   |       v
   |   review git diff
   |       |
   |       v
   |   show user: branch + diff + commit message
   |       |
   |       v
   |   user confirms scope
   |       |
   |       v
   |   commit  -->  push  -->  open PR to dev
   |                             |
   |                             v
   |                       review & CI
   |                       (includes diff review)
   |                             |
   |                       +-----+-----+
   |                       |           |
   |                      fail        pass
   |                       |           |
   |                       v           v
   |                      fix      merge to dev
   |                       |           |
   |                       +-----> delete branch
   |
   v
 dev -> test -> main


  main
   |
   |-- fix/{user}-x  -->  open PR to main  -->  merge  -->  cherry-pick to dev/test
```

## Workflow Phases

1. [Branch](phases/branch.md) — create a feature or fix branch.
2. [Commit](phases/commit.md) — commit changes with conventional messages.
3. [PR](phases/pr.md) — open a pull request with review and test plan.
4. [Merge](phases/merge.md) — merge after approval and checks pass.

## Hotfix Flow

For production-critical fixes:

1. Cut `fix/{user}-<bug>` from the latest `main`.
2. Open a PR targeting `main`.
3. After merge, cherry-pick the fix back to `dev` (and `test` if active).

## Global Rules

- Keep `main` and `test` stable at all times.
- `feat/{user}-*` and `fix/{user}-*` branches must be short-lived.
- All merges to `dev`, `test`, and `main` go through a PR.
- Rebase your branch before opening a PR if the target branch has moved forward.
- **Never commit or push directly to `dev`, `test`, or `main`.** Always use a feature or fix branch.
- **Do not commit or push without user confirmation.** Always show the current branch, the diff, and the proposed commit message first.
- Avoid amending or force-pushing commits that have already been pushed to the remote; prefer follow-up commits if changes are needed.
- See the project's CONTRIBUTING.md for the canonical rules; this skill expands on them with step-by-step phases.
