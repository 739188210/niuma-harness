# 测试规则

## 默认预期

变更在被称为完成前应经过验证。

## Test-first preference

对于行为变更：

1. 复现当前行为或失败。
2. 添加或更新聚焦测试。如果变更无法由自动化测试覆盖，说明原因并记录替代的 manual verification。
3. 实现最小修复。
4. 运行相关验证命令。

## Reporting

始终报告：

- 运行的 commands
- 它们 passed 还是 failed
- 重要 skipped checks 及原因

当相关测试失败时，不要声称完成，除非用户明确接受剩余风险。
