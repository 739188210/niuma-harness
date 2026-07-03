# 工作区隔离流程

在多步骤、高风险或并行工作触碰共享工作区前，使用此 playbook 进行隔离。隔离可以防止一个任务的进行中变更污染另一个任务，并让 rollback 更安全。

这是由 Process 层选择的具体 playbook。使用 `docs/layers/03-process.md` 获取路由规则，使用此文件执行 isolation。

## 目标

为不应直接在共享 tree 上运行的工作创建一个独立、可逆的工作区。

## 何时隔离

满足任一条件时隔离：

- 多步骤 feature 或 refactor，过程中会出现中间破坏状态。
- 高风险变更（security、data、public API、migration），需要干净 rollback。
- 并行任务、多个 agents 或多个 CLI sessions 编辑同一 repo。
- 可能被丢弃的实验性工作。

不要为微不足道的单步骤任务隔离。隔离有设置和清理成本；只在工作值得时使用。

## 步骤

1. 确认目标是 git repository。如果不是，继续前先询问用户。
2. 确认预期 worktree 行动满足 `docs/policy/action-boundary.md` 中的 local worktree isolation rules。
3. 在新创建的本地任务分支上创建 worktree：`git worktree add <path> -b <branch>`。
4. 本任务完全在 worktree 内工作。隔离期间不要编辑 shared tree。
5. 在认为任务完成前，在 worktree 内运行 verification（tests、build）。

## 边界

- Isolation 保护 working directory，而不是最终 merge。共享文件（schema、migrations、lockfiles、public modules）在 merge 时仍可能冲突 — 应暴露该风险。
- 除非用户明确要求，否则不要 push、set upstream tracking、create merge requests、touch remotes、delete worktree 或 delete branches。
- 隔离前 shared working tree 不需要干净，但 isolation 不得 stage、revert、overwrite、clean 或以其他方式修改 shared-tree files。
- 复制 local-only config 或使用 credentials 不是 worktree creation 的一部分；这些行动需要单独通过 Policy 分类。
- 在 worktree 内 revert 仍是一次 repair attempt — 之后重新运行 Observation。

## Recovery

如果 worktree setup fails（path conflict、branch exists、git metadata failure 或 invalid isolation path），不要强制执行。解决具体 blocker，或退回到 shared tree 中的 task-scoped work。一般失败处理使用 `docs/layers/05-recovery.md`。

## 清理

当任务被接受时，报告 worktree path、branch 和 base branch，并询问是 keep、merge 还是 remove。不要静默留下 worktrees 或 branches。

## 输出

- Worktree path 和 branch name。
- 工作开始时的 base branch。
- worktree 内的 verification evidence。
- Cleanup decision（kept / merged / removed）和 follow-up。
