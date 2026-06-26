# 文档地图

本文件是文档和项目入口地图，只说明“什么时候读哪里”，不替代具体文档内容。

## 使用方式

1. 先根据任务类型选择下面的阅读路径。
2. 再打开对应文档或子项目入口文件。
3. 如果文档与代码冲突，以当前代码、构建文件和配置文件为准。
4. 新增重要文档或子项目时，同步更新本文件。

## 核心文档

- `architecture.md`：架构、分层、模块关系、跨项目影响评估。
- `conventions.md`：命名、代码风格、提交规范、禁止模式。
- `stack.md`：技术栈、版本、工具链、运行环境。
- `decisions/001-init.md`：初始化决策记录和新增决策模板。

## QA 文档

- `qa/README.md`：QA 文档入口。
- `qa/default-work-mode.md`：QA 默认工作模式和简化口令。
- `qa/quality-gates.md`：质量门禁、验收检查、发布前检查。
- `qa/test-case-design.md`：测试用例设计方法和模板。

## 规则文档

- `rules/common/code-review.md`：通用代码审查标准。
- `rules/common/security.md`：通用安全检查。
- `rules/common/testing.md`：通用测试要求和 TDD 流程。
- `rules/web/coding-style.md`：前端编码风格。
- `rules/web/design-quality.md`：前端视觉质量标准。
- `rules/web/hooks.md`：前端编辑后的校验建议。
- `rules/web/patterns.md`：前端组件、状态和请求模式。
- `rules/web/performance.md`：前端性能要求。
- `rules/web/security.md`：前端安全规则。
- `rules/web/testing.md`：前端测试规则。
- `rules/java/coding-style.md`：Java 编码风格。
- `rules/java/hooks.md`：Java 编辑后的校验建议。
- `rules/java/patterns.md`：Java 后端分层和模块边界。
- `rules/java/security.md`：Java 后端安全规则。
- `rules/java/testing.md`：Java 后端测试规则。

## 工作区结构

推荐让本 `harness` 目录与业务代码目录并列，方便各自独立用 git 管理：

```text
workspace/
  harness/
  backend/
  frontend/
```

如项目使用其他目录名，请在下面的子项目入口中写明真实路径。

## 子项目入口

按项目实际目录补充，例如：

### `../backend/<service>`

阅读入口：
1. `../backend/<service>/CLAUDE.md` 或 `../backend/<service>/AGENTS.md`
2. `../backend/<service>/README.md`
3. `../backend/<service>/pom.xml`

### `../frontend/<app>`

阅读入口：
1. `../frontend/<app>/CLAUDE.md` 或 `../frontend/<app>/AGENTS.md`
2. `../frontend/<app>/README.md`
3. `../frontend/<app>/package.json`

## 推荐阅读路径

### 后端改动

根入口文件 → 本文件 → `rules/common/code-review.md` → `rules/java/coding-style.md` / `rules/java/patterns.md` → 对应后端项目本地说明和构建文件 → 相关源码、配置、测试。

### 前端改动

根入口文件 → 本文件 → `rules/common/code-review.md` → `rules/web/coding-style.md` / `rules/web/patterns.md` → 对应前端项目本地说明和 `package.json` → 相关源码、路由、状态和测试。

### 架构调整

根入口文件 → 本文件 → `architecture.md` → 受影响子项目文档和代码。

### 编码规范

根入口文件 → 本文件 → `conventions.md` → 子项目本地约定。

### 技术栈、版本或命令

根入口文件 → 本文件 → `stack.md` → 子项目 `pom.xml` / `package.json`。

### QA、测试或验收

根入口文件 → 本文件 → `qa/README.md` → 对应 QA 专题文档 → `rules/common/testing.md` → 前端任务追加读取 `rules/web/testing.md` → 后端任务追加读取 `rules/java/testing.md` → 子项目测试说明和脚本。

### 记录决策

根入口文件 → 本文件 → `decisions/001-init.md` → 在 `docs/decisions/` 下新增或更新决策记录。
