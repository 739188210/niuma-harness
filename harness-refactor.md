# Niuma Harness 文档重构建议

> 本文基于 `D:\Project\resource-library\agent-work\tasks` 中的实际任务记录进行反查。范围仅限于 Niuma Harness 的 **Entry / Core 文档内容、定位与职责划分**；不讨论为 Harness 新增 JS 命令、hook、运行时审计或自动化能力。

## 1. 结论摘要

Niuma Harness 当前并非没有价值。实际记录表明，它已经有效引导 agent：

- 在数据库、迁移、认证、凭据等边界前停止或请求授权；
- 保留 Maven、TypeScript、全量测试和浏览器验证失败，不一概宣称通过；
- 对不少功能采用 focused RED → GREEN、最小修复和有界 Recovery；
- 在任务记录中留下范围、风险、已知缺口和后续动作。

但当前文档存在一个根本问题：**它把工程责任讲得很完整，却没有把关键决策收束为简短、无歧义、可一致执行的规则。**

实际后果包括：

- 多步骤或跨模块任务没有 `plan.md`；
- `status.md` 常退化为“已完成”摘要，而不是恢复入口；
- focused test、build、typecheck、full suite、认证浏览器、migration applied 等不同证据级别混用；
- 全量回归失败或关键未知项存在时，任务仍可能被写成 `complete` / `accepted`；
- `harness-feedback.md` 同时承担计划、状态、验证、恢复和结论，容易成为事后合规叙述；
- Direct / Minimum / Recoverable 的选择需跨多个文件推理，且 Direct 与 non-trivial 规则有冲突。

因此，重构目标不应是增加更多规则或文档，而是：

> 保留七个工程责任；将其对 agent 的呈现收敛为“安全开工、证据交付、可续接工作”三件事；让每一份 task-local 文件只承担一种事实职责。

---

## 2. 重新明确产品定位

当前定位：

> 为 Claude Code / Codex / opencode 等 AI coding tools 生成并验证一套可控、可观察、可恢复、上下文高效的工程协作 harness。

这句话容易被理解为：Harness 已经验证每项任务执行真的可控、可观察、可恢复。

这是过度承诺。当前 `doctor` 实际验证的是 Harness 安装状态、入口合同、受管理文档和拓扑，而不是某项任务宣称的命令、证据、代码结果或恢复状态是否真实。

### 建议替换为

> 为 Claude Code、Codex、OpenCode 等 AI coding tools 生成项目级协作协议：统一任务边界、执行路径、验证记录与跨会话恢复材料，并验证该协议的安装完整性。
>
> Harness 通过文档约束提升协作的一致性；代码正确性和任务结果仍应由项目测试、CI、代码审查与真实运行环境验证。

若需保留四个关键词，建议表述为：

> 为 AI coding tools 生成面向工程协作的 Harness：
> - **可控**地界定动作边界；
> - **可观察**地记录执行证据；
> - **可恢复**地保留需要交接的任务状态；
> - **高效**地按需加载项目上下文。
>
> Harness 验证的是这些协作约定是否正确安装，不替代测试、CI、代码审查或运行时验收。

### 文档语言应反映的能力边界

- 当前 Observation 是**可追溯的自述型观察记录**，不是独立验证过的遥测或审计证据。
- 当前 Recovery 是**在 task material 完整时的保守恢复约定**，不是保证任意任务都能自动恢复。
- 当前 Doctor 验证的是**Harness 合同完整性**，不是任务执行质量。

---

## 3. 有七层责任与没有 Harness 的真实差异

七层不是要求每个任务读完七篇文档、写完五份文件。它们本质是在要求 agent 对七个工程问题作出明确回答：

| 工程责任 | 要回答的问题 | 没有 Harness 时的常见后果 |
| --- | --- | --- |
| Context | 我依据什么当前事实做事？ | 猜架构、拿旧信息当真、重复扫描 |
| Policy | 这一步能否自主执行？ | 越权执行迁移、外部访问、范围扩大 |
| Process | 这是何种任务、采用什么路径？ | feature、bugfix、review 混成随意流程 |
| Observation | 我凭什么说目标达成？ | “应该好了”“测试过” |
| Recovery | 失败后如何收敛？ | 无限尝试、弱化测试、忽略失败 |
| Memory | 什么值得跨任务保存？ | 重复踩坑或污染长期文档 |
| Loop | 中断后如何继续？ | 下一位 agent 从头猜、重复工作、错误续接 |

