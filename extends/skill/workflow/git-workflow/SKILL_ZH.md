---
name: git-workflow
description: "Git workflow. Triggers: git workflow, commit, create PR, merge, git流程, 提交代码, 创建PR, 合并分支."
metadata:
  author: jereh
  version: "1.0.0"
---

# git-workflow

自包含的 Git 研发工作流，涵盖从创建分支到合并的完整阶段。

## 触发词

- git workflow
- commit
- create PR
- merge
- git流程
- 提交代码
- 创建PR
- 合并分支

## 分支策略

| 分支                    | 用途                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `main`                  | 生产就绪代码，仅通过 PR 合并。                                                          |
| `dev`                   | 日常开发集成分支。                                                                      |
| `test`                  | QA / 预发布稳定分支。                                                                   |
| `feat/{user}-<feature>` | 新功能分支，从 `dev` 切出。`{user}` 默认取 `git config user.name`。                     |
| `fix/{user}-<bug>`      | 缺陷修复分支，从 `dev`、`test` 或 `main` 切出。`{user}` 默认取 `git config user.name`。 |

## 流程概览

```text
  dev
   |
   |-- feat/{user}-x
   |       |
   |       v
   |   检查分支：禁止在 dev/test/main 上提交
   |       |
   |       v
   |   查看 git diff
   |       |
   |       v
   |   向用户展示：分支 + diff + 提交信息
   |       |
   |       v
   |   用户确认范围
   |       |
   |       v
   |   提交  -->  推送  -->  创建 PR 到 dev
   |                             |
   |                             v
   |                       审查与 CI
   |                       （含 git diff 代码审查）
   |                             |
   |                       +-----+-----+
   |                       |           |
   |                      失败        通过
   |                       |           |
   |                       v           v
   |                      修复      合并到 dev
   |                       |           |
   |                       +-----> 删除分支
   |
   v
 dev -> test -> main


  main
   |
   |-- fix/{user}-x  -->  创建 PR 到 main  -->  合并  -->  cherry-pick 到 dev/test
```

## 工作流阶段

1. [Branch](phases/branch.md) — 创建功能或修复分支。
2. [Commit](phases/commit.md) — 使用规范格式提交代码。
3. [PR](phases/pr.md) — 创建包含测试计划与审查的 Pull Request。
4. [Merge](phases/merge.md) — 在审查通过且检查通过后合并。

## 热修复流程

针对生产环境关键缺陷：

1. 从最新 `main` 切出 `fix/{user}-<bug>`。
2. 创建目标分支为 `main` 的 PR。
3. 合并后，将修复 cherry-pick 回 `dev`（若 `test` 分支活跃也同步回 `test`）。

## 全局规则

- 始终保持 `main` 和 `test` 稳定。
- `feat/{user}-*` 和 `fix/{user}-*` 分支必须短周期存在。
- 所有合并到 `dev`、`test`、`main` 的操作都必须通过 PR。
- 若目标分支已前进，在创建 PR 前先 rebase 当前分支。
- **禁止直接在 `dev`、`test`、`main` 上提交或推送。** 必须使用功能或修复分支。
- **未经用户确认不得提交或推送。** 必须先展示当前分支、diff 与建议的提交信息。
- 已推送到远端的提交避免 amend 或 force-push；如需变更，使用追加提交。
- 权威规范见项目内的 CONTRIBUTING.md，本 skill 在此基础上展开各阶段步骤。
