# Bugfix 流程

在修复当前行为中的 bug 或 defect 时使用此 playbook。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 bugfix。

## 目标

修复 defect 的最小相关原因，并验证修正后的行为。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- Symptom、expected behavior 和 current behavior。
- 修复前的 reproduction signal，或无法复现的明确原因。
- 第一个 root cause，或最好的已验证解释。
- 针对同一 reproduction target 的通过修复验证。
- Skipped checks 和 remaining risk。

## 步骤

1. 加载 Context：阅读 `docs/index.md`、`docs/project-context.md`，以及受影响的 source 或 test files。
2. 检查 Policy：使用 `docs/policy/action-boundary.md`，当下一步是 ask-first 或 forbidden 时暂停。
3. 理解 symptom、expected behavior 和 current behavior。
4. 通过 test、command、log 或 manual steps 复现问题。如果无法复现，记录已尝试内容；在能证明 symptom 消失前，修复保持 unverified。复现检查是验证目标：修复前保持失败，修复后通过。
5. 识别第一个 root cause，而不是追逐下游症状。
6. 实现最小安全修复。
7. Observe：运行能证明 bug 已修复的聚焦验证。
8. 当触及区域是共享或高风险时，运行更广泛检查。
9. 记录更改内容、通过项、失败项、跳过项和剩余风险。

## Recovery

当 reproduction fails、tests fail、commands fail、context 缺失，或修复尝试无效时，使用 `docs/layers/05-recovery.md`。

不要删除失败测试、削弱 assertions、禁用 checks，或在没有新证据时继续重试同一方法。

如果某个测试看起来是错的，修改前先遵循 `docs/policy/action-boundary.md` 中的 test-change gate。记录 expected behavior evidence，并用等价或更强覆盖替换无效测试；绝不要在没有替代覆盖时移除唯一复现。

## Memory

保存任何新项目事实前，使用 `docs/layers/06-memory.md`。临时调试笔记放在工作区级别的 `agent-work/` 目录；只有已验证的持久事实才写入 `docs/project-context.md`。

## 输出

- Root cause 或最好的已验证解释。
- 已修改文件。
- 验证证据。
- 跳过的检查及原因。
- 剩余风险或 follow-up。
