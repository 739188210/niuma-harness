---
description: 总结当前未提交改动，生成改动摘要、风险点、测试建议和 commit/MR 文案草稿
argument-hint: ""
---

请分析当前仓库的未提交改动，并生成适合提交或创建 MR 的中文摘要。

## 执行步骤

1. 确认当前是否在 Git 仓库：
   `git rev-parse --show-toplevel`
   - 如果不是 Git 仓库，停止并说明。

2. 查看当前分支：
   `git branch --show-current`

3. 查看工作区状态：
   `git status --short`

4. 查看改动统计：
   `git diff --stat`
   `git diff --cached --stat`

5. 查看具体改动：
   `git diff`
   `git diff --cached`
   - 如果 diff 很大，先用 `git diff --name-only` 和 `git diff --cached --name-only` 分批阅读关键文件。

6. 检查未跟踪文件，避免遗漏新文件：
   `git ls-files --others --exclude-standard`
   - 如果存在未跟踪文件，先列出文件名。
   - 在文件数量和大小可控时，读取关键未跟踪文件内容并纳入摘要。
   - 不要读取明显的二进制文件、构建产物、依赖目录或大文件。

7. 查看最近提交，帮助判断上下文：
   `git log --oneline -5`

## 输出要求

请输出：

- 当前分支
- 改动文件列表
- 改动摘要
- 可能的风险点
- 建议验证方式
- 建议 commit message，使用格式：`<type>: <description>`
- MR 描述草稿，包含：Summary、Changes、Test Plan、Risk

## 安全约束

- 只读分析，不要修改文件。
- 不要执行 `git add`、`git commit`、`git push`。
- 不要创建 MR，除非用户另外明确要求。
- 如果发现疑似 secret、token、密码或私钥，立即标红提醒，不要在输出里完整复述敏感值。
