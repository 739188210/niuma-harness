# Niuma Harness 指南

此目录包含当前工作区的 AI 工程 harness。

生成的入口文件：`{{ENTRY_FILES}}`

## 用途

本指南面向维护或审查 harness 的人员，说明生成后的 harness 结构。正常的 agent 任务执行由入口文件（`CLAUDE.md` / `AGENTS.md`）中的 operating loop 驱动；`docs/index.md` 是该循环在 Context 阶段会查阅的导航图。

该 harness 为 AI 编码工具提供稳定的 7 层运行上下文：

- Context：agent 如何查找并验证项目事实
- Policy：agent 可以做什么、不能做什么、必须先询问什么
- Process：agent 如何选择任务工作流
- Observation：agent 如何验证当前状态
- Recovery：agent 如何在工作失败或变得不清晰时响应
- Memory：agent 如何决定什么应被保存、什么应保持为任务本地信息
- Loop：agent 如何继续、暂停、恢复或停止

层文件定义 agent 如何使用每项能力。它们不会替代其指向的内容文件。例如，`docs/layers/01-context.md` 说明如何使用上下文，而 `docs/project-context.md` 存储已验证的项目事实。`docs/layers/03-process.md` 说明如何选择工作流，而 `docs/process/` 存储具体 playbook。

## 运行时入口

入口文件（`CLAUDE.md` / `AGENTS.md`）始终位于 agent 上下文中，并携带 operating loop。当该循环的 Plan 阶段需要导航时，agent 会查阅 `docs/index.md`，其中指向稳定项目事实、层协议、任务 playbook、工程规则、自动化意图，以及工作区级别的 `agent-work/` 任务区域。

如果项目特定事实不完整，agent 应检查当前工作区，并且只有在事实已验证后才更新持久事实。harness 应在 init 后立即可用；它不应依赖人类先填完所有占位内容后 agent 才能开始。

## 目录地图

- `docs/index.md`：导航图与阅读顺序；由入口循环的 Context 阶段进入。
- `docs/project-context.md`：已验证的稳定项目事实，不是任务本地笔记。
- `docs/layers/`：7 层 harness 协议与 agent 运行模型。
- `docs/policy/`：agent 的具体行动权限边界。
- `docs/process/`：由 Process 层选择的具体任务 playbook。
- `docs/rules/`：init 时选择的可选工程标准。
- `docs/automation/`：自动化与 hook 意图说明。
- `agent-work/`：工作区级别的任务本地记录与验证证据。

## init 后哪些内容会变化

### 工具托管的 scaffold 文件

这些文件定义 harness 的工作方式，并会在 re-init 时从模板刷新。除非你是在有意修改 generator templates，否则不要手动编辑它们：

- `HARNESS_GUIDE.md`
- `docs/index.md`
- `docs/layers/`
- `docs/policy/action-boundary.md`：核心行动权限边界。
- `docs/policy/secret-leak.md`：secret 泄露应急响应。
- `docs/policy/untrusted-content.md`：不可信内容处理协议。
- `docs/process/`
- `manifest.json`

`manifest.json` 是供 `doctor/check` 使用的工具托管状态；除非清楚原因，否则不要手动编辑。

### 项目维护的文件

这些文件可随着项目、团队和工具环境变得更清晰而演进：

- `docs/project-context.md`：已验证的稳定项目事实。
- `docs/rules/`：已选择或由团队维护的工程标准。
- `docs/automation/automation-intent.md`：已验证的自动化意图。
- `CLAUDE.md` / `AGENTS.md`：携带始终加载的运行契约（7 步 Loop）的入口文件。contract 区域由工具托管；只有 project-notes 区域可自由编辑。

不要把这些文件用于临时任务笔记或一次性调试日志。

### 运行时生成的任务文件

agent 在多步骤工作期间可在 `agent-work/tasks/` 下创建任务本地记录：

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  notes.md
```

这些文件保存任务本地记忆、显式状态、验证证据和交接状态。持久项目事实应先经过 Memory 层，再记录到 `docs/project-context.md`。

## 维护规则

将长期存在且已验证的事实放在 `docs/project-context.md`。将临时调查笔记放在 `agent-work/`。
