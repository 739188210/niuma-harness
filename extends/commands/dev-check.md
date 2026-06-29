---
description: 根据项目现有工具运行基础开发检查，例如 lint、test、typecheck、build，并汇总结果
argument-hint: ""
---

请根据当前项目已有文件和脚本，运行最合适的基础开发检查，并汇总结果。

## 执行步骤

1. 确认项目根目录和 Git 状态：
   - `pwd`
   - `git status --short`

2. 识别项目类型和可用命令。优先查看这些文件是否存在：
   - `package.json`
   - `pnpm-lock.yaml`
   - `yarn.lock`
   - `package-lock.json`
   - `bun.lockb`
   - `pyproject.toml`
   - `requirements.txt`
   - `pom.xml`
   - `build.gradle` / `build.gradle.kts`
   - `Cargo.toml`
   - `go.mod`

3. 如果是 Node/前端项目：
   - 读取 `package.json` 的 `scripts`。
   - 优先运行已有的：`lint`、`typecheck`、`test`、`build`。
   - 使用项目锁文件对应的包管理器：优先 `pnpm`，其次 `yarn`，其次 `npm`，如有 Bun 项目则用 `bun`。
   - 不要自动安装依赖，除非用户明确要求。

4. 如果是 Python 项目：
   - 优先运行项目已有测试入口，例如 `pytest` 或文档中定义的命令。
   - 不要自动安装依赖。

5. 如果是 Java 项目：
   - Maven 项目优先运行 `mvn test`。
   - Gradle 项目优先运行 `./gradlew test` 或 `gradle test`。

6. 如果无法识别项目类型或没有检查命令：
   - 不要猜测安装或初始化。
   - 汇报未找到可执行检查，并列出已检查的依据。

## 输出要求

请汇总：

- 检测到的项目类型
- 实际运行的命令
- 每个命令是否通过
- 失败时贴出关键错误，不要淹没用户
- 未运行的检查及原因
- 下一步建议

## 安全约束

- 不要自动安装依赖。
- 不要修改源码。
- 不要自动修复 lint。
- 不要提交或推送。
- 如果命令会启动长期服务，先说明并避免作为检查项直接运行。
- 检查命令可能产生构建产物、缓存或覆盖率文件；执行前后都要查看 `git status --short`，汇报新增或修改的非源码产物，不要自动清理，除非用户明确要求。
