# 功能开发流程

在添加新行为或更改现有面向用户行为时使用此 playbook。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 feature。

## 目标

实现满足已验证验收标准的最小安全功能切片。

## 规划前确认理解

在编写详细 plan、PRD、architecture note、task list 或 implementation 前，当 scope 或 acceptance 尚不清楚时，重述请求的功能并确认工作。

保持确认简短：

- Goal
- Non-goals
- Key assumptions
- Acceptance criteria
- Proposed smallest path
- Open questions

如果某个 open question 会改变实现方向，先询问用户，再规划或编码。如果用户已给出完整需求并批准继续，记录这一点并继续。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- 使用的 acceptance criteria。
- 当影响范围时，列出 non-goals 和 assumptions。
- 选择的最小 feature slice。
- 使用 Observation schema 的验证证据。
- Skipped checks 和 remaining risks。

## 步骤

1. 加载 Context：阅读 `docs/index.md`、`docs/project-context.md` 和相关现有实现模式。
2. 检查 Policy：使用 `docs/policy/action-boundary.md`，当下一步是 ask-first 或 forbidden 时暂停。如果这是多步骤或高风险工作，先隔离（`docs/process/isolation.md`）。对于大型功能，考虑分阶段派发 subagent（`docs/process/subagent-development.md`）。
3. 当功能 scope 不清晰、缺少 acceptance criteria，或存在会改变实现方向的重要设计选择时，在规划前确认理解。
4. 选择符合当前架构的最小实现路径。
5. 实现前规划验证。使用 `docs/layers/04-observation.md` 获取证据预期。
6. 为行为变更添加或更新聚焦测试。如果此变更无法自动化测试，记录替代的 manual verification 及原因。
7. 用任务范围内的变更实现功能。
8. 运行相关验证命令。
9. 记录 changes、verification results、skipped checks 和 remaining risk。

## 何时暂停

当 `docs/policy/action-boundary.md` 将下一步分类为 ask-first、forbidden 或 stop-and-escalate 时，暂停并询问。

功能特定暂停点：

- acceptance criteria 不清楚
- 实现会扩展到请求的 feature slice 之外

## Recovery

当 tests、builds、commands、context 或 acceptance criteria 失败时，使用 `docs/layers/05-recovery.md`。不要削弱验证来让功能看起来完成。

## Memory 和任务笔记

对于多步骤功能，在 `agent-work/tasks/<task-name>/` 下创建任务文件夹，并在其中保存 status、context、plan、verification 和 handoff notes。

将任何任务发现移入 `docs/project-context.md` 前，先使用 `docs/layers/06-memory.md`。

## 输出

- 使用的 acceptance criteria。
- Implementation summary。
- 已修改文件。
- 验证证据。
- 跳过的检查及原因。
- 剩余风险或 follow-up。