没有 Harness 时，优秀 agent 在简单、单会话任务里也可能表现很好；差异主要体现于复杂、长周期、跨会话、跨 agent、有外部边界的工作：工程纪律依赖当次 agent 的临场发挥，而不是项目共享约定。

Harness 应提供的价值是：

> 让 agent 更少依赖临时对话记忆和自由发挥，按项目约定完成“先确认、再行动、以证据收尾、失败可交接”的协作过程。

Harness 不应承诺：

- 自动证明 agent 真实执行过命令；
- 自动证明测试结果未伪造；
- 自动判断“既有失败”是否真实；
- 自动保证代码质量；
- 替代 CI、代码审查、Issue/PR 管理或真实运行验收；
- 自动使所有任务都可恢复；
- 自动消除多 agent 冲突。

---

## 4. 实际任务记录反映的主要文档问题

### 4.1 Plan：计划要求不够可操作

实际任务目录中未见 `plan.md`，但大量任务显然属于多步骤、跨模块、有多个验收条件或需要恢复的工作，例如：

- 跨前后端的产品完整度功能；
- 数据库 migration source 与 API/UI 的联动；
- `migrate-product-completeness-to-new` 的跨工程迁移；
- `product-completeness-gap-task` 的跨模块功能和后续阻塞；
- `product-material-completeness-rule-plan` 声称有实施计划，但任务目录没有可复核的计划成品。

原因不是缺少计划模板，而是 Direct / Minimum / Recoverable 的选择条件太抽象、分散，并且 Direct 与 non-trivial 的建档要求存在张力。

#### 需要避免的结果

agent 在结束时把计划塞进 `harness-feedback.md` 的 `performedSteps`，使计划从“执行输入”退化为“完成叙述”。

#### 文档应采用的明确规则

> 只要任务包含两个及以上实现步骤、两个及以上验收标准、跨模块修改、数据/API/migration 影响，或可能跨会话继续，就先创建 `plan.md`。

### 4.2 Observation：记录命令，但未定义证据能证明什么

任务中反复出现：

- focused test 通过；
- build 通过；
- typecheck 失败或被既有错误阻断；
- full suite 失败；
- 浏览器因登录拦截而未完成验收；
- migration 文件已写但未应用到数据库。

这些状态常被记录，但最终结论不总是严格区分。例如：

- `product-material-completeness-template-management/verification.md` 记录 `pnpm test` 失败，但 task record 仍将 `regression-green` 写为 passed；
- `product-completeness-gap-task` 标为 `complete`，却同时有 partial 验收、全量 typecheck 阻断、上传页回归失败、migration 未应用和未接入的后端 endpoint；
- `completeness-style-alignment` 的 status 标为完成，而 task record 仍为 partial，视觉验收是 unknown。

问题不在于 agent 没有保存结果，而在于 Observation 文档没有把不同证据类型的证明边界变成统一口径。

### 4.3 Recovery：status 常退化为摘要，不足以恢复

较好的例子是 `startup-mysql-connection-diagnosis`：它明确记录 stopped、已完成步骤、下一动作和授权前提。

但许多 `status.md` 只有“阶段：完成”或“当前阶段：已完成”，缺少：

- 当前真实状态；
- 最后已验证的证据；
- 剩余未知项；
- blocker / risk；
- 下一条安全动作；
- 恢复条件。

同时，一些典型 Recoverable 工作根本没有 `status.md`。这说明文档把“status 应包含什么”写了出来，却没有足够清晰地规定“何时必须选择 Recoverable”以及“status 与 verification 冲突时谁为准”。

### 4.4 `harness-feedback.md` 负担过重

当前 structured feedback 同时包含：分类、风险、上下文、边界、实施步骤、成功标准、验证映射、Recovery、结果和 review result。

这会造成两个问题：

1. agent 在结束时编写一份完整的合规说明，替代持续维护的 plan/status/verification；
2. 一个文件中的 narrative 容易掩盖各类事实源之间的矛盾。

