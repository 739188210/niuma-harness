# Harness 运行时索引

这是 harness 的导航图。入口文件（`CLAUDE.md` / `AGENTS.md`）保存 operating loop；当该循环的 Context 阶段需要定位项目结构、文档或命令时，打开此地图。

## 结构指南

- `docs/project-context.md` 存储已验证的稳定项目事实。
- `docs/layers/` 定义 agent 运行模型：如何使用 context、policy、process、observation、recovery、memory 和 loop 能力。
- `docs/policy/action-boundary.md` 定义具体行动权限边界。
- `docs/policy/untrusted-content.md` 定义如何把外部或未验证内容当作数据而非指令处理。
- `docs/policy/secret-leak.md` 定义 secret 泄露应急响应。
- `docs/process/` 包含由 Process 层选择的具体任务 playbook。
- `docs/rules/` 包含 init 时选择的可选项目工程标准。
- `agent-work/` 存储任务本地笔记、计划、验证证据和交接状态。
- `HARNESS_GUIDE.md` 为维护人员说明 harness 结构。

## 运行时阅读顺序

入口文件中的 operating loop 驱动任务工作。某个阶段需要导航时会查阅此地图：

1. 从入口文件（`CLAUDE.md` / `AGENTS.md`）中的 operating loop 开始。
2. 使用此文件定位结构、文档、工作流和验证命令。
3. 阅读 `docs/project-context.md` 获取稳定项目事实。
4. 当某阶段需要深入信息时，阅读 `docs/layers/` 中对应协议。
5. 当任务需要 playbook 时，从 `docs/process/` 中选择相关 playbook。
6. 当安装了 rule 文件时，应用 `docs/rules/` 中的相关标准。
7. 使用 `agent-work/` 保存多步骤任务笔记和验证证据。

如果缺少项目特定事实，请在行动前检查当前工作区。不要猜测缺失的路径、命令、技术栈细节或所有权。

## 项目指针

项目特定代码位置、命令和稳定约定维护在 `docs/project-context.md` 中。这个工具托管索引只指向生成的 harness 结构；请把项目特定导航笔记加入 `docs/project-context.md`，或把任务本地笔记放在 `agent-work/`。

## 7 层 harness 模型

- Context 协议：`docs/layers/01-context.md`
- Policy 边界：`docs/layers/02-policy.md`
- Process 路由：`docs/layers/03-process.md`
- Observation 协议：`docs/layers/04-observation.md`
- Recovery 协议：`docs/layers/05-recovery.md`
- Memory 策略：`docs/layers/06-memory.md`
- Loop 运行时：`docs/layers/07-loop.md`

## 任务工作流

- 任务分流：`docs/process/task-triage.md`
- Bug 修复：`docs/process/bugfix.md`
- 功能开发：`docs/process/feature-development.md`
- 重构：`docs/process/refactor.md`
- 审查：`docs/process/review.md`
- 发布就绪：`docs/process/release.md`

## 验证命令

权威命令列表应放在 `docs/project-context.md`。此索引只用于定位验证指南所在位置。

## 维护

此索引是工具托管的导航图。在生成的 harness 中，请把稳定项目事实放在 `docs/project-context.md`，把任务本地指针放在 `agent-work/`；若要修改此文件，请更新 generator template。
