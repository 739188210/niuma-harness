# 审查流程

在审查已变更工作时使用此 playbook。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 review。

## 目标

在工作被视为 ready 前识别 blocking issues，同时避免把 review 变成无关 redesign。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- Review scope。
- Intended task goal 与 actual changes 的对比。
- 按 severity 分组的 findings。
- Blocking 与 non-blocking 状态。
- 已审查或请求的 verification evidence。

## 步骤

1. 加载 Context：阅读 `docs/index.md`、`docs/project-context.md`，以及 changed files 或 diff。
2. 检查 Policy：在推荐 risky 或 scope-expanding actions 前使用 `docs/policy/action-boundary.md`。
3. 确认 intended task goal，并与 actual changes 对比。
4. 审查 correctness、security、maintainability、test coverage 和 verification evidence。
5. 当安装了 rule 文件时，应用 `docs/rules/` 中的相关工程标准。
6. 按 severity 对 findings 分类。
7. 在报告工作 ready 前，要求修复 blocking findings。
8. 只有当用户明确批准 implementation changes 时才实现修复；否则将修复路由到相关 bugfix、refactor 或 feature playbook。
9. 对 material fixes 重新运行或请求聚焦验证。

## 修复边界

Review 报告 findings。除非用户明确要求 review-and-fix，否则修复 findings 是另一个独立行动。

## Severity levels

- CRITICAL：security vulnerability、data loss risk、destructive behavior，或明确破坏 user-facing behavior。
- HIGH：likely bug、缺少 required validation、不安全 edge case，或重要 verification gap。
- MEDIUM：应考虑的 maintainability、clarity 或 coverage concern。
- LOW：minor style、naming 或 documentation note。

## Recovery

当 diff 与 stated goal 不匹配、review evidence 缺失，或修复引入新失败时，使用 `docs/layers/05-recovery.md`。

## Memory 和任务笔记

对于多步骤 reviews，在 `agent-work/tasks/<task-name>/` 下保存 status、findings、fix decisions 和 verification evidence。只有已验证的持久经验才通过 Memory 层移入 `docs/project-context.md`。

对于大型或高风险工作中的两阶段隔离 subagent review，见 `docs/process/subagent-development.md`。

## 输出

- Review scope。
- 按 severity 分组的 findings。
- 必须解决的 blocking issues。
- 已审查或请求的 verification evidence。
- Follow-up items 和 remaining risk。
