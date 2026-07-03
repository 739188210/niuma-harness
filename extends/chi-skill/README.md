# Jereh Agent Skills

本目录存放项目级 Agent Skill，用于指导 AI 在 Jereh 项目中完成软件工程全流程。

## 目录结构

```
tool/agent/skill/
├── workflow/          # 流程类 Skill，覆盖软件工程全生命周期
│   ├── dev-workflow/      # 端到端功能开发 7 阶段（PRD/设计/技术设计/测试设计/实现/测试/演示）
│   ├── review-workflow/   # Jereh 特化 PR / 代码审查
│   └── git-workflow/      # Git 分支、提交、PR、合并
└── capability/        # 能力类 Skill，基于 example/ 裁剪的最佳实践
    ├── graphql-capability/
    ├── openapi-capability/
    └── persistence-capability/
```

## Workflow Skill

| Skill              | 触发场景                                                                                |
| ------------------ | --------------------------------------------------------------------------------------- |
| `dev-workflow`     | 写 PRD、功能 / 系统 / 领域设计、技术设计、写测试、TDD、实现需求、跑测试、演示（端到端 7 阶段；模块结构与约定见 `module/CONVENTIONS.md`） |
| `review-workflow`  | 代码审查、PR 评审（Jereh 特化清单）                                                     |
| `git-workflow`     | Git 提交、创建 PR、合并分支                                                             |

## Capability Skill

| Skill                    | 触发场景                                    |
| ------------------------ | ------------------------------------------- |
| `graphql-capability`     | GraphQL schema、DataFetcher、联查           |
| `openapi-capability`     | OpenAPI 规范、接口生成、客户端生成          |
| `persistence-capability` | Spring Data JDBC、MyBatis、Flyway、多数据源 |

## 与 `.agents/skills/` 的关系

- `tool/agent/skill/` 是**唯一来源 (Source of Truth)**。所有 Skill 文件的修改在此目录进行。
- `.agents/skills/` 是 Agent 加载入口，由 `tool/agent/skill/` 同步而来。修改后必须运行同步（脚本或手工 `rsync -a --delete`），不可单独编辑。
- 任何对 Skill 的变更只提交一个 SOT，`.agents/skills/` 视作生成产物。

## 使用方式

每个 Skill 目录下包含：

- `SKILL.md`：英文入口
- `SKILL_ZH.md`：中文入口
- 子目录视 skill 而定（如 `dev-workflow/phases/`、`git-workflow/phases/`；`review-workflow` 无子目录）

Agent 根据用户请求匹配 Skill 名称或触发词，加载对应的 SKILL.md 后按需读取子文件。
