# jiezhen_harness 可借鉴设计与整合建议

## 1. 结论

`jiezhen_harness` 最值得 `niuma-harness` 吸收的，不是 Spring、Vue、SQL 或“分页统一 POST”这些具体规则，而是其背后的项目知识治理方法：

> 按作用域分层、按任务导航、把长期决策、运行知识、经验与一次性任务记录分离，并为每类知识提供清晰入口。

`niuma-harness` 已经在 Agent 执行过程治理方面较强：入口契约、七层流程、Doctor、Repair、Audit、Artifact Ledger 都比较完整。

相对需要补足的是项目知识如何长期组织、定位、沉淀与判定权威性。因此，不建议把 `jiezhen_harness` 整体搬入模板，而应通过通用核心能力、可选 Profile 和项目专属事实三层进行整合。

```text
niuma-harness
├── 通用协作与执行治理
│   ├── Agent 原生适配
│   ├── 行为边界、验证、恢复、审计
│   ├── 受管产物完整性与修复
│   └── 通用知识治理机制
├── 可选 Profile / Rule Pack
│   ├── multi-application
│   ├── enterprise-docs
│   ├── java-enterprise
│   ├── web-admin
│   └── api-pagination-post
└── 工作区项目专属知识
    ├── 架构、技术栈、应用边界
    ├── 环境、端口、服务依赖
    ├── 运行手册与排障
    ├── 项目规则、ADR、经验
    └── 历史材料与任务记录
```

---

## 2. 建议直接吸收至核心的能力

这些能力跨语言、跨框架、跨项目都适用，不会把 `niuma-harness` 变成 shop-trade 专属工具。

### 2.1 文档地图、任务型阅读路径与事实优先级

#### 可借鉴点

`jiezhen_harness` 不只是堆放文档，而是明确指导 Agent：

```text
收到任务
→ 读取匹配的全局规则
→ 读取目标应用说明
→ 回到 README、构建文件、配置和源码确认事实
→ 根据任务继续读取 QA、运行手册、计划或经验材料
```

其核心思想是：文档用于导航与约束；代码、构建定义、配置和运行结果才是当前可验证事实。

#### 建议纳入的通用规则

```md
## 事实优先级

1. 当前代码、构建定义、部署配置、测试与运行结果
2. 当前项目 README、架构说明和运行手册
3. 规则、ADR、经验文档
4. 历史方案、迁移材料、任务记录

当来源冲突时：
- 不猜测；
- 检查更高优先级来源；
- 在任务记录中说明依据；
- 必要时修正文档或标记为 historical / stale。
```

#### 建议落点

- `templates/core/index.md`
- `templates/core/layers/01-context.md`
- `templates/core/project-context.md`

#### 收益

- 防止 Agent 将历史方案或迁移文档当作当前事实；
- 降低项目文档、配置和源码冲突时的误判；
- 让项目上下文读取更具任务导向。

---

### 2.2 轻量 ADR：让长期决策脱离任务日志

#### 可借鉴点

`jiezhen_harness` 使用简短 ADR 记录长期影响的决策，例如接口分页策略。它通常包含：

- 背景；
- 决策；
- 原因；
- 影响范围；
- 替代方案或范围外事项。

#### 为什么需要

`niuma-harness` 的任务记录中虽然有 `decisionImpact`，但它属于某一次任务的审计数据，不能替代跨任务、长期有效的决策说明。

应明确区分：

```text
任务记录：本次任务做了什么、如何验证、是否恢复。
ADR：某个长期有效的项目/组织决策，以及为何如此决策。
```

#### 建议目录和模板

新增：

```text
templates/core/decisions/
templates/core/decisions/README.md
```

建议 ADR 模板：

```md
# ADR-<序号>-<标题>

- Status: proposed | accepted | superseded | deprecated
- Date: YYYY-MM-DD
- Scope: workspace | application | API | data model

## Context
## Decision
## Consequences
## Alternatives considered
## Verification / migration notes
## Source of truth
```

#### 使用边界