`harness-feedback.md` 不应同时成为任务的计划、状态、验证和结论主账本。

### 4.5 “既有失败”的归因门槛不够明确

多份任务将全量失败归因为既有错误或当前工作区问题。这一判断可能正确，但现有文档未清晰说明什么证据足以支持它。

“该错误与本任务无关”是容易被合理化滥用的语句。若无基线、失败位置与变更范围不相交的复核，或可信历史记录，它只能是推断，不应升级为“全量回归通过”。

### 4.6 范围变更、deferred 与授权表达不统一

实际记录里，用户缩小范围、发现 API 不足、暂不执行 migration、前端只提示未实现而不调用后端等都存在，但分别散落在：

- `scopeChanges`；
- `reclassificationRationale`；
- `performedSteps`；
- `knownGaps`；
- 自由文本。

这会让“原始任务完成”“缩小后任务完成”“一部分任务 deferred”“被授权执行的动作”难以区分。

### 4.7 Memory 未有效吸收重复阻塞

资源库任务反复出现：

- 前端全量 TypeScript 错误；
- `pnpm test` 的既有失败；
- Maven 编译阻断；
- 未认证浏览器无法做业务验收；
- migration 未执行；
- 领域模型或基础设施缺口。

这些不应无限散落在任务 `knownGaps` 中。否则后续 agent 只会反复写“这是既有错误”，却没有带来源、确认时间、影响范围和刷新条件的项目事实。

### 4.8 文档分层正确，但关键决策过于分散

当前 agent 为完成普通 feature，需要在 Entry、task-triage、feature-development、agent-work README、Observation、Recovery、Loop、task-execution-record、Policy、project context 等多处拼接规则。

这种按需分层是正确的，但以下关键问题应在一个地方闭合：

- 是否创建 `plan.md`？
- 是否创建 `status.md`？
- 何时可以写 `complete`？
- full suite 失败时如何结论？
- 浏览器登录受阻如何影响验收？
- migration source 和 migration applied 有什么区别？
- “既有失败”如何证明？

---

## 5. Entry 的重构建议

Entry 应从“完整工作流手册”收缩为一个真正的短执行合同。其作用是让 agent 在进入项目时知道不可协商的边界，而不是让 agent 在 Entry 中理解全部流程细节。

### 5.1 Entry 应保留的四项约束

```md
Before changing anything:
- Inspect the smallest relevant current workspace evidence.
- Classify the next action under Policy.
- Select the smallest applicable workflow and task material.

Make the smallest task-scoped change.
Do not add unrelated refactors, dependencies, or behavior without re-checking scope and Policy.

Run the smallest checks that prove the requested result.
Unrun checks are unknown; focused checks do not prove full regression.
Do not report complete when material acceptance criteria remain failed, blocked, or unknown.

When work is blocked, handed off, or cannot safely resume from current files alone,
maintain the selected task-local recovery material before stopping.
```

### 5.2 Entry 不应再承担的内容

应从 Entry 移走或明显降级：

```md
Non-trivial tasks must maintain the required structured execution record...
```

原因：这会让 agent 将填写 `harness-feedback.md` 误认为任务主流程，促使其用一份事后总账本替代计划、状态和验证的职责分离。

建议改为：

```md
Use task-local material only when the selected task-material profile requires it.
Task records must reflect observed facts; they do not replace verification or current workspace evidence.
```

### 5.3 Entry 应明确能力边界

建议增加一段短声明：

```md
This Harness defines collaboration constraints and task-recording conventions.
Doctor verifies Harness installation integrity, not that a task's claimed commands,
evidence, or implementation outcome are independently true.
```

这能避免“生成并验证 Harness”被误读为“系统已验证任务结果”。

### 5.4 Entry 中保留七层，但以三项用户价值表达

不建议将“七层协议”作为用户或 agent 的主要心智模型。对外可收敛为：

| 用户可理解的价值 | 内部对应责任 |
| --- | --- |
| 安全开工 | Context + Policy + Process |
| 证据交付 | Act + Observation + Recovery |
| 可续接工作 | Memory + Loop + task materials |

