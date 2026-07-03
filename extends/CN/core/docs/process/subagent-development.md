# Subagent 开发流程

在通过新鲜上下文派发和分阶段 review 协调跨隔离 subagents 的大型或高风险工作时，使用此 playbook。

这是由 Process 层选择的 cross-cutting playbook，类似 `docs/process/isolation.md`。使用 `docs/layers/03-process.md` 获取路由规则。这是推荐工作流，不是硬性约束；单 agent 工作不要求使用它。

## 目标

通过将实现上下文与 review 上下文分离，提高大型或高风险工作的质量，同时不强制绑定某个特定 runtime 或 tool。

## 何时派发

满足任一条件时派发 subagents：

- 多部分任务，且各部分可用独立上下文处理。
- 高风险变更，第二个隔离视角（没有编写代码的人）有价值。
- 长任务中累计上下文会降低质量（context compaction risk）。

不要为微不足道的单步骤任务派发。派发有协调成本。

## 派发原则

- 每个 subagent 使用新鲜上下文：每个 implementer subagent 从干净上下文开始；不要粘贴 parent 的完整历史。
- Artifacts over diffs：交付任务范围和文件路径；让 subagent 自己读文件。不要把大 diff 粘贴进 prompt。
- 任务范围内授权：给 subagent 一个有边界的目标、一个 success check，以及相关 process playbook（`feature-development.md` / `refactor.md` / `bugfix.md`）。
- 在 `agent-work/` 中保存状态：将 current stage、next action、completed steps 和 parent `status.md` updates 记录在 `agent-work/tasks/<task>/` 下，确保任何 subagent 都能恢复。

## 两阶段 review

任务部分实现后，用两个聚焦 pass 审查。每个 pass 可以是独立的只读 subagent，也可以是同一 agent 切换角色：

1. Spec compliance — 变更是否满足 stated goal 和 acceptance criteria？（使用 `docs/process/review.md` step 3，severity 来自 `review.md`）
2. Code quality — correctness、security、maintainability、coverage、evidence。（使用 `docs/process/review.md` steps 4-6）

Reviewer rules：

- reviewer 没有编写它要 review 的代码（隔离 reviewer context）。
- reviewer 是 read-only：它分类 findings，不实现 fixes。
- 只有明确用户批准后才修复（`review.md` step 8）；修复应路由到相关 bugfix/refactor/feature playbook。
- 不要预先操纵 severity 来绕过 review gate。

## Parent integration gate

父流程或活跃任务 owner 拥有最终整合结果。subagents 可以产出 parts、findings、notes 或 evidence，但不能独立声明整体任务完成。

接受委派工作前，parent 必须收集每个 part 的 scope、changed or reviewed files、verification evidence、unresolved risks or blockers，以及 recovery state（如有）。

最终确认前，检查：

- 是否有对同一文件的 overlapping edits。
- 委派产出之间是否有 incompatible assumptions。
- 是否有 stale task state 或 conflicting verification claims。
- 是否有未解决的 CRITICAL 或 HIGH review findings。
- skipped checks 是否影响 integrated behavior。

有意地合并委派产出。如果产出冲突，进入 Recovery，而不是静默选择其中一个。保持 parent `status.md` ledger 中的整合状态最新。

接受委派部分后，对整合后的 workspace 运行或记录最终 Observation。各部分验证是支持证据，不能替代 integrated verification。

## Agent-agnostic notes

此 playbook 使用行动语义：“dispatch a subagent with isolated context”、“hand the subagent file paths and a bounded goal”。它不指定某个具体工具。将其映射到当前 runtime 提供的 subagent 或 task 机制（如果有）。

如果当前环境没有 subagent capability，则优雅降级：按上方 checklist 执行两个顺序 self-review pass，并保持同样分离（先只做 spec compliance，再只做 code quality），同时在 `agent-work/tasks/<task>/` 中保留笔记。

## 边界

- Dispatch 关注上下文分离；workspace separation 是 `docs/process/isolation.md`。二者可组合（先隔离 worktree，再在其中派发 subagents），但它们不是同一回事。
- 此 playbook 不 push、不 merge、不 delete。见 `docs/policy/action-boundary.md`。
- 两阶段 review 复用 `docs/process/review.md` 的 severity 和 “fix only on approval” 规则；它不重新定义 severity。

## Recovery

当 subagent 的输出未通过其自身 verification、review 发现 CRITICAL 或 HIGH findings，或分阶段流程本身停滞（某阶段无法完成）时，使用 `docs/layers/05-recovery.md`。

## 输出

- 已派发任务（scope、target files、使用的 playbook）。
- 每个阶段的 review findings，按 severity 分组。
- 已解决或升级的 blocking issues。
- 每个已接受 part 的 verification evidence。
- Current stage 和 next action（可从 `agent-work/tasks/<task>/` 恢复）。