不应要求每个任务都写 ADR。仅对以下情形推荐或要求：

- 跨模块接口约束；
- 数据模型长期变化；
- 公共 API 协议；
- 依赖或框架选型；
- 安全边界；
- 多团队共享的行为规范。

#### Doctor 边界

Doctor 可检查目录、索引和结构是否存在；不应校验 ADR 内容是否“真实正确”。ADR 实例应保持项目维护，而不是被每次 `init` 覆盖。

---

### 2.3 经验库与任务现场记录双轨分离

#### 可借鉴点

`jiezhen_harness` 将规则、决策、经验、方案、运行手册和应用材料分开组织。其经验文档强调：历史口径不等于当前事实，执行前仍须核对当前脚本、配置与代码。

`niuma-harness` 已经分离了：

```text
project-context.md：稳定的项目事实
agent-work/tasks/：单次任务过程、证据、阻塞和恢复记录
```

但还缺少中间层：

> 可复用、具有主题和适用条件、但不是项目全局事实的经验知识。

#### 建议新增

```text
templates/core/experience/
templates/core/experience/README.md
```

同时在 Memory 层明确：任务日志不能直接升级为长期经验。

#### 经验文档建议格式

```md
---
status: active | historical | superseded
scope: workspace | application | subsystem
last_verified: YYYY-MM-DD
source_of_truth: <代码、配置、运行手册或外部链接>
---

# <经验主题>

## Applicable when
## Symptoms / scenario
## Verified approach
## What not to assume
## Expiry / invalidation conditions
```

#### 核心原则

```text
任务日志 ≠ 经验库
经验库 ≠ 当前事实
当前事实仍以代码、配置、构建和实际运行结果为准
```

---

### 2.4 按改动类型选择最小验证集

#### 可借鉴点

`jiezhen_harness` 的 QA 不是抽象要求“要测试”，而是把最低检查与改动类型绑定：SQL、后端、前端各有不同验证关注点，并要求明确未验证内容和剩余风险。

`niuma-harness` 已有更强的证据结构与 `unknown` 语义，不需要复制第二套 QA 系统；应吸收其轻量的“改动类型—验证方向”矩阵。

#### 建议增加到 `templates/rules/common/testing.md`

| 改动类型 | 最低验证方向 |
|---|---|
| 文档 / 规则 | 链接、路径、示例命令、事实来源、索引完整性 |
| 后端代码 | 格式或静态检查、受影响单测、编译或模块测试 |
| 前端代码 | 类型检查、构建、页面或交互验证、网络请求验证 |
| 数据库 / 迁移 | 正向迁移、回滚、数据影响、权限或租户影响 |
| 配置 / 部署 | 配置解析、启动或 dry-run、依赖连通性 |
| API 契约 | 服务端与调用方兼容性、样例、错误路径 |

继续保留既有原则：

```text
- 未运行验证必须记录为 unknown；
- 无法运行时应说明原因、替代验证与剩余风险；
- 不得删除、跳过或弱化测试来制造“通过”。
```

具体命令、环境限制和人工验证步骤仍由工作区 `project-context.md`、runbook 或 Profile 提供，而不是写入通用模板。

---

## 3. 适合做成可选 Profile 或 Rule Pack 的能力

不应把所有有价值的规则都沉入 `common`。建议在现有 `--rules` 基础上引入显式 Profile：

```bash
niuma-harness init <workspace> \
  --agent multi \
  --profile multi-application \
  --profile java-enterprise \
  --rules api-pagination-post
```

Profile 应是一组有名称、版本、生成内容和 Doctor 校验规则的组合，而不仅是散落的 Markdown。

### 3.1 `multi-application`：多应用/多仓工作区 Profile

#### 定位

通用核心已提供多模块知识骨架、根级模块路由和项目维护边界。`multi-application` Profile 面向需要显式应用拓扑和多仓协作治理的工作区，在该基础上补充顶层架构、应用目录、应用级阅读路由和 Profile 专属 Doctor 校验；它不覆盖项目维护的模块知识，也不推断真实架构关系。