七层保留为生成器与维护者的覆盖模型；对 agent 则按需展开。

---

## 6. Core 的重构建议

Core 应定位为：

> 按需加载的工程协作说明书。

每份文件必须只有一个权威职责，避免相互重复或争夺事实源。

### 6.1 建议的职责划分

| 文件/区域 | 唯一职责 | 不应承担的职责 |
| --- | --- | --- |
| `docs/index.md` | 决策导航：当前任务应读什么 | 重复具体流程 |
| `agent-work/README.md` | Direct / Minimum / Recoverable 的选择及所需文件 | 风险等级、最终验收结论 |
| `process/*.md` | 特定任务类型的实施路径和前置条件 | 重复通用 Observation / Recovery |
| `layers/04-observation.md` | 证据等级、验收结论、unknown/blocked 语义 | 决定 task 文件选择 |
| `layers/05-recovery.md` | 失败、阻塞、既有失败、有界重试 | 定义 status 格式 |
| `layers/07-loop.md` | 恢复读取顺序和 `status.md` 当前状态要求 | 重复完整开发生命周期 |
| `layers/06-memory.md` | 可提升为稳定事实的信息 | 临时任务日志和验证详情 |
| `task-execution-record.md` | 可选的 Harness 反馈/实验记录 | 任务主计划、主状态、主验证来源 |

---

## 7. `agent-work/README.md`：作为唯一的任务材料选择入口

这是最应优先重写的文件。它必须成为“是否创建任务文件”的唯一裁判。

### 7.1 Direct：仅限真正小任务

建议文案：

```md
Use Direct only when all conditions hold:
- one localized change or read-only answer;
- one clear acceptance criterion;
- no meaningful implementation choice;
- no expected handoff or interruption;
- no API, data, migration, security, dependency, or cross-module boundary.

Task material: none.
Report actual evidence and remaining unknowns in the final response.
```

这不意味着“改文件 + 跑测试”自动就是 non-trivial；但只要存在多步骤、多验收或设计选择，就不再适用 Direct。

### 7.2 Minimum：有选择或多验收，就必须先有计划

建议文案：

```md
Use Minimum when the task has:
- two or more acceptance criteria;
- a meaningful implementation choice;
- multiple related edits;
- a compatibility or behavior boundary.

Create before implementation:
- plan.md
```

`plan.md` 保持最小形态：

```md
# Plan

- Goal and non-goals
- Acceptance criteria
- Smallest implementation path
- Planned verification
```

这应直接解决“实现记录详尽、事前计划缺失”的问题。

### 7.3 Recoverable：交接、阻塞、跨模块、跨会话就加 ledger

建议文案：

```md
Use Recoverable when work is:
- multi-stage or cross-module;
- blocked or under repair;
- delegated or parallel;
- likely to span sessions;
- risky enough that another agent must be able to resume safely.

Create:
- plan.md
- status.md
- verification.md when checks start
```

对于跨前后端、数据库 migration、跨工程迁移、并行/委派或存在外部授权依赖的工作，应默认优先考虑 Recoverable。

### 7.4 处理 non-trivial 与 Direct 的关系

必须明确一条单一优先级规则，避免现有冲突：

> non-trivial 是是否需要 Harness feedback 的实验分类，不是 task-material selection。若 non-trivial 与 Direct 的“无 task 文件”产生冲突，任务材料选择优先；仅当任务满足 Direct 的全部条件时才允许无 task 文件。

如果保留“非平凡任务必需 feedback”的政策，则应进一步收紧为：

> 选择 Direct 的任务必须是 trivial；non-trivial 任务至少创建任务目录与所需 feedback。

两种方案只能二选一，不能同时保留模糊描述。

---

## 8. Observation：改为“证据能证明什么”

Observation 的关键不只是保存命令，而是定义命令与验收之间的证明边界。

### 8.1 应加入固定规则

```md
Evidence is scoped. Do not upgrade one evidence type into another:

- Focused test passed ≠ full regression passed.
- Build passed ≠ typecheck passed.
- Typecheck passed ≠ runtime workflow passed.
- Migration source exists ≠ migration applied.
- Unauthenticated browser access ≠ authenticated user acceptance.
- A suspected pre-existing failure ≠ a verified baseline.
```

