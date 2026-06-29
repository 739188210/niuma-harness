---
description: 确保当前分支有 upstream，自动暂存本地改动，然后将指定远端分支合并到当前分支
argument-hint: [source-branch]
---

目标源分支：

- 如果 `$ARGUMENTS` 为空，使用 `fat`
- 否则使用 `$ARGUMENTS`

请按以下流程执行。

## 1. 检查当前分支

运行：

`git branch --show-current`

规则：

- 如果当前不是 Git 仓库，停止。
- 如果当前分支为空，说明处于 detached HEAD，停止。
- 如果当前分支等于目标源分支，停止，避免把分支合并到自己。

## 2. 确认 origin 存在

运行：

`git remote get-url origin`

规则：

- 如果没有 `origin`，停止。
- 不要猜测其他 remote。

## 3. 检查当前分支是否有 upstream

运行：

`git rev-parse --abbrev-ref --symbolic-full-name @{u}`

规则：

- 如果命令成功，说明当前分支已有 upstream，继续。
- 如果命令失败，说明当前分支没有 upstream。
  - 运行：`git push -u origin HEAD`
  - 如果 push 失败，停止并展示错误。
  - push 成功后继续。

## 4. 保护本地未提交改动

运行：

`git status --short`

规则：

- 如果输出为空，说明工作区干净，不创建 stash。
- 如果输出不为空，先设置源分支变量并生成时间戳：
  `source_branch="<source-branch>"`
  `timestamp=$(date +"%Y%m%d-%H%M")`
- 然后运行：
  `git stash push -u -m "claude-auto-stash-before-sync-${source_branch}-${timestamp}"`
- 记录本次是否创建了 stash，并记录生成的 stash message。

## 5. 拉取远程信息

运行：

`git fetch origin`

规则：

- 如果失败，停止。

## 6. 确认目标源分支存在

运行：

`git show-ref --verify --quiet refs/remotes/origin/<source-branch>`

规则：

- 如果不存在，停止并提示 `origin/<source-branch>` 不存在。

## 7. 更新当前分支到自己的 upstream

运行：

`git merge --ff-only @{u}`

规则：

- 如果成功，继续。
- 如果失败，停止。
- 如果之前创建了 stash，不要删除 stash，提示用户可通过 `git stash list` 查看。

## 8. 合并目标源分支到当前分支

运行：

`git merge --no-ff --no-edit origin/<source-branch>`

规则：

- 如果合并成功，继续。
- 如果发生冲突，停止。
- 列出冲突文件：
  `git diff --name-only --diff-filter=U`
- 不要自动解决冲突。
- 不要执行 `git stash pop`，避免把本地改动冲突叠加到 merge 冲突上。
- 提醒用户先解决 merge 冲突。

## 9. 恢复本地未提交改动

仅当第 4 步创建过 stash，并且第 8 步 merge 成功时，运行：

`git stash pop`

规则：

- 如果成功，继续。
- 如果发生冲突，停止。
- 列出冲突文件：
  `git diff --name-only --diff-filter=U`
- 提醒用户这是恢复本地改动时产生的冲突。

## 10. 汇报结果

最后汇报：

- 当前分支
- 当前分支是否新建了远程 upstream
- 合并来源：`origin/<source-branch>`
- 是否创建并恢复了 stash
- 是否成功
- 是否有冲突
- 下一步建议

## 安全约束

- 可以在当前分支没有 upstream 时执行：`git push -u origin HEAD`
- 不要自动 push 合并后的结果。
- 不要自动 commit。
- 不要自动解决冲突。
- 不要自动删除未成功 pop 的 stash。
- 不要自动删除分支。
- 如果任一步失败，停止并报告原因。
