# Loop 运行时层备忘录

## 用途

定义连接所有其他层的 operating loop。本层告诉 AI agent 何时 plan、act、observe、recover、remember、continue、pause 或 stop。

## 何时使用

用于任何多步骤任务、长时间调查、重复验证循环或 recovery 流程。上下文重置后，也使用本层安全恢复工作。

对于多步骤、高风险、并行或可中断工作，使用 `agent-work/tasks/<task-name>/status.md` 作为显式进度 ledger 和恢复点。

## 显式任务状态

对于多步骤、高风险、并行或可中断工作，请在以下路径维护显式任务状态 ledger：

```text
agent-work/tasks/<task-name>/status.md
```

该 ledger 是中断、上下文重置或交接后的恢复点。保持它简短且最新。

最小字段：

- Goal
- Current stage
- Completed steps
- Next action
- Verification state
- Blockers or risks
- Resume instructions

除非有助于交接，不要为微不足道的单步骤工作创建或维护 ledger。

## 所有权边界

`status.md` 拥有一个活跃任务的运行恢复状态。它记录 current stage、next action、completed steps、summary verification state、blockers or risks 和 resume instructions。

`status.md` 不拥有详细验证证据、任务笔记或持久项目事实。详细证据应放入 Observation record 或任务笔记，持久事实应路由到 Memory 层。

活跃任务 owner 负责在暂停、交接或恢复前保持 `status.md` 最新。并行或委派工作可维护自己的笔记和证据，但活跃任务 owner 需要在父 ledger 中汇总恢复状态。

暂停或停止委派工作前，活跃任务 owner 应在父 ledger 中记录整合后的委派状态、冲突和下一步行动。

## Agent 协议

1. Plan：加载 Context，检查 Policy，选择 Process，并决定任务是否需要 `status.md` ledger。
2. Act：做最小且与任务对齐的修改或调查步骤。
3. Observe：运行或记录相关检查；如果使用 ledger，则更新其中的验证状态。
4. Reflect：将证据与成功标准比较，并更新 current stage、completed steps 和 next action。
5. Repair：当结果失败、不清楚或不安全时进入 Recovery。针对同一失败的重试有界（少量固定次数的聚焦尝试）；达到限制后，停止、保留失败信号并报告，而不是继续循环。
6. Remember：通过 Memory 层捕获已验证的持久事实。
7. Continue or stop：只有当下一步安全且有用时才继续；否则报告并询问。暂停或停止可中断工作前，确保 `status.md` 足以恢复。

## 合理化红旗

在 Reflect 或 Continue 阶段，将这些想法视为 stop-and-classify signals。红旗不证明行动被禁止；它表示 agent 必须先路由到 Observation、Recovery、Process 或 Policy，再继续。

| Agent thought | Risk | Required response |
|---|---|---|
| "I can skip tests/checks" | 没有 Observation 证据就完成，或移动验证目标。 | 运行最小相关检查，或记录 skipped checks 和 remaining unknowns。如果这发生在失败之后，使用 Recovery 和 test-change gate。 |
| "It is probably fine" | 把信心当作证据。 | 先 Observe；如果证据不可用，报告 unknown，而不是声称成功。 |
| "That failure is unrelated" | 忽略失败的 Observation 证据。 | 保留失败信号，并在缩小范围前通过 Recovery 分类。 |
| "I will do a quick refactor while I am here" | 悄悄扩大范围。 | 重新检查 Process 和 Policy；保持下一步在任务范围内，或先询问。 |
| "The user probably wants this extra scope" | 编造 requirements。 | 在扩展目标、公共行为或触及范围前询问或确认。 |

## 允许的行动

- 为多步骤工作维护可见 task checklist。
- 为多步骤、高风险、并行或可中断工作维护 `agent-work/tasks/<task-name>/status.md`。
- 在低风险、任务范围内步骤中自主继续。
- 当出现 policy、不确定性、重复失败或用户决策点时暂停。
- 中断后根据 `status.md`、任务笔记、验证证据和当前项目文件恢复。

## 禁止的行动

- 当下一步与任务目标无关时，不要继续循环。
- 不要忽略失败 observation，然后假装任务通过。
- 不要进入没有停止条件的开放式重试。
- 对多步骤、高风险、并行或可中断工作，不要只依赖 conversation state。
- 不要把 `status.md` 当作持久项目记忆；持久事实应通过 Memory 层路由。
- 在事实被验证前，不要把 memory updates 当作完成。

## 输出

- 当前 loop stage 和 next action。
- 已完成步骤和验证证据。
- 使用 ledger 时的 `status.md` 路径和 recovery state。
- loop 被阻塞时的 recovery state。
- 最终总结：changes、checks、skipped checks 和 remaining risks。

## 指向其他层的链接

- Context: `docs/layers/01-context.md`
- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`
- Memory: `docs/layers/06-memory.md`
