---
description: 仅提交 IDEA 默认 Change List 的文件，推送当前分支，并向 fat_saas 发起或复用 GitLab 合并请求
argument-hint: [commit-message]
---

默认测试环境目标分支：`fat_saas`。

`$ARGUMENTS` 只能作为本次 commit message 的候选文本；不得把它拼接进 shell 命令、分支名或文件路径。若为空，先向用户索取 commit message。MR 标题默认使用已确认的 commit message；MR 描述必须先展示并获得确认。

此命令只允许提交 IntelliJ IDEA 默认 Change List（配置中 `default="true"`）关联、且同时存在于当前 Git 状态的文件。绝不使用 `git add .`、无路径的 `git add -A` 或任何“提交全部改动”的替代做法。

## 1. 只读本地预检

依次运行并记录结果：

```bash
git rev-parse --show-toplevel
git branch --show-current
git remote get-url origin
git status --porcelain=v1 -z
git diff --cached --quiet
git diff --cached --name-only
```

规则：

- 不在 Git 仓库、detached HEAD、当前分支为空，或当前分支是 `fat_saas` 时停止。
- `origin` 不存在时停止；不要猜测其他 remote。
- 若暂存区不为空，停止。不要混入、清空、重置或提交已有暂存内容。
- 只读检查期间不执行 fetch、push、commit、stash、merge、reset 或 `glab` 写操作。

## 2. 获取 IDEA 默认 Change List 文件集

1. 读取项目根目录的 `.idea/workspace.xml`，仅解析 `ChangeListManager` 中带 `default="true"` 的 list。
2. 从每个 `<change>` 取工作区内的 `afterPath`；若文件被删除则取 `beforePath`。将 `$PROJECT_DIR$/` 转为仓库根的相对路径。
3. 拒绝绝对路径、空路径、包含 `..`、NUL、换行、以 `-` 开头或指向 `.git/` 的路径。
4. 将该文件集与 `git status --porcelain=v1 -z` 的路径集合逐一交叉校验：每个候选文件都必须是当前未暂存改动或未跟踪文件。

以下任一情况都停止并要求用户直接提供要提交的仓库相对路径清单；不得退化为提交全部本地改动：

- `.idea/workspace.xml` 不存在、不能解析、没有唯一默认 list，或默认 list 为空。
- XML 中的路径无法安全归一化。
- 默认 list 的任一文件不在当前 Git 状态中，或 Git 状态中的重命名/删除关系无法准确映射。
- 默认 list 以外的改动被误包含进候选集合。

展示并等待用户确认：默认 Change List 的精确文件清单、每个文件的 Git 状态、文件数、以及其他未提交但不会提交的文件数。

## 3. 本地验证与提交计划

在用户确认候选文件集后，按 `/dev-check` 的规则运行当前项目可识别的本地检查。检查失败、被跳过或存在关键未知项时，停止；不要创建 commit。

生成并展示提交计划：

- 当前源分支与远端 `origin`
- 目标分支 `fat_saas`
- 精确暂存文件清单
- 已确认的 commit message
- 验证命令与结果
- MR 标题和草拟描述

随后请求一次明确确认，确认范围必须包含：定向暂存、commit、push、GitLab 查询及创建 MR。未确认不得执行任何写操作或网络操作。

## 4. 确认后执行

1. 再次运行 `git status --porcelain=v1 -z` 和 `git diff --cached --quiet`。若候选集合或暂存区状态发生变化，停止并重新确认。
2. 仅对已确认的安全相对路径执行定向暂存。可使用 `git add -A -- <已确认文件列表>`；不得省略 `--`，不得包含候选集以外的路径。
3. 用已确认的 message 执行 `git commit -m "$commit_message"`。
4. 执行 `git push -u origin HEAD`。失败时停止，不 force push。
5. 确认 `glab` 已对当前 GitLab host 登录；认证失败时停止，不要求用户在聊天中粘贴 token。
6. 查询是否已有从当前分支到 `fat_saas` 的开放 MR。若已有，展示链接并停止，不重复创建。
7. 若不存在，使用已确认的标题与描述创建 MR，source 为当前分支、target 为 `fat_saas`。不要自动合并、批准、添加 reviewer、添加标签或触发部署。

## 5. 汇报

报告：

- 实际暂存并提交的文件
- commit SHA 和当前远端分支
- 本地验证结果
- MR 链接，或已存在 MR 的链接
- 未提交且保持不变的其他 Change List 文件
- 任何失败、跳过项或剩余未知项

## 安全约束

- 默认目标只能是 `fat_saas`；需要其他目标分支时，先询问用户。
- 不自动提交 IDEA 非默认 Change List、未关联文件、已有暂存内容或整个工作区。
- 不修改 `.idea/workspace.xml`。
- 不执行 stash、merge、rebase、reset、force push、删除分支或自动合并 MR。
- Git commit、push 和 GitLab MR 创建均必须在第 3 步明确确认后执行。
