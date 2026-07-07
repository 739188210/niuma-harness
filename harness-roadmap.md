# Niuma Harness Roadmap

## Final purpose

`niuma-harness` is an AI engineering harness generator.

Its goal is not to replace Claude, Codex, opencode, or any other agent runtime. Its goal is to turn a normal project workspace into an AI-agent-ready workspace.

After a user runs:

```bash
npx niuma-harness init
```

七个模块 ：
规划能力 虚拟文件系统 任务委托/子智能体 上下文管理 代码执行与安全沙箱 human-in-the-loop 技能包加载与管理

the project should contain a generated harness that AI agents can read, follow, verify against, recover through, and continue from.

The generated harness is not just a documentation template. It is the project's AI working protocol.

It should help agents answer:

- What project facts should I load before acting?
- What am I allowed to do independently?
- Which workflow should I follow for this task?
- How do I prove the current state is good?
- What do I do when work fails or becomes unclear?
- Which facts should be preserved for future work?
- Should I continue, recover, stop, or ask the user?

## Goals and principles

These are the foundation the harness model and layer memos are built on. Every layer, process playbook, and rule should be traceable back to a goal, and every design choice should not violate a principle.

### Goals

The harness turns a normal workspace into an AI-agent-ready workspace with four properties:

| Property | Meaning |
|---|---|
| Controllable | Agent autonomy is bounded; risky or wide-scope actions escalate to the user. |
| Observable | State and results are proven with evidence, not asserted. |
| Recoverable | Work can be interrupted and resumed; failures have bounded, safe recovery. |
| Context-efficient | Agents load only what they need; no duplicated, stale, or low-value context. |

### Principles

1. **Single source of truth.** Never write the same rule in three places. Layers and memos defer to content files instead of restating them. — supports Context-efficient.
2. **Thin entry, depth sinks down.** Entry files (`CLAUDE.md` / `AGENTS.md`) only route; details live under `<harness-dir>/docs/`. — supports Controllable, Context-efficient.
3. **Separate stable and ephemeral information.** Verified durable facts → `<harness-dir>/docs/project-context.md`; task-local notes → `agent-work/tasks/`. — supports Context-efficient.
4. **Workflows must be interruptible and resumable — but only when it pays.** Create task records only for multi-step, risky, parallel, or interruptible work; single-step tasks stay in conversation. — supports Recoverable, Context-efficient.
5. **Verification before summary.** Never just claim "done". State what ran, the result, what failed, and what was not verified. — supports Observable.
6. **Smallest change first.** Make the minimal necessary change. Widening scope, changing architecture, or touching dependencies escalates to Policy. — supports Controllable.
7. **Explicit state over implicit.** Current stage, next action, and verified/unverified items must be explicit; never rely on the reader inferring them. — supports Observable, Recoverable.

## Generated harness model

The generated harness should have clear runtime responsibilities:

```text
CLAUDE.md / AGENTS.md
  -> <harness-dir>/docs/index.md
      -> <harness-dir>/docs/project-context.md
      -> <harness-dir>/docs/layers/
      -> <harness-dir>/docs/process/
      -> <harness-dir>/docs/rules/
      -> <harness-dir>/docs/automation/
  -> agent-work/
```

### Responsibility map

| Path | Role |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Entry files carrying the always-loaded operating loop. Agents follow it automatically; `<harness-dir>/docs/index.md` is the navigation map the loop consults. |
| `<harness-dir>/docs/index.md` | Agent runtime map and reading order. |
| `<harness-dir>/docs/project-context.md` | Verified stable project facts. |
| `<harness-dir>/docs/layers/` | 7-layer agent operating protocols. |
| `<harness-dir>/docs/process/` | Concrete task playbooks selected by the Process layer. |
| `<harness-dir>/docs/rules/` | Engineering standards for coding, testing, and security. |
| `<harness-dir>/docs/automation/` | Verified automation intent, hooks, and CI notes. |
| `agent-work/` | Workspace-level task-local memory, plans, status ledgers, verification evidence, and handoff notes. |
| `<harness-dir>/HARNESS_GUIDE.md` | Human-facing structure and maintenance guide. |
| `<harness-dir>/manifest.json` | Generated harness status file used by `doctor/check`. |

### Runtime task records

