# 重构流程

在保持预期行为不变的前提下重组代码时使用此 playbook。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 refactor。

## 目标

在不改变预期行为的情况下，做最小有用的结构改进。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- Refactor goal。
- 必须保持不变的 behavior baseline。
- Scope boundary：明确哪些内容有意不改变。
- 可行时提供 before/after verification evidence。
- Skipped checks 或 behavior risks。

## 步骤

1. 加载 Context：阅读 `docs/index.md`、`docs/project-context.md`，以及受影响实现和测试。
2. 检查 Policy：在 broad、risky 或 force-style changes 前使用 `docs/policy/action-boundary.md`。如果这是多步骤或高风险工作，先隔离（`docs/process/isolation.md`）。对于大型重构，考虑分阶段派发 subagent（`docs/process/subagent-development.md`）。
3. 说明 refactor goal 和必须保持不变的 behavior。
4. 编辑前识别 verification baseline。将 baseline verification 视为重构的 behavior boundary。
5. 将重构拆分为小且可逆的步骤。
6. 只修改实现 refactor goal 所需的文件。
7. 在有意义的步骤后运行聚焦验证。
8. 如果 behavior 改变、verification fails 或工作扩展成功能，停止。
9. 记录 changed structure、verification evidence、skipped checks 和 remaining risk。

## Scope guard

除非用户明确要求，否则不要把 refactor 与新行为混在一起。不要仅因为代码在附近就清理无关代码。

重构期间修改测试是 ask-first，除非变更纯机械且保留相同 assertions。不要为了适应重构而更新 snapshots、放宽 assertions、skip tests 或修改 verification config。

## Recovery

当 verification fails、behavior 意外改变，或 refactor 无法保持小而可逆时，使用 `docs/layers/05-recovery.md`。

## Memory 和任务笔记

对于多步骤重构，在 `agent-work/tasks/<task-name>/` 下保存 status、context、plan、verification 和 handoff notes。

## 输出

- Refactor goal。
- Behavior-preservation expectation。
- 已修改文件。
- Before 和 after 的验证证据。
- 跳过的检查及原因。
- 剩余风险或 follow-up。