#### 可借鉴点

- 顶层架构说明；
- 应用材料目录；
- 每个应用独立入口文档；
- 按应用与任务类型的阅读路由；
- 共享规则与应用事实分离。

#### 建议生成结构

```text
workspace/
├── docs/
│   ├── architecture.md
│   ├── applications/
│   │   ├── README.md
│   │   ├── <app-a>/README.md
│   │   ├── <app-b>/README.md
│   │   └── <app-c>/README.md
│   ├── runbooks/
│   ├── decisions/
│   └── experience/
└── ...
```

#### Doctor 可检查的内容

- 应用清单是否存在；
- `architecture.md` 是否存在；
- 应用入口是否均被索引；
- 文档地图是否包含应用阅读路由；
- 文档链接是否指向存在路径。

Doctor 只验证结构和引用完整性，不验证架构描述、模块清单或应用关系的业务真实性。

---

### 3.2 `java-enterprise`：Java 企业后端 Profile

#### 可借鉴点

- 多模块边界；
- API / Server 分层；
- Controller / Service / DAL 分层；
- 数据库迁移与回滚；
- 权限、租户、数据隔离改动的联动验证；
- Maven 模块级验证。

#### 必须避免的框架绑定

不应把以下内容写入通用 Java 规则：

```text
MyBatis-Plus
TenantBaseDO
固定逻辑删除字段
固定 SQL 目录
特定注解
特定权限模型
Nacos 或 Spring Cloud Alibaba
```

#### 建议实现

```text
templates/rules/java-enterprise/
```

只保留可泛化要求：

```text
- API 契约变更要检查调用方与兼容性；
- 数据库变更要有回滚或明确不可逆说明；
- 权限、租户、数据隔离变更必须做边界验证；
- 多模块变更应列出受影响模块和最小验证集。
```

---

### 3.3 `web-admin`：动态权限后台 Profile

#### 可借鉴点

管理后台的页面改动，常常涉及：

```text
组件
+ 前端路由
+ 菜单元数据
+ 权限状态
+ 后端授权
+ API 封装
+ 刷新后的状态恢复
```

这不是一般官网或静态站点必有的架构，因此应作为 opt-in Rule Pack。

#### 建议规则

```text
templates/rules/web-admin/
```

```text
涉及菜单、路由或权限时，至少检查：
- 后端权限声明或接口保护；
- 菜单/权限元数据；
- 前端动态路由映射；
- 刷新后的权限恢复；
- 无权限场景；
- API 层和页面层的调用边界。
```

---

### 3.4 `api-pagination-post`：特定 API 协议 Rule Pack

#### 可借鉴点

`jiezhen_harness` 对分页统一采用 POST + body 的规范有清晰的全局规则、应用落地和 ADR 支撑。

#### 为什么不能进入 `common`

这与一些项目的以下约束可能冲突：

- REST 风格的 GET 查询；
- CDN 或 HTTP 缓存策略；
- 公共 API 兼容性；
- 已发布的 OpenAPI 契约；
- 既有客户端实现。

#### 正确整合方式

```text
templates/rules/api-pagination-post/
```

通过：

```bash
--rules api-pagination-post
```

显式启用。

建议规则内容：

```text
- 后端、客户端、SDK、Feign/RPC 必须同步更新；
- GET 改 POST 时必须评估兼容性；
- 例外必须记录于 ADR 或协议说明；
- 新旧协议并行期需说明迁移窗口；
- 不能用任务审计的 self-report 判定接口真实合规。
```

---

### 3.5 `enterprise-docs`：文档治理与运行手册 Profile

#### 可借鉴点

`jiezhen_harness` 的编号目录适合中文企业项目、多人协作和长生命周期系统：

```text
00-项目总览
20-设计与架构
30-接口与协议
40-开发与实现
50-测试与质量
90-归档与历史
```

#### 建议

作为可选 Profile：

```bash
--profile enterprise-docs
```

只生成：

