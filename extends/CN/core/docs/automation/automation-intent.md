# 自动化意图

此文件记录已验证或被有意采纳到本项目中的自动化意图。

此 MVP 不会自动安装特定工具的 hooks。实际 hook 配置应放在相关工具、CI 系统或仓库设置中。此文件是共享记录，用来说明应该存在什么自动化以及原因。

## 协议

- 不要编造命令。
- 只有在当前工作区验证命令存在后，才记录命令。
- 优先使用项目本地工具和脚本，而不是一次性的远程包执行。
- 将自动化视为 Observation 层的辅助证据，而不是判断的替代品。
- 如果某个自动化想法尚未验证，请标记为 `Unknown until verified`。

## 所有权

agent 在日常工作中会维护此文件：当它们验证了自动化命令、发现命令被重命名或移除，或确认某个自动化意图未被采纳时，应更新此文件。人类维护者保留最终政策控制权，但常规的基于证据的更新不需要人类参与。

## 自动化意图

| Intent | When to consider | Verified command | Status |
|---|---|---|---|
| Format changed files | After edits when the project has a formatter | Unknown until verified | proposed |
| Run focused tests | Before completion when tests exist for the touched area | Unknown until verified | proposed |
| Check secrets | Before commit, release, or sharing artifacts | Unknown until verified | proposed |
| Verify build | Before release or broad integration changes | Unknown until verified | proposed |

## 指向层的链接

- Policy: `docs/layers/02-policy.md`
- Observation: `docs/layers/04-observation.md`
- Recovery: `docs/layers/05-recovery.md`

## 维护

当 agent 验证了某个命令、看到它被重命名或移除，或确认某个意图未被采纳时，更新此文件。任务特定的自动化结果应保存在工作区级别的 `agent-work/` 目录；持久自动化意图保存在这里。
