
1. 路径根目录不一致：大量文档写 docs/...，实际目录是 harness/docs/...。

1. docs/... 与实际 harness/docs/... 的路径根目录不一致

实际目录位置

文档真实在：

harness/docs/
├── index.md
├── project-context.md
├── layers/
├── policy/
├── process/
└── experiments/

而仓库根目录没有：

docs/

入口文件使用的是正确路径

CLAUDE.md:11-18 明确告诉 agent：

harness/docs/index.md
harness/docs/project-context.md
harness/docs/layers/01-context.md
harness/docs/policy/action-boundary.md
harness/docs/process/

这部分是正确的。

但进入 Harness 文档后，大量引用回到了 docs/...

以下路径如果被理解成“相对于仓库根目录”，就是不存在的。

上下文层

harness/docs/layers/01-context.md:15-16：

Read `docs/index.md`
Read `docs/project-context.md`

实际应定位为：

harness/docs/index.md
harness/docs/project-context.md

策略层

harness/docs/layers/02-policy.md:7：

Use `docs/policy/action-boundary.md`

实际为：

harness/docs/policy/action-boundary.md

harness/docs/policy/action-boundary.md:123-127 也引用了：

docs/layers/02-policy.md
docs/policy/untrusted-content.md
docs/policy/secret-leak.md
docs/layers/04-observation.md
docs/process/

开发流程

功能开发流程 harness/docs/process/feature-development.md:39-43：

docs/index.md
docs/project-context.md
docs/policy/action-boundary.md
docs/process/isolation.md
docs/process/subagent-development.md
docs/layers/04-observation.md

Bug 修复流程 harness/docs/process/bugfix.md:24-25：

docs/index.md
docs/project-context.md
docs/policy/action-boundary.md

Release、Refactor、Review、Task Triage、Recovery、Memory 等文件也有同样模式。

索引自身

harness/docs/index.md:24-26：

Read `docs/project-context.md`
Read the relevant protocol in `docs/layers/`
Select the relevant playbook from `docs/process/`

还有 harness/docs/index.md:38-62 中枚举的所有 layer、process 和 experiment 路径，都是 docs/...。

对开发 agent 的影响

若 agent 从仓库根目录执行时严格按这些文字路径打开文件，就会尝试访问：

./docs/index.md
./docs/project-context.md
./docs/policy/action-boundary.md

这些在当前仓库都不存在。它可能找不到：

- 项目命令与架构事实；
- 权限边界；
- 任务流程；
- 验证与恢复规则。
