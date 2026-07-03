# Agent 工作区

此工作区级别目录用于存储任务本地的 agent 工作内容。

请在以下路径创建运行时任务记录：

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  notes.md
```

## 这里应该放什么

- 任务目标和验收标准。
- 多步骤、高风险、并行或可中断工作的任务本地状态 ledger。
- 执行期间收集的任务本地上下文。
- 多步骤工作的计划。
- 验证命令、输出、跳过的检查和剩余风险。
- 中断后的交接状态。
- 不应成为稳定项目事实的临时调查笔记。

## 这里不应该放什么

- 已验证后的长期项目事实。
- Harness 协议或工程标准。
- Secrets、credentials、tokens 或 private data。
- 作为事实呈现的未验证猜测。
- 对未来任务没有帮助的一次性日志。

## 运行时协议

Loop 层定义 agent 如何保持任务状态最新：`docs/layers/07-loop.md`。

## 持久事实

持久项目事实应先经过 Memory 层，再记录到当前活跃 harness root 的 `docs/project-context.md`。

不要把任务本地记录放在 `harness/docs/` 下。
