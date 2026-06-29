---
description: 查看当前仓库的分支、upstream、本地改动、远程地址和最近提交，并给出下一步建议
argument-hint: ""
---

请检查当前 Git 仓库状态，并用简洁中文汇总。

## 执行步骤

1. 确认当前目录是否是 Git 仓库：
   `git rev-parse --show-toplevel`
   - 如果不是 Git 仓库，停止并说明。

2. 获取当前分支：
   `git branch --show-current`
   - 如果为空，说明当前处于 detached HEAD。

3. 查看工作区状态：
   `git status --short`

4. 查看当前分支 upstream：
   `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
   - 如果失败，说明当前分支没有 upstream。

5. 如果存在 upstream，查看领先/落后数量：
   `git rev-list --left-right --count @{u}...HEAD`

6. 查看远程地址：
   `git remote -v`

7. 查看最近提交：
   `git log --oneline -5`

## 输出要求

请汇总：

- 仓库根目录
- 当前分支
- upstream 状态
- 本地是否领先/落后远程
- 工作区是否有未提交改动
- 远程地址
- 最近 5 个 commit
- 下一步建议

## 安全约束

- 只读检查，不要修改文件。
- 不要执行 `git pull`、`git push`、`git merge`、`git stash`、`git reset`、`git clean`。
