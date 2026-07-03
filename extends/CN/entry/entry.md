# Niuma Harness 入口

此文件有两个区域：

- 下方 **contract** 由 `niuma-harness` 托管。不要编辑它；`doctor` 会检查它。
- 底部 **Project notes** 可自由编辑，agent 和人类都可以在此追加内容。

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Loop

此工作区运行 Niuma Harness。下方循环是你每个任务的运行契约。深入文档位于 `{{HARNESS_DIR}}/docs/`；只有当某个阶段需要时才打开对应文件，不要预先阅读全部内容。

## The loop

**1. Plan — before any change**
- Context：使用 `{{HARNESS_DIR}}/docs/index.md` 定位 harness 文档，然后在需要时阅读 `{{HARNESS_DIR}}/docs/project-context.md` 获取稳定事实；检查与任务相关的当前文件。永远不要猜测可以通过文件确认的信息。（depth: `{{HARNESS_DIR}}/docs/layers/01-context.md`）
- Boundary：对下一步行动分类 — autonomous / ask-first / forbidden / stop-and-escalate。只有当行动 autonomous、可逆且限定在任务范围内时才继续。ask-first 前先询问；遇到 forbidden 或不清晰风险时停止。（depth: `{{HARNESS_DIR}}/docs/policy/action-boundary.md`）
- Route：选择流程 — bugfix / feature / refactor / review / release。只有微不足道的单步骤任务才可跳过。（depth: `{{HARNESS_DIR}}/docs/process/`）

**2. Act — smallest change**
做最小且与任务对齐的修改。不要 scope creep，不要顺手重构，不要未经询问添加新依赖。

**3. Observe — before you claim done**
运行能证明目标达成的检查（tests / lint / typecheck / build）。记录精确命令和结果。未运行的检查是 “unknown”，绝不是 “passing”。（depth: `{{HARNESS_DIR}}/docs/layers/04-observation.md`）

**4. Reflect**
将证据与成功标准比较。失败或不清楚 → 第 5 步。通过 → 第 6 步。

**5. Repair — bounded**
找到第一个根因，而不是下游症状。做最小安全修复，然后重新运行聚焦检查。只进行有限重试；几次聚焦尝试后仍失败，就停止并报告。绝不要为了变绿而删除或削弱测试、断言或检查。（depth: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`）

**6. Remember**
任务本地笔记 → `agent-work/`。已验证的持久事实 → `{{HARNESS_DIR}}/docs/project-context.md` 的候选内容，只能在验证后写入。不要保存 secrets，不要保存猜测。（depth: `{{HARNESS_DIR}}/docs/layers/06-memory.md`）

**7. Continue or stop**
只有当下一步安全且有用时才继续；否则报告并询问。对于多步骤工作，在 `agent-work/tasks/<task>/` 中保持状态明确。

## Red lines（始终强制执行）

- 没有证据就不能说 “done” — 说明运行了什么、结果如何、什么失败了、什么跳过了。
- 行动前先分类 — risky / wide-scope / security / data / deps / API → 先询问。
- 最小改动优先 — 扩大范围要升级到 Policy。
- 不要削弱验证来通过 — 不删除失败测试，不禁用检查。
- 不要猜测 — 断言事实前先检查文件；未知就标记为 unknown。
- 不要编辑上方 contract zone — 它由工具托管。持久事实 → `{{HARNESS_DIR}}/docs/project-context.md`；任务笔记 → `agent-work/`。

## Depth is on-demand

上方循环是唯一常驻上下文的内容。每个阶段都指出需要深入时应打开的文件。完整 loop spec：`{{HARNESS_DIR}}/docs/layers/07-loop.md`。
<!-- niuma-harness:contract end -->

# Project notes

<!-- Append project-specific notes, preferences, and memory below this line. -->
