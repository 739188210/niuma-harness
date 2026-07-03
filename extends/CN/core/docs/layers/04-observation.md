# Observation 层备忘录

## 用途

定义 AI agent 如何知道工作区是健康、损坏还是未验证。本层将“完成”的声明转化为证据。

## 何时使用

在声明工作完成前、任何代码或文档变更后、recovery 尝试后，以及决定继续或停止时使用本层。

## Agent 协议

1. 识别能证明任务目标的最小检查。
2. 优先使用 `docs/project-context.md` 中记录的项目本地命令；`docs/index.md` 只作为导航。
3. 先运行聚焦检查；有正当理由时再运行更广泛的检查。
4. 使用下方 schema 记录证据：check、expected signal、actual result、skipped checks 和 remaining unknowns。
5. 将未运行的检查视为 unknown，而不是 passing。
6. 如果验证失败，将失败检查视为证据。除非所选 process 允许且记录了原因，否则不要改变验证目标。

## 证据 schema

使用以下字段记录验证证据：

| Field | Meaning |
|---|---|
| Check | 执行的精确命令、手动行动或 review。 |
| Expected signal | 能证明任务目标或暴露失败的结果。 |
| Actual result | 观察到的结果，包括 pass/fail 状态、可用时的 exit code，以及相关输出或发现。 |
| Skipped checks | 未运行的检查及每项跳过原因。只有没有相关检查被跳过时才使用 `None`。 |
| Remaining unknowns | 仍未验证、有风险或依赖外部/用户确认的内容。只有没有实质未知项时才使用 `None`。 |

## 证据所有权

验证证据拥有精确命令、expected signals、actual results、带原因的 skipped checks 和 remaining unknowns。它是判断任务 verified、failed、skipped 或 still unknown 的事实来源。

`status.md` 可以汇总验证状态，但不能替代证据。使用 ledger 时，请在任务笔记或最终输出中保留足够的证据细节，让另一个 agent 能理解检查了什么。

对于并行或委派工作，最终 Observation 验证整合后的结果。各部分检查只是支持证据，除非它们能直接证明最终状态。

## 允许的行动

- 运行与任务匹配的 tests、lint、typecheck、build 和本地验证命令。
- 检查失败输出，并汇总第一个根因失败。
- 当自动化检查不可用时，记录手动验证步骤。
- 在任务笔记和最终报告中记录已知限制或跳过的检查。

## 禁止的行动

- 没有证据时不要声称成功。
- 不要隐藏、截断掉或忽略相关失败输出。
- 不要把跳过的检查标记为通过。
- 当聚焦失败已经识别问题时，不要无止境扩大验证命令。
- 不要在失败后移动验证目标，把 red 变成 green。
- 不要 rebaseline snapshots、放宽 assertions、skip tests、降低 coverage 或更改 check configuration，除非 `docs/policy/action-boundary.md` 中的 test-change gate 允许；然后记录为什么原目标无效，以及什么替代覆盖保留了行为契约。

## 输出

- 包含 check、expected signal、actual result、skipped checks 和 remaining unknowns 的证据记录。
- 已运行的验证命令及其结果。
- 已执行的手动检查（如有）。
- 跳过的检查及原因。
- 验证目标变更（如有）及原因和替代覆盖。
- 剩余风险或未知状态。

## 指向其他层的链接

- Context: `docs/layers/01-context.md`
- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Recovery: `docs/layers/05-recovery.md`
- Task work area: `agent-work/`
