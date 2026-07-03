# Secret 泄露响应

## 用途

定义当 agent 检测到 secret 或敏感数据（credential、token、key、password、private key 或 private data）进入代码、commit、history、logs 或 output 时必须做什么。这是一类高严重度失败，形态不同于普通 Recovery：优先级是 containment 和 escalation，而不是 smallest-fix-and-retry。

## Trigger

当 agent 观察到以下任一情况时使用此文档：

- source file、config、env file 或 doc 中存在 secret。
- git commit、index 或 history 中存在 secret。
- command output、logs 或 process notes 中回显了 secret。
- 用户将 secret 粘贴进 conversation。

## 响应：contain，不要自行修复

1. 停止。不要继续 commit、push、copy 或 echo 该 secret。
2. 不要尝试静默修复。Rotate、delete 或 rewrite history 都是高风险 ask-first 行动（见 `action-boundary.md`）。
3. 保留证据。记录：secret type、发现位置和 exposure scope（local-only / committed / pushed / public）。
4. 升级给用户。说明 exposure scope 和建议行动（rotate the secret、如果已 pushed 则 rewrite history、通知受影响下游系统）。
5. 只有在批准后才清理。在安全时从 working tree 移除 secret；对于 committed 或 pushed exposure，使用版本控制感知的清理方式。绝不要为了隐藏证据而删除文件。

## 禁止

- 未经明确批准运行 `git push --force` 或重写 shared history。
- agent 主动通过 API rotate 或 revoke secrets。
- 将 secret 复制到 `agent-work/` 任务笔记、logs 或任何 output 中。
- 因为 secret 已从 working tree 移除就认为泄露已修复（它可能仍在 history 或 remotes 中）。

## 与普通 Recovery 的区别

普通 Recovery（`docs/layers/05-recovery.md`）目标是最小安全修复和聚焦重试。secret 泄露反过来：安全行动是停止并升级，而不是 patch。绝不要把 “smallest fix” 推理应用到泄露事件上。

## 链接

- Policy: `docs/policy/action-boundary.md`（rotation 和 history rewrite 是 ask-first）
- Recovery: `docs/layers/05-recovery.md`
- Memory: `docs/layers/06-memory.md`（绝不持久化 leaked secret；只记录其 type 和 location）
