---
name: review-workflow
description: "Jereh PR 代码审查。触发词：code review, review code, PR review, 代码审查, 代码评审, review."
metadata:
  author: jereh
  version: "2.0.0"
  argument-hint: <file-or-pattern-or-diff>
---

# review-workflow

针对 **Jereh 项目特化** 的代码审查 skill。在 PR 阶段被 `git-workflow phases/pr.md` 调用，或用户直接要求审查文件 / diff / PR 时使用。

权威英文版：[SKILL.md](./SKILL.md)。本文件为中文摘要，规则冲突以 SKILL.md 为准。

## 参数

接受文件路径、glob、diff 或 PR 链接 / 描述。未给出时询问一次。

## 流程

1. 确定审查范围（文件 + 变更行）。
2. 走 **Jereh 清单**（模块边界、Server 装配、前端、Spec & codegen、跟踪 & 文档）。
3. 走 **通用清单**（安全、正确性、性能、测试）—— 仅当 Jereh 清单通过后深入。
4. 按 Finding 格式输出。若无问题，输出 `No issues found.`

## Finding 格式

每条单独一行：

```text
file:line: [LEVEL] message
```

等级：

- **CRITICAL** — 阻塞合并：安全、泄漏密钥、生产风险、严重正确性 bug。
- **HIGH** — 应阻塞合并：显著缺陷、违反 Jereh 约定。
- **MEDIUM** — 可行就修：明显风险或维护性问题。
- **LOW** — 可选改进、风格小问题。

## Jereh 清单

详见英文 [SKILL.md](./SKILL.md) `## Jereh Checklist`。要点：

- `{name}-api` 不依赖持久化 / controller；`{name}-domain` 不导入 sibling controller / client / ui。
- `{name}-controller` 只调 `{name}-api` UseCase 接口；跨域只走另一域的 `{name}-api`。
- MapStruct 转换；单表 CRUD 用 Spring Data JDBC；复杂查询用 MyBatis Dynamic SQL；禁止 SQL 字符串拼接。
- `@Cacheable` / `@CacheEvict` 只放在 domain service。
- 启动类纯 `@SpringBootApplication`；`application.yml` 不控制 autoconfigure；server 不直接 gradle 依赖 `{name}-api / {name}-client / {name}-ui`。
- `{name}-ui` 只依赖 `{name}-client`；无手写 fetch / hardcode URL。
- 不手改 `gen/` 目录；Flyway forward-only `V{n}__{verb}_{noun}.sql`。
- PRD.md Execution Tracking、TEST.md Notes、README.md 与代码一致。

## 通用清单

安全：无 secret、输入校验、注入防护、密码学正确、依赖可信。
正确性：契合 PRD/DESIGN、边界 / 错误路径覆盖、命名清晰、注释解释 why。
性能：复杂度合理、查询有索引、I/O 批处理、资源关闭。
测试：新逻辑有正确层级测试（见 `dev-workflow phase 4`）；happy + 至少一个错误路径。

## 输出

1. `## Findings`：逐行 Finding，无则 `No issues found.`
2. `## Severity Summary`：CRITICAL / HIGH / MEDIUM / LOW 计数表。
3. `## Recommendation`：`Block` / `Approve with conditions` / `Approve`。
   - 有 CRITICAL → Block。
   - 有 HIGH → Approve with conditions（多条不相关 HIGH 时为 Block）。
   - 仅 MEDIUM / LOW → Approve。

## 退出条件

- 每个变更文件已审查。
- Findings 格式一致；每条引用具体 `file:line`。
- 严重度统计与建议给出。
- 不编造 finding。
