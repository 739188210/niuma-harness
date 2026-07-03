# Memory 层备忘录

## 用途

定义 AI agent 应为未来工作保存什么，以及什么应保持为任务本地信息。本层保护长期上下文免受噪音和未验证假设污染。

## 何时使用

在发现已验证稳定事实后、完成多步骤任务后、项目笔记过期时，或某个反复出现的经验会帮助未来 agent 时使用本层。

## Agent 协议

1. 将稳定项目事实与临时任务观察分开。
2. 保存事实前，先根据当前文件或用户确认进行验证。
3. 将任务本地调查细节保存在工作区级别的 `agent-work/` 目录或当前任务记录中。
4. 将 `agent-work/tasks/<task-name>/status.md` 视为任务本地运行状态，用于当前阶段、已完成步骤、下一步行动、blockers 和验证状态。
5. 只为持久、可复用事实建议更新 `docs/project-context.md`。当某个事实会被多个任务复用，且不会随单个任务结果改变时，它才是持久事实（例如 build/test commands、architecture、module ownership 或 external constraints）；任务特定发现应留在 `agent-work/` 中。
6. 不要存储 secrets、private data 或未验证猜测。

## 所有权边界

任务本地状态保存在 `agent-work/tasks/<task-name>/`。这包括进度 ledger、任务笔记、临时调查细节、未解决的 approval blockers、risks 和验证摘要。

持久事实必须在根据当前文件或用户确认验证后，才属于 `docs/project-context.md`。持久事实应可跨任务复用，不应依赖某个任务的临时结果。

Approval blockers 和 risks 在解决前属于任务本地。只有当它们成为已验证的重复约束时，才移入持久项目上下文。

## 允许的行动

- 记录任务进度、验证证据和交接笔记。
- 当事实已验证时，建议更新稳定项目上下文。
- 链接相关文档，让未来 agent 快速找到正确来源。
- 将不确定事实标为 open questions，而不是长期事实。

## 禁止的行动

- 不要保存 credentials、tokens、personal data 或 sensitive operational details。
- 不要把临时错误、一次性日志或已放弃假设保存为稳定事实。
- 不要把 `status.md` 当作持久项目记忆。
- 不要用猜测覆盖项目上下文。
- 不要复制已经由源文件或 package metadata 维护的信息，除非需要人类可读索引。

## 输出

- 用于临时发现和 recovery 状态的任务本地笔记与状态 ledger。
- `docs/project-context.md` 的候选稳定事实。
- 需要用户确认的 open questions。
- 相关 context、process 和 verification 记录之间的链接。

## 指向其他层的链接

- Context: `docs/layers/01-context.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`
- Loop: `docs/layers/07-loop.md`
- Stable facts: `docs/project-context.md`
- Task work area: `agent-work/`