### 8.2 统一验收结论

| 状态 | 含义 |
| --- | --- |
| `passed` | 所有任务验收条件均有足够通过证据，且没有 material unknown |
| `partial` | 主目标完成，但至少一个验收、环境、集成或人工验收条件未完成 |
| `blocked` | 后续动作需要授权、外部环境、依赖修复或用户决定 |
| `failed` | 当前任务目标或关键验证失败 |
| `unknown` | 证据不足，不能判断 |

应明确：

> 有 material unknown、failed 或 blocked 的验收项时，任务不得标记为 `complete`。

### 8.3 建议增加验收矩阵

在 `verification.md` 的推荐形态前增加：

```md
## Acceptance matrix

| Criterion | Required evidence level | Actual status |
| --- | --- | --- |
| create-template | focused backend test + API integration | passed |
| frontend workflow | focused UI test + authenticated browser check | partial |
| schema readiness | migration source + target DB confirmation | unknown |
| regression | full suite | failed |
```

### 8.4 “既有失败”归因规则

建议加入：

> 当广泛检查失败而 agent 认为失败与当前任务无关时，整体结论只能是 `partial` 或 `unknown`，除非至少满足一项：
>
> 1. 修改前运行过同一检查且得到相同失败；
> 2. 失败位置、错误类型与本次变更范围明确不相交，并已复核；
> 3. 有可信 CI、项目基线或历史任务记录证明该失败早已存在。
>
> 即使确认是既有失败，也必须保留“全量检查未通过”，不得将其表述为“全量回归通过”。

---

## 9. Recovery 与 `status.md`：只表达当前真相

`07-loop.md` 不应再复述完整的 Plan / Act / Observe 生命周期。它应只负责：

1. 恢复时的读取顺序；
2. `status.md` 的当前状态约束；
3. handoff 前必须保存的最小事实。

### 9.1 恢复读取顺序

```md
1. status.md
2. plan.md
3. verification.md
4. current code, configuration, and command output
5. harness feedback only when its classification or boundary affects the next action
```

### 9.2 `status.md` 最低字段

```md
# Task status

- State: active | blocked | partial | complete | stopped
- Goal:
- Last verified evidence:
- Remaining unknowns:
- Blockers / risks:
- Next safe action:
- Resume condition:
```

### 9.3 必须写明的优先级

```md
If verification contains failed, blocked, or material unknown criteria,
status must not say complete.
When status conflicts with verification, verification is authoritative.
```

这样可避免 status 仅作为“完成摘要”，并消除“status complete、verification partial/unknown”的矛盾。

---

## 10. `harness-feedback.md`：从任务总账本退回为 Harness 反馈

当前 feedback 文件承担过多职责。建议优先采用以下方案。

### 推荐方案：改为可选 retrospective

建议名称：

```text
agent-work/tasks/<task>/harness-retrospective.md
```

只记录：

```md
# Harness retrospective

- Which Harness guidance helped?
- Which instruction was ambiguous or costly?
- What task-material choice proved insufficient?
- Candidate documentation improvement:
```

它的作用是反哺 Harness 本身，而不是成为任务计划、状态、验证和最终结论的总账本。

### 备选方案：保留结构化 feedback，但降级为治理扩展

若需要统一任务审计格式，可保留该文件，但必须明确：

> 这是可选的工程治理记录，不是所有非平凡任务的默认必填文件；它不能替代 `plan.md`、`status.md` 或 `verification.md`。

无论选哪种，以下职责必须保持唯一事实源：

- `plan.md`：事前方向；
- `status.md`：当前真相和恢复入口；
- `verification.md`：实际观察；
- feedback/retrospective：对 Harness 的反馈，不承担核心任务事实。

---

## 11. 范围变更、授权、deferred 的统一形态

建议每个实质范围变化都使用一个简短统一段落：

```md
## Scope change

- Before:
- After:
- Trigger: user request | discovered constraint | policy boundary
- Evidence/reference:
- Changed acceptance criteria:
- Deferred or blocked work:
```

必须明确：

> 范围缩小不等于原始任务完成，而是缩小后的任务完成。被延后的验收条件必须从当前 outcome 中移除，或显式标记为 deferred / blocked。

