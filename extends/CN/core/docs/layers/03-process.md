# Process 层备忘录

## 用途

将工作路由到合适的任务工作流。本层定义如何选择、切换或升级工作流。

此备忘录是 process-routing 协议。它不会替代具体任务 playbook。具体任务步骤应放在 `docs/process/` 中。

## 何时使用

在加载 context 和 policy 后、实现前，以及执行期间任务类型发生变化时使用本层。

## Agent 协议

1. 对任务分类：triage、bugfix、feature、refactor、review、release、documentation、cleanup、investigation 或 verification。
2. 从 `docs/process/` 中选择最接近的工作流。
3. 在编写详细计划或实现文档前，遵循所选工作流定义的任何确认门。
4. 如果工作是多步骤、高风险或并行的，先通过 `docs/process/isolation.md` 隔离工作区再行动。对于大型或高风险工作，考虑分阶段派发 subagent（`docs/process/subagent-development.md`）。
5. 定义最小有用目标和成功标准。
6. 将工作拆分为可观察的步骤。
7. 如果任务范围扩展到所选工作流之外，升级给用户。

## 任务状态所有权

所选工作流拥有该任务类型的成功标准和所需任务状态。它决定除了共享 `status.md` ledger 之外，还需要哪些任务笔记、计划、清单和证据记录。

对于多步骤、高风险、并行或委派工作，开始前先决定谁更新 `status.md`、谁记录任务笔记、谁汇总验证证据。并行或委派工作必须保持所有权明确，避免任务 ledger 和证据混合或被覆盖。

对于委派工作，父流程或活跃任务 owner 负责在完成前整合委派产出；使用 `docs/process/subagent-development.md` 的 integration gate。

## 触发与产物路由

此表只作为路由辅助。所选工作流拥有完整 checklist、成功标准和证据细节。

| Trigger/category | Route to | Required artifact/checklist |
|---|---|---|
| "bug", "broken", "regression", "failing test", "does not work" | `docs/process/bugfix.md` | Reproduction signal and fix verification. |
| "add", "implement", "change behavior", "support", "user can" | `docs/process/feature-development.md` | Acceptance criteria and verification evidence. |
| "refactor", "cleanup", "simplify", "rename", "restructure" without behavior change | `docs/process/refactor.md` | Behavior baseline and preservation evidence. |
| "review", "audit", "check this PR/diff" | `docs/process/review.md` | Findings with severity and reviewed evidence. |
| "release", "publish", "ship", "tag", "package" | `docs/process/release.md` | Release target, approval boundary, and package or artifact scope. |
| "security", "data", "API", "dependency", or other risky/wide-scope work | `docs/process/task-triage.md` plus Policy | Classification, policy boundary, selected workflow, and evidence plan. |
| "done", "verify", "prove", "is this complete?" | Current selected workflow plus Observation | Completion evidence using the Observation schema. |

触发词只是路由提示，不是绕过 Policy 的许可。如果多行匹配，请从 `docs/process/task-triage.md` 开始。不要在此备忘录中复制所选工作流的步骤。

## 允许的行动

- 当任务类型或范围不清晰时，使用 `docs/process/task-triage.md`。
- 使用 `docs/process/bugfix.md` 进行缺陷复现和修复。
- 使用 `docs/process/feature-development.md` 处理新增或变更行为。
- 使用 `docs/process/refactor.md` 处理保持行为不变的结构调整。
- 使用 `docs/process/review.md` 审查已变更工作。
- 使用 `docs/process/release.md` 处理 release readiness 或已批准的 release 工作。
- 使用 `docs/process/isolation.md` 在行动前隔离多步骤、高风险或并行工作。
- 使用 `docs/process/subagent-development.md` 通过分阶段 review 协调跨隔离 subagents 的大型或高风险工作。
- 为多步骤工作创建任务本地笔记。
- 当新证据显示原分类错误时，调整工作流。

## 禁止的行动

- 非平凡工作在选择 process 前不要开始编辑。
- 不要悄悄把小任务扩展成大重构。
- 不要跳过代码或行为变更的验证规划。
- 当工作流假设已被证明错误时，不要继续遵循它。
- 不要在此备忘录中复制完整 playbook 步骤；具体流程应放入 `docs/process/`。

## 输出

- 任务分类和所选工作流。
- 简洁执行计划或任务 checklist。
- 成功标准和预期验证检查。
- 任何范围升级或用户决策需求。

## 指向其他层的链接

- Context: `docs/layers/01-context.md`
- Policy: `docs/layers/02-policy.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`
- Workflows: `docs/process/`
