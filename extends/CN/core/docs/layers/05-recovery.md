# Recovery 层备忘录

## 用途

定义当执行失败、证据不清楚或 agent 发现自己出错时的安全行为。本层防止盲目重试和 scope creep。

## 何时使用

当 tests fail、builds fail、commands fail、context 缺失、edits 错误、requirements 不清楚、checks 冲突，或同一修复尝试反复失败时使用本层。

如果 Loop 层标记了关于缺失证据的合理化，或把失败当作无关问题忽略的合理化，请先使用本层对失败或不确定性分类，再继续。范围扩张类合理化应路由到 Process 和 Policy。

## Agent 协议

1. 对失败类型分类：test、build、command、context、bad edit、unclear requirement、policy block 或 unknown。
   - 例外：leaked secret 不是普通失败。应路由到 `docs/policy/secret-leak.md`，而不是执行下方步骤。
2. 保留调试所需的精确失败信号。
3. 识别第一个根因，而不是所有下游症状。
4. 做最小安全修复尝试。
5. 重新运行最小相关检查。
6. 如果同一失败在聚焦重试后仍持续，或修复需要用户批准，则停止并报告。

## 失败响应映射

根据失败类型选择所需响应形式。不要把所有失败都当作可重试的实现 bug。

| Failure type | Required response |
|---|---|
| `test` | 保留失败测试名或 assertion，以及 expected-vs-actual 信号；修复第一个代码原因或有效的测试目标原因；重新运行最小相关测试。 |
| `build` | 保留 build 或 typecheck 命令和第一个 diagnostic；修复第一个编译或配置原因；重新运行聚焦 build/typecheck 命令。 |
| `command` | 保留命令、exit status 及相关 stderr/stdout；判断问题来自调用方式、环境、权限还是依赖；只有改变原因后才重试。 |
| `context` | 命名缺失的文件、事实、决定或先前状态；检查可用上下文或询问用户；不要编造缺失事实。 |
| `bad edit` | 识别 agent 自己引入且导致回归的 edit；回退或修正最小 owned change；重新运行受影响检查。 |
| `unclear requirement` | 说明歧义及其阻塞的实现选择；继续前先请求澄清。 |
| `policy block` | 命名 policy 或 approval boundary；停止或请求批准；不要绕过边界。 |
| `unknown` | 保留观察到的信号和 remaining unknowns；收集最小额外证据来重新分类；如果无法安全分类则停止。 |

使用 Observation 证据字段记录 recovery 结果：Check、Expected signal、Actual result、Skipped checks 和 Remaining unknowns。

## 回滚策略

优先使用版本控制撤销 agent 自己的变更，而不是手动编辑。

- 只回退当前任务中 agent 引入的变更，不回退已有用户工作。
- 当所有权不清楚（无法区分 agent 变更和用户变更）时，回退任何内容前先停止并询问。
- 回滚本身也是一次修复尝试：之后重新运行相关 Observation 检查。
- 没有版本控制时，从最后已知良好状态恢复最小受影响区域，并记录恢复内容；绝不要为了强行修复而删除文件。

回滚边界（什么可以被回退）由 Policy 拥有：`docs/policy/action-boundary.md`。本节只覆盖机制，避免重复 Policy。

## 允许的行动

- 阅读失败输出以及相关 source、tests 和 configuration。
- 只回退或修正 agent 自己的错误 edits。
- 每次修复尝试后运行聚焦验证。
- 当 requirements、permissions、credentials 或 risk boundaries 阻塞进展时，询问用户。

## 禁止的行动

- 不要删除失败测试或削弱 assertions 来强制成功。
- 不要禁用 lint、typecheck、security checks 或 coverage 来隐藏失败。
- 未经明确批准，不要 reset repository 或丢弃用户工作。
- 不要在重复失败后继续重试同一方法。
- 未经批准，不要把安装依赖或更改架构当作 recovery 捷径。

## 输出

- 失败类别和根信号。
- 已进行的修复尝试（如有）。
- 重新运行结果。
- 如果无法安全继续 recovery，说明停止原因。
- 给用户的后续问题或建议。

## 指向其他层的链接

- Policy: `docs/layers/02-policy.md`
- Process: `docs/layers/03-process.md`
- Observation: `docs/layers/04-observation.md`
- Memory: `docs/layers/06-memory.md`
- Loop: `docs/layers/07-loop.md`
