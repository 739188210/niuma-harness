# Harness 使用说明

本目录已经初始化 AI 协作文档骨架。根目录中的 `{{ENTRY_FILE}}` 是 AI 开始任务前必须读取的入口文件。

推荐把本目录作为独立的 `harness` 文档仓，和业务代码仓并列管理：

```text
workspace/
  harness/
    {{ENTRY_FILE}}
    HARNESS_GUIDE.md
    docs/
  backend/
  frontend/
```

## 入口文件

- 选择 Claude 时生成 `CLAUDE.md`。
- 选择 Codex 时生成 `AGENTS.md`。
- 两者内容来自同一份规则模板，只是文件名适配不同工具。
- 本次初始化选择的入口文件是 `{{ENTRY_FILE}}`。

如果后续切换工具，可以把现有入口文件复制为另一个文件名。

## 填充顺序

1. 先填 `docs/index.md`，把项目入口、核心文档和阅读路径写清楚。
2. 在 `docs/index.md` 中明确后端、前端代码相对 `harness/` 的路径，例如 `../backend/<service>`、`../frontend/<app>`。
3. 再填 `docs/architecture.md`、`docs/conventions.md`、`docs/stack.md`。
4. 根据项目实际情况补充 `docs/rules/**`、`docs/qa/**`、`docs/runbooks/**`。
5. 开始具体需求后，再在 `docs/prd/`、`docs/contracts/`、`docs/plans/`、`docs/tasks/` 中新增专题文档。

## 目录用途

- `docs/contracts/`：接口契约、字段定义、前后端边界。
- `docs/decisions/`：架构和产品技术决策记录。
- `docs/experience/`：可长期复用的协作经验、排查经验。
- `docs/plans/`：实施计划、阶段边界、风险和验收策略。
- `docs/prd/`：产品需求文档。
- `docs/prompt-template/`：可复用提示词模板。
- `docs/prototype/`：原型、设计稿、交互说明。
- `docs/qa/`：测试策略、质量门禁、验收矩阵。
- `docs/rules/`：通用、前端、后端规范。
- `docs/runbooks/`：启动、部署、排障手册。
- `docs/tasks/`：任务拆分、执行顺序、TDD 记录。
- `docs/_temp/`：临时过程材料，默认可删除。

## 维护规则

- 长期文档才写入 `docs/index.md`。
- 临时 QA 结果、临时审查、排查过程和草稿分析放入 `docs/_temp/`。
- 如果文档和代码冲突，以当前代码、构建文件和配置为准，并同步修正文档。
- 新增子项目或重要文档时，优先更新 `docs/index.md`。

## 推荐最小填法

每个空文档至少先写三段：

```md
# 标题

## 用途

## 当前状态

## 后续维护规则
```