- 目录骨架；
- 索引模板；
- 文档状态约定；
- runbook 模板；
- 草稿和归档约定。

不生成任何业务事实、端口、地址、服务依赖或运行命令。

---

## 4. 必须保持在项目专属层的内容

以下内容不能进入 `niuma-harness` 核心模板，也不建议直接作为通用 Profile 的正文。

### 4.1 环境、端口、服务依赖与私有基础设施

包括：

```text
Nacos / MySQL / Redis / Nexus
服务启动顺序
私网地址
注册中心分组
服务端口
本地环境变量
```

应由工作区维护在：

```text
project-context.md
docs/runbooks/
docs/applications/<app>/
```

原因：强环境依赖、容易过期、不同组织差异很大，并且可能涉及敏感基础设施信息。

---

### 4.2 破坏性 SQL 清理口径

如保留某些用户/部门/角色、重排 ID、修改自增值等，均高度绑定具体表结构和数据范围。

核心模板只应保留通用要求：

```text
- 先核验当前数据和脚本；
- 明确保留范围；
- 明确事务与回滚；
- 说明不可逆影响；
- 记录未执行风险。
```

不应泛化任何具体 SQL 策略。

---

### 4.3 具体技术选型、模块清单与供应商信息

例如：

```text
Spring Cloud Alibaba
Spring AI
Qdrant / Milvus
模型供应商
特定包路径
特定 Maven 结构
WebMVC / WebFlux 的项目决策
```

这些都应存于应用级入口和项目事实文档，而不应进入通用 `templates/rules/java/` 或 core docs。

---

### 4.4 当前测试清单、一次性设计与历史修复报告

例如具体 Controller 的测试数量、某个字段设计方案、历史迁移记录等，应归入：

```text
docs/plans/
docs/experience/
docs/decisions/
agent-work/tasks/
```

它们不能成为新工作区初始化时的通用标准。

---

## 5. 必须避免的反模式

### 5.1 不把大型项目入口文档变成常驻上下文

不要将上千行项目 `CLAUDE.md` 原样放进通用入口模板。否则会产生：

```text
上下文膨胀
+ 高频规则被低频历史材料淹没
+ 规则版本漂移
+ Agent 的读取与选择成本升高
```

应继续保持当前模式：入口只包含操作循环和导航，深层文档按任务读取。

---

### 5.2 不把项目 P0 规则升级成通用规则

以下都可能在某个项目完全正确，但不是通用事实：

```text
分页必须 POST
必须 TenantBaseDO
必须 MyBatis-Plus
必须固定 SQL 目录
必须某种菜单权限模型
```

通用 CLI 的核心规则应保持：

```text
原则性
可组合
不绑定框架
不绑定公司基础设施
不绑定业务数据模型
```

---

### 5.3 不让 Doctor/Audit 假装验证文档真实性

职责边界应保持清晰：

```text
Doctor = 受管 Harness 的安装与完整性
Audit  = 任务叙述、证据映射与状态一致性
CI / 日志 / 运行结果 = 客观执行事实
```

Doctor 可以验证目录、文件、链接、manifest、模板摘要和 Agent 适配产物。

Audit 可以验证任务记录是否完整、是否自相矛盾、是否遗漏 unknown 状态。Audit 运行前要求 Doctor 健康，因此 topology route、registry 或 supplement ownership 的完整性错误会使 Audit 因 Harness 不健康而失败；这只是安装健康前置条件，不代表 Audit 已验证模块业务拓扑或项目事实。

两者都不能验证：

```text
文档里的端口是否真实
命令是否真正执行
测试报告是否伪造
Agent 是否实际阅读过源码
```

---

### 5.4 不把环境运行手册写进工具管理模板

运行命令、端口、私服、环境变量经常变化。将其复制进 tool-managed 模板会导致：

- 重新初始化覆盖项目真实知识；
- 模板被环境细节污染；
- 私有基础设施信息不必要地扩散。

它们应始终是项目维护的内容或本地 Profile 数据。

---

## 6. 推荐演进路线

### P0：先补知识治理基础

