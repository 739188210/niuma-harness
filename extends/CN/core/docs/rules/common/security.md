# 安全规则

## Secrets

- 永远不要硬编码 credentials、tokens、API keys 或 private endpoints。
- 使用环境变量，或项目现有的 secret management pattern。

## Inputs and outputs

- 在系统边界验证输入。
- 避免不安全的 shell execution 和 path handling。
- 避免渲染或记录敏感数据。

## Risk handling

当需求不清楚时，在进行 security-sensitive changes 前停止并询问。
在任务笔记或验证输出中记录 residual security risk。