Runtime-generated task files are created under `agent-work/tasks/` during multi-step, risky, parallel, or interruptible work:

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  notes.md
```

Task files hold task-local memory, explicit progress state, verification evidence, and handoff state. Durable project facts should move through the Memory layer before being recorded in `<harness-dir>/docs/project-context.md`.

## Verification strategy

Use layered verification:

1. Unit/CLI tests for parser, scaffold, manifest, doctor, and safety checks.
2. Generated-output smoke tests using temporary directories.
3. Doctor failure tests by deleting or corrupting required files.
4. Package dry-run checks to ensure templates are shipped.
5. Manual review of generated docs for information architecture quality.
6. Scenario validation against realistic agent tasks.

Core commands:

```bash
npm test
node bin/niuma-harness.js init <tmp> --agent claude
node bin/niuma-harness.js doctor <tmp>
node bin/niuma-harness.js check <tmp>
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
npm run pack:dry
```

### Suggested priority

1. Capability / skill metadata model.
2. doctor content-quality checks.

## Non-goals

`niuma-harness` should not become:

- An agent runtime.
- A replacement for Claude, Codex, opencode, or IDE tools.
- A workflow engine that executes arbitrary automation by default.
- A CI/CD system.
- A package that silently installs hooks, dependencies, or external services.
- A tool that guesses project facts without verification.

Future commands such as `repair`, `upgrade`, `profile`, or `diff` may be useful later, but they are not the core purpose. The core purpose is to generate and maintain a project-local AI engineering harness that agents can use safely and consistently.


## current 

矛盾（文件间直接冲突）

1. refactor.md / review.md 缩窄了 Policy 检查范围

- action-boundary.md：分类每个意图动作
- refactor.md step 2："Check Policy... before broad, risky, or force-style changes"——暗示小改动不需要检查
- review.md step 2："Check Policy... before recommending risky or scope-expanding actions"——同上
- 02-policy 自身元规则："Do not choose the more permissive interpretation when policy sources
  conflict"——按此规则，action-boundary 的全量检查胜出，但 playbook 措辞给了更宽松的信号

2. status.md 对 verification state 的归属矛盾

- 07-loop.md：status.md owns "summary verification state"
- 04-observation.md：status.md may summarize verification state, "does not replace evidence"
- "owns" 暗示权威性；"may summarize" 暗示可选和从属。语义不同。

  ---
🟡 缺口（逻辑不完备）

3. entry.md 系统性遗漏 status.md 账本管理

entry 是"all that stays in context"，但：
- Plan 阶段没提"决定是否需要 status.md"
- Observe 阶段没提"更新 ledger 的 verification state"
- Reflect 阶段没提"更新 current stage / completed steps / next action"
- Continue 阶段没提"确保 status.md 足够恢复"

→ agent 只跟 entry 走，永远不会创建/维护 status.md

4. entry.md 缺少 Rationalization Red Flags

07-loop 有 5 条具体的思维陷阱（"That failure is unrelated"、"I will do a quick refactor while I am here"、"The user probably
wants this extra scope"），entry 的 Red Lines 只有高层概括，缺了这几条最可操作的触发器。

5. 05-recovery 的 failure response map 不完备

4 个 playbook 引入了 map 外的恢复触发场景：

┌──────────────────────┬─────────────────────────────────────┬──────────────────────────────────┐
│       Playbook       │             新触发场景              │     无法映射到现有 8 种类型      │
├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ feature-development  │ acceptance criteria fail            │ 非 test 也非 unclear requirement │
├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ refactor             │ cannot be kept small and reversible │ 无 scope-expansion 类型          │
├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ review               │ diff does not match stated goal     │ 无 goal-mismatch 类型            │
├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ subagent-development │ staged flow stalls                  │ 无 process-stall 类型            │
└──────────────────────┴─────────────────────────────────────┴──────────────────────────────────┘

6. index.md 导航遗漏 automation 目录

HARNESS_GUIDE.md 说 index.md "points to ... automation intent"，但 index.md 对 docs/automation/ 零引用。manifest.json
注册了该目录和文件，README 展示了它在生成结构里，但 agent 的导航入口找不到它。

7. index.md 缺少 cross-cutting playbook 导航

isolation.md 和 subagent-development.md 不在 index.md 的 "Task workflows" 列表里，也没有 "Cross-cutting workflows"
子节。03-process 正确引用了它们，但 index.md 作为独立导航图是不完整的。

  ---
🔵 术语不一致

8. Observation schema 字段名漂移

┌─────────────┬──────────────────┬─────────────────────────┐
│  Playbook   │    使用的术语    │ Observation schema 原文 │
├─────────────┼──────────────────┼─────────────────────────┤
│ bugfix.md   │ "remaining risk" │ Remaining unknowns      │
├─────────────┼──────────────────┼─────────────────────────┤
│ refactor.md │ "behavior risks" │ Remaining unknowns      │
└─────────────┴──────────────────┴─────────────────────────┘

"remaining risk" 更宽，"behavior risks" 更窄，都不是 schema 原意。

9. task record 文件名漂移

- feature-development.md / refactor.md：说 "handoff notes"
- agent-work/README.md：定义 notes.md（"temporary investigation notes"，更通用）
- review.md：说 "findings, fix decisions"，不属于 README.md 定义的 5 文件结构任何一项

10. 06-memory vs 07-loop 的 status.md 字段数不一致

06-memory 列了 5 个字段（current stage, completed steps, next action, blockers, verification state），07-loop 列了 7 个（多了
Goal 和 Resume instructions）。

11. isolation.md 不自标 cross-cutting

subagent-development.md 自称 "cross-cutting playbook ... like isolation.md"，但 isolation.md 自身不含 "cross-cutting" 字样。

---
✅ 确认无问题的维度

- Agent 映射一致性（agents.js / commands.js / skills.js 三者完全对齐）
- manifest.json 完备性（templateFiles 全部对应真实文件，无遗漏）
- Help text / CLI 解析 / README 选项（完全一致）
- Command/Skill frontmatter（全部合规）
- 7 个 layer memo 的 7 元素结构（全部完整）
- Subagent 不强制的立场（全链路用 "consider"，无 "must"）
- 7 个 layer memo 的 7 元素结构（全部完整）
- Subagent 不强制的立场（全链路用 "consider"，无 "must"）
- Recovery 对 Observation schema 的引用（05-recovery 精确列出 5 字段）
- Secret leak 路由（正确绕过 05-recovery 走 secret-leak.md）
- Rollback 边界（05-recovery 正确 defer 给 action-boundary）
- Test change gate（04-observation ↔ action-boundary 一致）

---


二、该有但缺失的运行时场景指导

🔴 高优先（agent 必遇、当前无指导）

┌─────┬─────────────────────┬──────────────────────────────────────────────────────────────────────────────┬────────────────┐
│  #  │        场景         │                                     现状                                     │    落点建议    │
├─────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────┼────────────────┤
│ 1   │ context compaction  │ 只有事后恢复（从 status.md 恢复），没有事前：检测到上下文压力时刷新          │ 07-loop.md     │
│     │ 主动协议            │ status.md、决定保留/丢弃什么                                                 │                │
├─────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────┼────────────────┤
│ 2   │ 并发任务请求        │ 无。用户中途插入新任务，没有 checkpoint 当前任务 → 切换/排队/拒绝的决策规则  │ 07-loop.md     │
├─────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────┼────────────────┤
│ 3   │ 安全敏感的 bad edit │ bad edit 路径说回滚，security 规则说 ask-first——agent                        │ 05-recovery.md │
│     │                     │ 自己写了漏洞代码，该立即回滚还是先问？两条规则冲突                           │                │
└─────┴─────────────────────┴──────────────────────────────────────────────────────────────────────────────┴────────────────┘

🟡 中优先（不罕见、缺决策规则）

┌─────┬───────────────────┬──────────────────────────────────────────────────────────────────────────┬─────────────────────┐
│  #  │       场景        │                                   现状                                   │      落点建议       │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│     │ 用户要求绕过      │ action-boundary 有 "explicit request ≠ blanket                           │                     │
│ 4   │ Policy            │ approval"，但没定义用户说"我来负责"时到底把 forbidden 降为 ask-first     │ action-boundary.md  │
│     │                   │ 还是 autonomous                                                          │                     │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 5   │ 执行中用户纠正方  │ 有 unclear requirement                                                   │ 03-process.md       │
│     │ 向                │ 路径，但没区分"改当前计划"vs"新任务"vs"是否回滚已完成的部分"             │                     │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 6   │ 发现无关 bug      │ action-boundary 允许 report 不允许 fix，但没说 report                    │ 03-process.md       │
│     │                   │ 到哪、安全关键时是否暂停当前任务                                         │                     │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 7   │ 混合证据的        │ 有 skipped checks + remaining unknowns                                   │ 04-observation.md   │
│     │ go/no-go          │ 字段，但没定义"部分通过、部分无法验证"时能否继续                         │                     │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 8   │ 用户不可用        │ 07-loop 说"report and ask"，但假设用户会响应；没定义阻塞时怎么处理（暂停 │ 07-loop.md          │
│     │                   │ ？安全降级？无限等待？）                                                 │                     │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 9   │ 僵尸 status.md    │ 说 status.md 是 task-local，没定义发现孤儿记录怎么处理                   │ 06-memory.md 或 age │
│     │                   │                                                                          │ nt-work/README.md   │
├─────┼───────────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ 10  │ 多类别任务        │ triage 说 "closest                                                       │ task-triage.md      │
│     │                   │ playbook"，但没说怎么组合（安全+重构用哪个为主？冲突怎么办？）           │                     │
└─────┴───────────────────┴──────────────────────────────────────────────────────────────────────────┴─────────────────────┘

🔵 低优先（有模糊覆盖、可细化）

┌─────┬────────────────────────┬───────────────────────────────────────────────────────────────────────┐
│  #  │          场景          │                                 现状                                  │
├─────┼────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ 11  │ bugfix vs feature 边界 │ triage 有分类但无决策规则（"行为是错的"但符合文档=feature，否则=bug） │
├─────┼────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ 12  │ 依赖版本冲突           │ command failure 可覆盖构建报错，但代码审查发现的不兼容无归属          │
└─────┴────────────────────────┴───────────────────────────────────────────────────────────────────────┘

  ---
三、整体判断

框架完整度：7 层 + 8 playbook + 3 policy + 3 rule 包 + commands/skills 的骨架是完整的，128 tests 全绿，代码-模板对齐无遗漏。

核心短板：协议层偏"静态描述"——定义了是什么、禁止什么，但缺少运行时决策规则。上面 12 个场景不是边界 case，而是 agent
每天都会遇到的。当前 harness 的回答大多是"停下来问用户"，但没定义"问完之前/之后做什么"、"问不到怎么办"、"两条规则冲突时谁优先"。