#### 6.1 引入事实优先级与任务型阅读路由

修改：

```text
templates/core/index.md
templates/core/layers/01-context.md
templates/core/project-context.md
```

验收标准：

- 新生成 Harness 明确说明文档、配置、代码、运行结果的优先级；
- 文档冲突时有明确处置规则；
- Agent 能按任务类别找到规则、项目事实和代码入口。

#### 6.2 新增 `docs/decisions/` 与 `docs/experience/`

修改：

```text
templates/manifest.json
templates/core/index.md
templates/core/layers/06-memory.md
```

验收标准：

- 任务记录、ADR、经验、项目事实有明确归属；
- 一次性任务日志不会被直接升级为长期知识；
- 经验记录包含适用范围、最后核验时间和事实来源。

#### 6.3 增加通用最小验证矩阵

修改：

```text
templates/rules/common/testing.md
```

验收标准：

- 覆盖文档、代码、配置、数据库和 API 五类常见改动；
- 保持现有 `unknown` 与未验证风险语义；
- 不绑定具体语言、框架或命令。

#### 6.4 已确认的 P0 实施边界

本阶段只完善初始化项目的通用知识治理，不实现 Profile，也不加入任何 Jiezhen/组织专属技术规范。

**事实优先级：**

```text
1. 当前代码、构建定义、部署配置、测试与运行结果
2. 当前项目 README、project-context.md、项目维护的 runbook
3. Rules、已接受 ADR、active experience
4. 历史/已废弃材料、迁移说明、计划与任务记录
```

来源冲突时，Agent 必须核验更高优先级来源、在任务本地记录判断依据与未解决冲突；只有核验后才能修正或标记 stale/historical 文档。

**新增生成目录与归属：**

```text
<harness-dir>/docs/decisions/README.md   # tool-managed：ADR 分类、模板与使用边界
<harness-dir>/docs/experience/README.md  # tool-managed：经验格式、核验与失效边界
```

- `docs/decisions/*.md`：项目维护的长期、重要决策理由；不等同任务记录，也不证明当前实现。
- `docs/experience/*.md`：项目维护的可复用经验；必须包含适用范围、最后核验时间、事实来源和失效条件；不能覆盖当前代码、配置、测试或运行事实。
- `project-context.md`：已核验、稳定的当前项目事实。
- `agent-work/tasks/<task>/`：当前任务计划、状态、证据、阻塞、恢复与交接；不得整体提升为 ADR 或经验。

**验证矩阵与 TDD 的关系：**

验证矩阵只帮助按文档、后端、前端、数据库/迁移、配置/部署、API 契约选择补充证据方向；它不能替代既有的强制实用 TDD。可稳定自动化的业务行为变化和 bug 回归仍必须执行：

```text
RED → 同一目标 GREEN → 可选 REFACTOR
```

**旧内容保护：**

若首次 `init` 前已经存在以下路径，不能静默覆盖：

```text
<harness-dir>/docs/decisions/README.md
<harness-dir>/docs/experience/README.md
```

应在任何写入前失败，列出全部冲突路径并保持工作区不变；由用户自行移动、合并或重命名旧内容。生成 Harness 后，受管 README 正常由 init / Doctor / Repair 管理，但用户创建的具体 ADR 与经验文件必须保留。

#### P0.1–P0.5 完成状态

- P0.1：已完成。生成文档提供事实优先级与按任务读取的导航，并要求以代码、配置、构建、测试和运行结果核验当前事实。
- P0.2：已完成。生成 `docs/decisions/README.md`，定义长期 ADR 的归属、模板和使用边界。
- P0.3：已完成。生成 `docs/experience/README.md`，定义可复用经验与任务记录、项目事实的分层及核验/失效要求。
- P0.4：已完成。`common/testing.md` 提供文档、后端、前端、数据库/迁移、配置/部署和 API 契约的最小验证方向；它补充而不替代既有强制实用 TDD，并保留 unknown、替代验证和剩余风险记录要求。
- P0.5：已完成。已提供独立于 Profile 的多模块 topology 基础：`init --modules` 与受限的 `--topology discover`、项目维护的 `modules.json`、schema 3 topology ownership、根级模块路由和模块入口 supplement。新入口提供职责与边界、依赖与消费者、构建/测试/启动命令、源码/测试入口、配置位置、限制/风险/已知问题、跨模块验证触发条件的空章节；`init` 不填写项目事实，项目与 Agent 只在核验后维护 marker 外知识区。Doctor 校验 topology、registry、根路由和受管 supplement block；Repair 只恢复根级受管路由，对 registry 与模块本地入口保持保守诊断边界。

