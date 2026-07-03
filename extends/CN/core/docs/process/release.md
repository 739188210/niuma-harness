# 发布流程

只有当用户明确要求 release work 时，才使用此 playbook 准备或执行 release。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件处理 release readiness。

## 目标

用证据确认 release readiness，并避免未经批准执行不可逆或对外行动。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- Release target 和 version intent。
- Publish/tag/deploy/version-bump actions 的 approval boundary。
- Package 或 artifact scope。
- 已检查的 contents。
- Verification evidence 和 remaining release risk。

## 步骤

1. 加载 Context：阅读 `docs/index.md`、`docs/project-context.md`、package metadata 和 release-related docs。
2. 检查 Policy：使用 `docs/policy/action-boundary.md`；publishing、tagging、pushing、deploying 和 version bumps 除非已明确请求，否则都是 ask-first。
3. 确认 release target、version intent、package 或 artifact scope，以及用户批准边界。
4. 当存在项目本地 dry-run 命令时，用它检查 package contents 或 build artifacts。
5. 运行 release scope 所需的本地验证检查；如果检查会触及 external systems、credentials、quotas 或 release infrastructure，则请求批准。
6. 从已验证变更准备 release notes 或 summary。
7. 除非用户明确批准了该具体行动，否则在 outward-facing actions 前停止。
8. 记录 commands、outputs、skipped checks 和 remaining release risk。

## Release readiness checks

使用 `docs/project-context.md` 中已验证的项目特定命令。如果命令未知，报告为 unknown，不要编造。

## Recovery

当 package contents 错误、verification fails、metadata 不一致，或 approval 不清楚时，使用 `docs/layers/05-recovery.md`。

## Memory 和任务笔记

将 release preparation status 和 evidence 保存在 `agent-work/tasks/<task-name>/` 下。将持久 release 流程经验移入长期文档前，先通过 Memory 层。

## 输出

- Release target 和 approval status。
- 已检查的 package 或 artifact contents。
- Verification evidence。
- Release notes 或 summary。
- 跳过的检查及原因。
- Stop points、remaining risks 或 completed release actions。
