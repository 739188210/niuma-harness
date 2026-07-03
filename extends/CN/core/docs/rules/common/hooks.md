# Hooks 系统

## Hook 类型

- **PreToolUse**：工具执行前（validation、parameter modification）
- **PostToolUse**：工具执行后（auto-format、checks）
- **Stop**：会话结束时（final verification）

## Auto-Accept Permissions

谨慎使用：
- 仅对可信、定义清晰的计划启用
- 对探索性工作禁用
- 永远不要使用 dangerously-skip-permissions flag
- 改为在 `~/.claude.json` 中配置 `allowedTools`

## TodoWrite 最佳实践

使用 TodoWrite tool 来：
- 跟踪多步骤任务进度
- 验证对指令的理解
- 支持实时调整方向
- 展示细粒度实施步骤

Todo list 可以暴露：
- 步骤顺序错误
- 缺失事项
- 额外的不必要事项
- 粒度错误
- 误解需求