**P0 明确不做：**

- 不加 `--profile`，不实现 Profile 选择、版本状态、组合或冲突检测；
- 不生成真实的应用地图、runbook、计划、归档或中文企业编号目录；仅生成通用模块知识导航骨架，不填充模块职责、依赖、运行命令、端口或架构关系等项目事实；
- 不加入 Java 企业、动态权限后台、分页 POST、Spring/Vue/SQL、端口、基础设施或任何 shop-trade 专属规则；
- Doctor 校验受管文件、目录、artifact、根级 topology route，以及 registry 与已安装 topology / supplement ownership 的结构和完整性；不判断 `modules.json`、ADR、经验、模块说明、模块依赖或模块边界的业务真实性，也不校验 module supplement marker 外项目维护内容。
- Audit 仍只审计任务记录与 Harness 健康前置条件，不审计模块或 topology 的业务真实性。

---

### P1：引入 Profile 能力

P0 已提供独立于 Profile 的多模块 topology 基础：`init --modules` / `--topology discover`、项目维护的 `modules.json`、schema 3 topology ownership、根级模块路由、module supplements、Doctor topology 完整性校验，以及对用户维护 topology 内容的保守 Repair 边界。P1 只引入显式、可组合、版本化的 Profile；不得把既有通用 topology 重命名或重实现为 `multi-application` Profile。`multi-application` 在显式启用时增加多应用/多仓拓扑、应用级阅读路由和按 Profile 的 Doctor 完整性校验，并且不得覆盖项目维护的 `modules.json`、marker 外模块知识或 supplements 外内容。

建议目标接口：

```bash
niuma-harness init <workspace> --profile <name>
```

第一批 Profile：

```text
multi-application
enterprise-docs
java-enterprise
web-admin
```

建议涉及模块（至少）：

```text
新增 Profile registry / resolver / compatibility validation
src/args.js
src/cli.js
src/scaffold.js
src/scaffold/desired-state.js
templates/manifest.json
src/harness-status.js
src/doctor/checks.js
src/repair/state.js
src/repair/planner.js
```

验收标准：

- Profile 名称和版本写入生成状态；
- 重新初始化稳定识别已启用 Profile；
- Doctor 只校验已启用 Profile 的产物；
- 未启用 Profile 的工作区不会被附加目录或规则干扰；
- 已有通用 topology 的工作区启用 `multi-application` 时，不覆盖项目维护的 `modules.json`、marker 外模块知识或 supplements 外内容；
- 多 Profile 可组合并具备冲突检测。

---

### P2：将组织规范转为显式 Rule Pack

逐步提供：

```text
api-pagination-post
java-enterprise
web-admin-dynamic-permission
enterprise-docs-cn
```

不要一开始塞进核心模板；先以 opt-in Rule Pack 形式运行、验证和迭代。

---

## 7. 总结

一句话总结：

> `niuma-harness` 应学习 `jiezhen_harness` 的项目知识导航、分层沉淀、长期决策与运行手册治理；但不应复制其项目技术细节、环境信息和具体业务规范。

最值得优先整合的四项：

1. 事实优先级与任务型文档地图；
2. 轻量 ADR 机制；
3. 经验库与任务记录分层；
4. 按改动类型选择最小验证集。

这些能力能增强 `niuma-harness` 在真实项目中的可落地性，同时保持其作为通用、多 Agent Harness CLI 的可移植性。
