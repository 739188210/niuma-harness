---
description: 检查当前分支同步条件，确认后暂存本地改动，并将指定远端分支合并到当前分支
argument-hint: [source-branch]
---

目标源分支：

- 如果 `$ARGUMENTS` 为空，使用 `fat`
- 否则使用 `$ARGUMENTS`

请按以下流程执行。先完成本地只读检查并向用户说明将发生的 Git 网络/写操作；只有用户明确确认后，才能执行 fetch、push、stash、merge 或 stash pop。

## 1. 校验目标源分支参数

先把目标源分支保存到变量，并只允许安全的远端分支名字符集：

```bash
source_branch="<source-branch>"
case "$source_branch" in
  ""|-*|*[	\ ;\&\|\`\$\(\)\<\>\'\"\{\}\[\]\!]* )
    echo "Invalid source branch: $source_branch"
    exit 1
    ;;
esac
git check-ref-format --branch "$source_branch"
```

规则：

- 如果目标源分支为空，停止。
- 如果目标源分支以 `-` 开头，停止。
- 如果目标源分支包含空白或 shell 元字符，停止。
- 如果 `git check-ref-format --branch "$source_branch"` 失败，停止。
- 后续所有命令都只能使用已校验的 `"$source_branch"` 变量，不要把原始 `$ARGUMENTS` 直接拼进 shell 命令。

## 2. 检查当前分支

运行：

`git branch --show-current`

规则：

- 如果当前不是 Git 仓库，停止。
- 如果当前分支为空，说明处于 detached HEAD，停止。
- 如果当前分支等于目标源分支，停止，避免把分支合并到自己。

## 3. 确认 origin 配置存在

运行：

`git remote get-url origin`

规则：

- 如果没有 `origin`，停止。
- 不要猜测其他 remote。
- 这里只检查本地 Git 配置，不要连接远端。

## 4. 检查当前分支是否有 upstream

运行：

`git rev-parse --abbrev-ref --symbolic-full-name @{u}`

规则：

- 如果命令成功，记录当前分支已有 upstream。
- 如果命令失败，记录当前分支需要创建 upstream。
- 不要立即运行 `git push -u origin HEAD`。

## 5. 检查本地未提交改动

运行：

`git status --short`

规则：

- 如果输出为空，记录工作区干净，不需要 stash。
- 如果输出不为空，记录工作区有本地改动，后续需要创建 stash。
- 不要立即运行 `git stash`。

## 6. 请求用户确认 Git 网络/写操作

在执行任何网络或写操作前，先汇总将要执行的操作，并请求用户明确确认。

可能的网络/写操作包括：

- 拉取远程信息：`git fetch origin`
- 当前分支没有 upstream 时：`git push -u origin HEAD`
- 工作区有本地改动时：`git stash push -u -m "niuma-harness-auto-stash-before-sync-${source_branch}-<timestamp>"`
- 更新当前分支到 upstream：`git merge --ff-only @{u}`
- 合并目标源分支：`git merge --no-ff --no-edit "origin/${source_branch}"`
- 如果创建了 stash 且 merge 成功：`git stash pop`

规则：

- 如果用户没有明确确认，停止，不执行任何 Git 网络或写操作。
- 如果用户只确认部分操作，按用户确认的边界执行；未确认的网络/写操作不要执行。
- 确认后继续下面步骤。

## 7. 拉取远程信息

仅当用户已确认远程网络/写操作时，运行：

`git fetch origin`

规则：

- 如果失败，停止。

## 8. 确认目标源分支存在

在 fetch 成功后运行：

`git show-ref --verify --quiet "refs/remotes/origin/${source_branch}"`

规则：

- 如果不存在，停止并提示 `origin/${source_branch}` 不存在。

## 9. 必要时创建 upstream

仅当第 4 步发现当前分支没有 upstream，且用户已确认远端写操作时，运行：

`git push -u origin HEAD`

规则：

- 如果 push 失败，停止并展示错误。
- push 成功后继续。

## 10. 必要时保护本地未提交改动

仅当第 5 步发现工作区有本地改动，且用户已确认创建 stash 时，生成时间戳：

`timestamp=$(date +"%Y%m%d-%H%M")`

然后运行：

`git stash push -u -m "niuma-harness-auto-stash-before-sync-${source_branch}-${timestamp}"`

规则：

- 如果 stash 失败，停止并展示错误。
- 记录本次创建的 stash message。

## 11. 更新当前分支到自己的 upstream

仅当用户已确认本地 merge 操作时，运行：

`git merge --ff-only @{u}`

规则：

- 如果成功，继续。
- 如果失败，停止。
- 如果之前创建了 stash，不要删除 stash，提示用户可通过 `git stash list` 查看。

## 12. 合并目标源分支到当前分支

仅当用户已确认本地 merge 操作时，运行：

`git merge --no-ff --no-edit "origin/${source_branch}"`

规则：

- 如果合并成功，继续。
- 如果发生冲突，停止。
- 列出冲突文件：
  `git diff --name-only --diff-filter=U`
- 不要自动解决冲突。
- 不要执行 `git stash pop`，避免把本地改动冲突叠加到 merge 冲突上。
- 提醒用户先解决 merge 冲突。

## 13. 恢复本地未提交改动

仅当第 10 步创建过 stash、第 12 步 merge 成功、且用户已确认恢复 stash 时，运行：

`git stash pop`

规则：

- 如果成功，继续。
- 如果发生冲突，停止。
- 列出冲突文件：
  `git diff --name-only --diff-filter=U`
- 提醒用户这是恢复本地改动时产生的冲突。

## 14. 汇报结果

最后汇报：

- 当前分支
- 当前分支是否新建了远程 upstream
- 合并来源：`origin/${source_branch}`
- 是否创建并恢复了 stash
- 是否成功
- 是否有冲突
- 下一步建议

## 安全约束

- 可以在用户明确确认后执行：`git fetch origin`。
- 可以在用户明确确认后执行：`git push -u origin HEAD`。
- 不要自动 push 合并后的结果。
- 不要自动 commit。
- 不要自动解决冲突。
- 不要自动删除未成功 pop 的 stash。
- 不要自动删除分支。
- 如果任一步失败，停止并报告原因。