同时应区分：

- 用户要求缩小范围；
- 用户批准扩大范围；
- 现有 API 或架构限制导致目标降低；
- Policy 阻止外部操作；
- 只是实现顺序调整。

---

## 12. Memory：把重复阻塞提升为受控项目事实

建议在 Memory 文档中加入候选提升条件：

```md
Promote a task finding into project context only when:
- it appears in two or more independent tasks;
- it was confirmed by current workspace evidence;
- it has a concrete affected scope;
- it has a refresh condition;
- it states what future tasks may and may not infer from it.
```

例如：

```md
## Known frontend verification baseline

- Scope: `pnpm ts:check` currently fails in <listed paths>.
- Verified at: <date and command>.
- Impact: feature tasks must still run focused checks; the full typecheck remains partial until this baseline is repaired.
- Refresh when: affected configuration, auto-import generation, or listed files change.
```

这样“既有错误”才是可复核项目事实，而不是每个 agent 的惯性表达。

---

## 13. 用一张执行决策卡收束关键规则

不要继续新增更多层级文档。建议在 `docs/index.md` 或 `agent-work/README.md` 开头增加一张一页以内的执行决策卡，回答：

1. Direct / Minimum / Recoverable 怎么选？
2. 各自需要创建哪些文件？
3. 每项验收需要什么层级的证据？
4. focused、build、typecheck、full suite、browser、migration 各证明什么？
5. 广泛检查失败且疑似既有时如何表述？
6. `complete` / `partial` / `blocked` / `failed` / `unknown` 如何区分？
7. `status.md` 与 `verification.md` 冲突时谁为准？
8. 范围缩小、deferred、授权动作如何记录？

这张卡应成为 agent 的首选决策入口；其余文档保持按需展开，提供解释和任务类型细节。

---

## 14. 建议的处理顺序

1. **重写 Entry**
   - 收缩为短合同；
   - 明确 Harness 验证的是安装完整性，不是任务结果真实性；
   - 用“安全开工、证据交付、可续接工作”表达价值。

2. **重写 `agent-work/README.md`**
   - 使其成为唯一的任务材料选择入口；
   - 明确 Direct / Minimum / Recoverable；
   - 解决 non-trivial 与 Direct 的关系。

3. **收束 `04-observation.md`**
   - 明确证据层级和完成状态；
   - 处理 focused/full、build/typecheck、migration source/applied、browser/authentication 的差异；
   - 规定既有失败的归因门槛。

4. **将 `07-loop.md` 限定为恢复协议**
   - 明确 status 是当前真相，不是总结；
   - 定义 status 与 verification 的优先级。

5. **将 `harness-feedback.md` 移出核心任务事实链**
   - 改为可选 retrospective，或至少明确其是治理扩展；
   - 不再替代 plan/status/verification。

6. **清理 Process 文档的重复规则**
   - Feature / Bugfix / Refactor 仅保留各自差异；
   - 通用完成口径只指向 Observation；
   - 通用失败与恢复只指向 Recovery。

7. **补强 Memory 的提升条件**
   - 将跨任务重复出现、已验证的阻塞转化为带刷新条件的项目事实。

---

## 15. 最终建议

Niuma Harness 应从“要求 agent 写一套完整过程记录”的形象，转为：

> 让 agent 在需要时选择正确的最小任务材料；让每份材料只承担一种事实职责；以明确的证据边界决定完成、部分完成或阻塞；在跨会话或交接时保留当前真相。

保留七个工程责任，但不要把它们作为每次任务都必须完整执行的重型协议来推销或使用：

- 对生成器维护者，它们是完整的设计覆盖模型；
- 对 agent，它们是按需加载的决策指南；
- 对用户，它们应收敛为三项可感知收益：安全开工、证据交付、可续接工作；
- 对简单任务，应几乎不可见；
- 对复杂、风险、长周期、多 agent 任务，才逐步展开。

如果 Harness 让普通任务必须读七层、写五份文件，它会成为负担；如果它让复杂任务少一次猜测、少一次越界、少一次把失败说成通过、少一次丢失恢复状态，它就实现了应有价值。
