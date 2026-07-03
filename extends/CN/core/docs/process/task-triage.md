# 任务分流流程

在选择更具体的工作流前使用此 playbook。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 triage 步骤。

## 目标

对请求分类，加载最小必要上下文，识别 policy risks，并选择下一个 playbook。

## 必需产物 / checklist

报告完成前，确保任务记录或最终回复包含：

- 任务分类。
- 所选 playbook，或不需要 playbook 的原因。
- Policy boundary 或 blocker。
- 成功标准或最小有用下一步。
- 对多步骤、高风险、并行或可中断工作，是否需要 `status.md` ledger。
- 证据计划。

## 步骤

1. 加载 Context：阅读 `docs/index.md` 和 `docs/project-context.md` 获取稳定事实。
2. 检查 Policy：使用 `docs/layers/02-policy.md` 获取协议，使用 `docs/policy/action-boundary.md` 获取具体行动边界。
3. 对任务分类：
   - question or explanation only
   - small edit
   - bug fix
   - feature development
   - refactor
   - review
   - release readiness
   - security-sensitive change
   - documentation update
   - verification or investigation
4. 选择最接近的 playbook：
   - Bug fix: `docs/process/bugfix.md`
   - Feature development: `docs/process/feature-development.md`
   - Refactor: `docs/process/refactor.md`
   - Review: `docs/process/review.md`
   - Release readiness: `docs/process/release.md`
   - Other tasks: 使用最接近的 playbook，并在需要时保留任务笔记。
5. 定义成功标准、最小有用下一步，以及工作是否需要 `status.md` ledger。
6. 当请求信息不足、范围扩大或跨越 Policy boundary 时，停止并询问。

## Observation

离开 triage 前，识别什么证据能证明下一步成功。使用 `docs/layers/04-observation.md` 获取验证预期。

## Recovery

当读取可用上下文后分类仍不清楚时，使用 `docs/layers/05-recovery.md`。不要猜测；报告歧义并请求缺失决定。

## 输出

- 任务分类。
- 所选 playbook，或不需要 playbook 的原因。
- 所需 context 和 rules。
- 成功标准或 blocker。
- 当工作可能是多步骤、高风险、并行或可中断时，给出 `status.md` ledger 决策。
- 验证证据计划。
