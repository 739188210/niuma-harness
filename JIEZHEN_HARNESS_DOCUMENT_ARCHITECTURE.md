# jiezhen_harness 文档体系：关系、流转与治理梳理

## 1. 总结

`jiezhen_harness` 是 `shop-trade` 多项目系统的 AI 协作知识库与导航层，不是业务代码仓，也不是运行状态的最终事实来源。

其核心职责是帮助开发者或 AI 快速判断：

- 当前任务涉及哪个应用和哪些模块；
- 应该先读哪些规则、应用说明与专题资料；
- 改动会影响哪些前后端、SQL、权限、服务依赖或运行环境；
- 应如何验证；
- 哪些内容应作为规则、决策、经验、计划或历史资料沉淀。

核心原则：

```text
Harness 文档 = 导航、约束、经验与协作上下文
原子项目源码 = 当前可验证事实
```

当 Harness 文档与当前代码、构建文件、配置、SQL、测试或实际运行结果冲突时，以当前可验证事实为准，并应回写修正文档或将历史材料标记为过期。

相关依据：

- `jiezhen_harness/AGENTS.md:18-34`
- `jiezhen_harness/docs/index.md:15-24`
- `jiezhen_harness/docs/applications/README.md:16-20`

---

## 2. 文档关系总图

```text
任务接收
  │
  ▼
AGENTS.md
  │  定义任务分流、阅读顺序、事实优先级
  ▼
docs/index.md
  │  选择任务类型与文档路径
  ├─ 全局事实
  │   ├─ architecture.md
  │   ├─ stack.md
  │   └─ conventions.md
  │
  ├─ 通用规则
  │   ├─ rules/common/**
  │   ├─ rules/java/patterns.md
  │   └─ rules/web/patterns.md
  │
  ├─ 应用入口
  │   └─ applications/<application>/CLAUDE.md
  │        ├─ 应用级协议、设计、测试和运行材料
  │        └─ 指向真实原子项目
  │
  ├─ 质量与运行
  │   ├─ qa/quality-gates.md
  │   └─ runbooks/local-dev.md
  │
  └─ 长期沉淀
      ├─ decisions/
      ├─ experience/
      └─ plans/

应用文档之后必须回到：
原子项目 README / pom.xml / package.json / 配置 / SQL / 源码 / 测试
  │
  ▼
实施与真实验证
  │
  ▼
知识回流：规则、应用材料、ADR、经验、计划、运行手册或历史归档
```

---

## 3. 文档层次与职责

### 3.1 总入口：`AGENTS.md`

**作用：** 每个任务的首读入口，定义 Harness 边界、阅读顺序和任务分流。

关键内容：

- Harness 是 AI 协作文档骨架，不是业务代码仓；
- 每次任务先读 `AGENTS.md`，再读 `docs/index.md`；
- 不同任务类型分别进入 Java、Web、SQL、QA、运行或应用文档路径；
- 涉及具体子项目时，必须回到原子项目的构建文件、配置和源码确认。

关键位置：

- `AGENTS.md:3-6`：定位与首读要求；
- `AGENTS.md:18-24`：默认阅读顺序；
- `AGENTS.md:26-34`：事实优先级；
- `AGENTS.md:47-55`：任务分流。

关系：

```text
AGENTS.md
  → docs/index.md
  → rules/**
  → applications/<app>/CLAUDE.md
  → 原子项目事实文件与源码
```

---

### 3.2 文档地图：`docs/index.md`

**作用：** 回答“什么时候读哪里”，而不替代具体文档内容。

关键位置：

- `docs/index.md:1-3`：文档地图定位；
- `docs/index.md:5-13`：核心入口；
- `docs/index.md:15-24`：默认阅读优先级；
- `docs/index.md:26-97`：六个应用入口；
- `docs/index.md:98-123`：后端、UI、Portal、SQL、QA、文档更新路径。

默认阅读链：

```text
1. 全局规则 rules/**
2. 目标应用 CLAUDE.md
3. 原子项目 README / pom.xml / package.json / 配置
4. 当前源码、SQL、测试与运行结果
```

它隐含的职责分工：

```text
规则：约束做法
应用文档：提供项目上下文
构建与配置：确认工程事实
源码与运行结果：最终证据
```

---

### 3.3 全局项目事实层

| 文档 | 职责 | 何时读取 | 核心要点 |
|---|---|---|---|
| `docs/architecture.md` | 项目拓扑、模块边界与跨项目影响 | 跨服务、菜单权限、前后端联动、网关、模块依赖 | system/business/ai/ui/material/portal 关系；UI 动态菜单；Portal SSR 独立性 |
| `docs/stack.md` | 技术栈、常用命令和环境限制 | 构建、测试、启动、环境问题排查 | Java/Spring/Maven、Vue/Vite/pnpm、Nacos/MySQL/Redis 等 |
| `docs/conventions.md` | 通用协作、SQL、代码与文档约束 | 代码、SQL、文档、协作边界变更 | 文档归属、SQL 字段/回滚、Controller 分层、避免改无关文件 |
| `docs/applications/README.md` | 应用迁移材料说明 | 进入应用材料前 | 应用资料与原子项目事实文件如何配合 |

#### `architecture.md`

关键位置：`docs/architecture.md:3-79`

顶层结构：

```text
shop-trade
├── system      基础设施、网关、系统管理
├── business    业务聚合与领域模块
├── ai          AI 能力服务
├── ui          管理后台
├── material    素材库
└── portal      Nuxt SSR 前台门户
```

跨项目重点：

```text
system 的用户、角色、菜单、权限
  ↓
UI 的动态路由、页面权限与按钮权限

business
  ↓
system / infra / AI / material 的依赖与协作

UI / Portal 请求
  ↓
env + Axios/请求层 + 网关 + 服务状态
```

---

## 4. 规则层：约束“怎么改”

目录：

```text
docs/rules/
├── common/
├── java/
└── web/
```

规则负责跨应用复用的行为约束，通常优先于应用内的普通说明和历史材料。

### 4.1 Common 规则

#### 分页协议：`rules/common/api-page-method.md`

关键位置：`docs/rules/common/api-page-method.md:1-61`

适用范围：

```text
/page
/table/page
/copy/page
```

规则：

```text
后端：@PostMapping + @RequestBody
前端：request.post({ url, data: params })
Feign/RPC：POST + @RequestBody
```

不强制改造的内容：

```text
/get
/list
/download
/export
```

规则关系：

```text
ADR：解释为什么分页统一 POST
  ↓
全局分页规则：定义跨项目强制要求
  ↓
应用级分页专题：定义本应用范围、落地项和例外
  ↓
Controller / API / Feign / 前端代码：真实实现与验证
```

对应决策：`docs/decisions/002-page-query-use-post.md:16-29`。

#### 代码审查：`rules/common/code-review.md`

关键位置：`docs/rules/common/code-review.md:1-17`

重点风险：

```text
数据丢失
权限绕过
租户隔离
编译失败
运行时异常
SQL 执行顺序
菜单权限与动态路由
测试验证缺失
密钥/token 泄露
```

#### 测试：`rules/common/testing.md`

关键位置：`docs/rules/common/testing.md:1-18`

最低验证选择：

| 改动类型 | 验证方向 |
|---|---|
| 文档 | 路径、链接、编码、关键词、索引 |
| SQL | 顺序、分号、关键表、静态风险；真实执行需确认数据库 |
| Java | Maven compile/test |
| 前端 | `ts:check`、lint、build、手动验证 |

最终交付必须说明：

```text
运行过什么命令
命令结果如何
哪些未运行
未运行原因
剩余风险
```

#### 文档标准：`rules/common/harness-doc-standard.md`

关键位置：

- `docs/rules/common/harness-doc-standard.md:1-17`
- `docs/rules/common/harness-doc-standard.md:18-45`
- `docs/rules/common/harness-doc-standard.md:132-145`

约束：

```text
文档放在正确分类
代码块必须声明语言
接口结构不应只用截图表达
新增长期文档后要补索引或应用入口
文档和代码冲突时要修正或标记状态
```

---

### 4.2 Java 规则：`rules/java/patterns.md`

关键位置：

- `docs/rules/java/patterns.md:1-29`
- `docs/rules/java/patterns.md:30-224`
- `docs/rules/java/patterns.md:225-243`

覆盖：

```text
api / server 模块边界
Controller / Service / DAL 分层
DO、主键、租户、数据权限
SQL、菜单权限、接口权限联动
Hutool StrUtil / Assert 约束
```

菜单或权限改动的联动链：

```text
后端 @PreAuthorize
+ system_menu SQL
+ 前端菜单与按钮权限
+ 动态路由
+ 角色数据
```

---

### 4.3 Web 规则：`rules/web/patterns.md`

关键位置：

- `docs/rules/web/patterns.md:1-39`
- `docs/rules/web/patterns.md:40-198`

覆盖：

```text
pnpm
Vue 3 + TypeScript + script setup
Element Plus
动态路由与权限
请求层集中于 src/api/**
表单、抽屉、弹窗、分页表格
交互反馈与页面组织
```

前端请求分层：

```text
页面组件
  ↓
src/api/**
  ↓
统一请求层
  ↓
token、租户头、错误处理、网关请求
```

---

## 5. 应用层：六个实际应用的工作入口

每个应用 `CLAUDE.md` 的职责是：

```text
应用是什么
模块如何划分
如何启动
依赖什么
改这类功能要注意什么
真实构建、配置与代码入口在哪里
```

| 应用 | 首读入口 | 适用任务 | 核心要点 |
|---|---|---|---|
| system | `applications/shop-trade-service-system/CLAUDE.md` | Gateway、system、infra、基础权限、框架、初始化 SQL | 基础设施底座；影响 UI 菜单/权限；依赖 Nacos/MySQL/Redis |
| business | `applications/shop-trade-service-business/CLAUDE.md` | 业务模块、DO/VO/Service/Mapper、业务 SQL、测试 | api/server 双模块；租户、数据权限、迁移/回滚、P0 SQL 规范 |
| ai | `applications/shop-trade-service-ai/CLAUDE.md` | 对话、知识库、向量检索、工作流、模型配置 | 独立 AI 服务；Spring AI、向量库、system/infra API 依赖 |
| ui | `applications/shop-trade-service-ui/CLAUDE.md` | Vue 后台、菜单、权限、路由、API、构建 | 动态菜单路由；Pinia、Axios、pnpm、类型检查 |
| material | `applications/shop-trade-service-material/CLAUDE.md` | 素材分类、主档、引用、素材服务 | 独立素材库；禁止反向依赖 business 实现包 |
| portal | `applications/shop-trade-service-portal/CLAUDE.md` | Nuxt SSR、SEO、前台商品和搜索 | 不走后台菜单；关注 Nuxt env、SSR、SEO、sitemap |

### 5.1 System

关键位置：

- `applications/shop-trade-service-system/CLAUDE.md:5-24`
- `applications/shop-trade-service-system/CLAUDE.md:72-131`
- `applications/shop-trade-service-system/CLAUDE.md:161-220`

典型任务：

```text
Gateway
system/infra
用户、角色、菜单、权限
框架 starter
初始化 SQL
多租户与基础设施
```

### 5.2 Business

关键位置：

- `applications/shop-trade-service-business/CLAUDE.md:5-25`
- `applications/shop-trade-service-business/CLAUDE.md:69-119`
- `applications/shop-trade-service-business/CLAUDE.md:139-183`
- `applications/shop-trade-service-business/CLAUDE.md:397-455`
- `applications/shop-trade-service-business/CLAUDE.md:625-678`

模块分工：

```text
api：跨模块 API、DTO、枚举、常量
server：Controller、Service、DAL、配置、任务等实现
```

强调：

```text
bigint 自增
基础审计字段
租户字段
数据权限
DO 继承 TenantBaseDO
SQL migration / rollback
事务与文件头
编号化文档目录
```

### 5.3 AI

关键位置：

- `applications/shop-trade-service-ai/CLAUDE.md:5-27`
- `applications/shop-trade-service-ai/CLAUDE.md:28-57`
- `applications/shop-trade-service-ai/CLAUDE.md:119-181`

覆盖：

```text
chat
image
write
mindmap
knowledge
workflow
music
trace
model configuration
```

技术和边界：

```text
Java 17 + Spring Boot 3.5.9
Spring AI
TinyFlow
Qdrant / Redis Vector / Milvus
依赖 system / infra API
使用 Spring MVC，不使用 WebFlux
```

### 5.4 UI

关键位置：

- `applications/shop-trade-service-ui/CLAUDE.md:5-30`
- `applications/shop-trade-service-ui/CLAUDE.md:91-103`
- `applications/shop-trade-service-ui/CLAUDE.md:124-160`
- `applications/shop-trade-service-ui/CLAUDE.md:181-214`

重点：

```text
Vue 3 / Vite 5 / TypeScript / Element Plus / Pinia
后端菜单驱动，前端运行时动态路由
请求层集中于 Axios service/config
pnpm
默认优先 ts:check、eslint、stylelint
```

### 5.5 Material

关键位置：`applications/shop-trade-service-material/CLAUDE.md:1-43`

边界：

```text
独立素材库应用
可依赖 infra-api / system-api
禁止反向依赖 business 实现包
表前缀：shop_material_*
接口前缀：/admin-api/material*
```

### 5.6 Portal

关键位置：`applications/shop-trade-service-portal/CLAUDE.md:1-56`

边界：

```text
独立 Nuxt 3 SSR 前台
首页、商品详情、分类、搜索、多语言、SEO
不走后台菜单动态路由
关注 nuxt.config.ts、head、sitemap、环境变量
```

---

## 6. 专题材料如何与应用入口衔接

应用 `CLAUDE.md` 是总入口；专题文档是局部细节和历史沉淀。

以分页链路为例：

```text
docs/decisions/002-page-query-use-post.md
  ↓ 解释长期决策原因
rules/common/api-page-method.md
  ↓ 定义跨项目必须遵守的规则
applications/<app>/30-接口与协议/page-query-convention.md
  ↓ 说明具体应用的范围、落地项和例外
原子项目 Controller / API / Feign / 前端请求代码
  ↓ 当前实现与真实验证
```

应用级分页资料：

- System：`applications/shop-trade-service-system/30-接口与协议/page-query-convention.md`
- Business：`applications/shop-trade-service-business/30-接口与协议/page-query-convention.md`
- AI：`applications/shop-trade-service-ai/30-接口与协议/page-query-convention.md`
- UI：`applications/shop-trade-service-ui/30-接口与协议/page-query-convention.md`

理想职责：

```text
ADR：为什么
全局规则：统一要求
应用专题：适用范围、例外和落地清单
代码：当前真实实现
测试：是否真正有效
```

---

## 7. 质量与运行层

### 7.1 QA

入口：`docs/qa/README.md:1-9`

核心门禁：`docs/qa/quality-gates.md:1-39`

流转：

```text
任务完成前
  ↓
quality-gates.md
  ↓
应用 CLAUDE.md 的构建/测试命令
  ↓
原子项目本地测试说明
  ↓
执行验证，或说明无法验证
  ↓
最终说明改动、命令、结果、未验证项与风险
```

| 类型 | 最小核验 |
|---|---|
| SQL | 关联关系、自增、顺序、分号、回滚影响 |
| Java | Maven compile/test、模块边界、权限与数据隔离 |
| UI | `ts:check`、eslint、stylelint、动态路由与权限 |
| 分页 | 避免 `/page` 使用 GET 或 `request.get` |
| 文档 | 路径、索引、链接、事实来源、状态 |

### 7.2 本地运行手册

文件：`docs/runbooks/local-dev.md:1-60`

作用：

```text
UI/Portal 启动
后端依赖检查
服务启动顺序
Nacos group 限制
Maven、Nacos、404、菜单不显示等排障
```

记录的推荐启动顺序：

```text
Gateway
→ System
→ Infra
→ Material
→ Business
→ AI
```

位置：`docs/runbooks/local-dev.md:35-43`

运行事实的优先级：

```text
stack.md：技术栈、命令与环境约束
  ↓
runbooks/local-dev.md：操作路径与排障
  ↓
应用 CLAUDE.md：应用特有依赖、端口与模块说明
  ↓
当前 application*.yaml / env / Nacos / 实际启动输出：最终事实
```

---

## 8. 长期知识沉淀与回流

### 8.1 Decisions：长期“为什么”

目录：`docs/decisions/`

当前：

- `001-init.md`：Harness 建立与文档归属决策；
- `002-page-query-use-post.md`：分页统一 POST 的背景、决策与影响。

职责：

```text
背景
→ 决策
→ 影响
→ 适用边界
```

适用于跨模块 API、架构、数据模型、工具选型、协作规则等持久性决策。

### 8.2 Experience：可复用经验

目录：`docs/experience/`

典型文件：`sql-cleanup-retention.md`

正确使用方式：

```text
某次问题处理
  ↓
发现可复用且稳定的风险模式
  ↓
沉淀为经验
  ↓
下次类似任务先读经验
  ↓
仍要回到当前 SQL、代码、配置或数据库核验
```

经验不是当前事实，更不能脱离当前表结构和数据直接执行。

### 8.3 Plans：待实施或可复盘方案

目录：`docs/plans/`

例子：`plans/2026-06-12-product-main-img-design.md`

它描述需求设计、字段、后端/前端改动面、迁移和回滚、预期验证。

理想流转：

```text
需求
  ↓
plan
  ↓
设计 / 实施
  ↓
代码、SQL、测试
  ↓
长期规则或协议 → decisions/
可复用问题处理 → experience/
启动排障知识 → runbooks/
已失效材料 → archive/history 或 deprecated 标记
```

---

## 9. 从任务接收至交付的推荐路径

### 9.1 后端功能开发

```text
AGENTS.md
→ docs/index.md
→ rules/common/**
→ rules/java/patterns.md
→ applications/<目标应用>/CLAUDE.md
→ 原子项目 pom.xml、README、application*.yaml
→ Controller / Service / Mapper / DO / SQL / 测试
→ qa/quality-gates.md
→ Maven compile/test 或明确未验证风险
→ 必要时回流更新 decision / experience / index
```

依据：`docs/index.md:98-103`。

### 9.2 管理后台页面、菜单或权限改动

```text
AGENTS.md
→ docs/index.md
→ rules/web/patterns.md
→ 分页时读 api-page-method.md
→ shop-trade-service-ui/CLAUDE.md
→ package.json、permission.ts、store、routerHelper、src/api/**
→ 涉及权限时补读 Java rules 和 system/business 文档
→ 检查 system_menu、@PreAuthorize、动态路由和页面权限
→ ts:check / eslint / stylelint / 手动验证
→ QA 交付说明
```

涉及菜单与权限，至少核对：

```text
permission.ts
user / permission store
routerHelper
后端菜单数据
后端权限注解
```

### 9.3 SQL 清理或初始化脚本调整

```text
AGENTS.md
→ docs/index.md
→ experience/sql-cleanup-retention.md
→ conventions.md
→ 目标应用 CLAUDE.md
→ 当前最新 SQL、关联表、迁移/回滚
→ 静态检查或确认后执行数据库验证
→ 回写经验或记录新增风险
```

关键原则：

```text
不能根据旧经验直接执行清理 SQL。
必须以当前 SQL、当前表结构和实际数据为准。
```

### 9.4 新增或更新长期文档

```text
AGENTS.md
→ docs/index.md
→ conventions.md
→ harness-doc-standard.md
→ 判断文档类型
→ 写入正确位置
→ 更新 index 或应用入口
→ 核验与当前代码/配置不冲突
```

文档归属建议：

```text
跨项目强制规则 → rules/
应用专属长期事实 → applications/<app>/
长期决策 → decisions/
复用经验 → experience/
待实施方案 → plans/
启动与排障 → runbooks/
过时资料 → archive/history 或 deprecated
```

---

## 10. 当前关键断点与冲突

### 10.1 P0：知识库检索跨服务通信方案冲突

同一主题中存在相互冲突的 Dubbo 与 Feign 叙述：

- Dubbo 推荐：
  `applications/shop-trade-service-business/docs/20-设计与架构/AI 知识检索文档/知识库检索功能检查报告.md:71-103`
- Dubbo 已完成：
  `.../知识库检索功能修复报告.md:3-17`
- 后续 Feign 替代设计：
  `.../知识库检索-RPC转Feign设计文档.md:15-109`

风险：开发者可能依据不同文档引入相反的依赖、注解与接口包装方式。

建议：

```text
以当前 ai-api、ai-server、business-server 的 POM 和调用代码为准。
确认现用通信方式。
最终方案标为 current。
其他方案标为 historical 或 superseded，并互相链接。
```

### 10.2 P0：全局分页 POST 规则与 GET `/page` 历史示例冲突

全局要求：

- ADR：`docs/decisions/002-page-query-use-post.md:16-29`
- Rule：`docs/rules/common/api-page-method.md:3-60`

但仍有 GET 示例：

- Business Controller 测试说明：
  `applications/shop-trade-service-business/50-测试与质量/README_测试说明.md:24-36`
- AI 日志拦截器接口说明：
  `applications/shop-trade-service-ai/docs/40-开发与实现/AI模块-接口说明-API访问日志拦截器实现说明-20250220-leo.md:310-328`

建议：将这些材料标为“历史示例/待迁移”，或更新为 POST；真实历史例外应在应用协议中显式登记。

### 10.3 P1：测试现状与测试说明冲突

- Business 入口称未发现 `src/test/java`：
  `applications/shop-trade-service-business/CLAUDE.md:55-67`
- 测试说明称有 27 个 Controller 测试：
  `applications/shop-trade-service-business/50-测试与质量/README_测试说明.md:9-36`
- 同时又说明测试依赖被注释，需解除才能运行：
  `.../README_测试说明.md:232-256`

风险：QA 可能错误假设测试已可运行或已得到验证。

建议建立应用级单一事实页：

```text
当前测试状态
可运行命令
已验证日期
依赖条件
未覆盖范围
实际输出链接或摘要
```

### 10.4 P1：总索引覆盖不完整

`docs/index.md` 未显式覆盖所有长期材料，例如：

```text
decisions/**
plans/**
qa/README.md
code-review.md
testing.md
harness-doc-standard.md
各应用专题设计、测试和运行材料
```

建议：

```text
总索引增加 ADR、计划、经验、QA、审查、文档维护的入口。
每个应用入口增加“现行专题 / 设计中 / 历史专题”清单。
```

### 10.5 P1：迁移材料缺少状态、事实源和替代关系

大量应用归档材料缺少：

```text
适用代码版本或提交
状态：current / historical / implemented / superseded / draft / needs-verification
上游事实源
替代文档
最后核验时间
```

结果是 Dubbo/Feign、GET/POST、启动顺序等冲突无法可靠识别。

### 10.6 P1：AI 项目概览与当前全局架构不一致

全局架构已是六应用结构：

- `docs/architecture.md:3-16`

但 AI `PROJECTS_OVERVIEW.md` 仍使用三项目和 `domestic-*` 旧命名：

- `applications/shop-trade-service-ai/PROJECTS_OVERVIEW.md:3-12`
- `applications/shop-trade-service-ai/PROJECTS_OVERVIEW.md:25-31`

且包含 Windows 路径和旧服务信息。

建议：标记为历史材料，或以当前代码/配置核验后重写。

### 10.7 P2：重复材料导致漂移

已知重复：

```text
芋道单元测试.md：AI / Business / System 三份
MapStruct 外链：System 下两个文件
Business 与 AI 文档规范说明：高度重复
```

建议：

```text
通用材料收敛为全局单一来源。
应用文档仅保留差异、版本适配和事实链接。
外链材料应说明适用版本、用途、离线风险和替代资料。
```

### 10.8 P2：文档规范和实际布局存在边界不清

全局约定倾向于应用专属 Markdown 放在子项目 `docs/` 下，但当前应用材料中也存在：

```text
applications/<app>/CLAUDE.md
applications/<app>/30-接口与协议/**
applications/<app>/50-测试与质量/**
applications/<app>/docs/**
```

建议增加明确的放置判定矩阵：

| 文档类型 | 推荐位置 |
|---|---|
| 全局强制规则 | `docs/rules/**` |
| 应用入口 | `applications/<app>/CLAUDE.md` |
| 应用现行协议与专题 | `applications/<app>/...`，统一目录规则 |
| 原子项目代码事实 | 原子项目自身 docs/README/pom/package/config |
| 长期决策 | `docs/decisions/**` |
| 可复用经验 | `docs/experience/**` |
| 待实施方案 | `docs/plans/**` |
| 过时材料 | 明确 archive/history 或 `deprecated` 标记 |

---

## 11. 建议的目标流转模型

```text
需求 / 问题
  ↓
AGENTS.md：识别任务类型
  ↓
docs/index.md：选择阅读路径
  ↓
rules：读取跨项目强约束
  ↓
应用 CLAUDE.md：定位模块、依赖、风险和入口
  ↓
代码 / 构建 / 配置：确认当前事实
  ↓
实施与验证
  ↓
qa/quality-gates.md：选择最小验证集
  ↓
交付说明：改动、验证、未验证与风险
  ↓
知识回流判断
  ├─ 长期决策 → decisions/
  ├─ 可复用经验 → experience/
  ├─ 后续实施方案 → plans/
  ├─ 启动/排障知识 → runbooks/
  ├─ 应用事实变化 → applications/<app>/CLAUDE.md
  └─ 过时内容 → archive/history 或 deprecated 标记
```

建议所有长期专题文档使用最少元信息：

```md
---
status: current | historical | implemented | superseded | draft | needs-verification
last_verified: YYYY-MM-DD
source_of_truth: <代码、配置、SQL、测试或运行路径>
superseded_by: <替代文档路径，可选>
---
```

---

## 12. 最终评价

该 Harness 已具备完整闭环的主要部件：

```text
导航：AGENTS.md、index.md
事实：architecture、stack、应用 CLAUDE、代码与配置
约束：rules、conventions、quality gates
操作：runbooks、测试说明
沉淀：decisions、experience、plans、历史材料
```

它最重要的关系不是目录层级，而是：

> 规则约束做法，应用文档提供上下文，代码与配置确认事实，QA 验证结果，ADR/经验/计划将新知识回流到 Harness。

下一阶段最值得治理的内容：

1. 为应用专题文档补 `status`、事实来源和最后核验日期；
2. 清理 Dubbo/Feign、GET/POST、测试状态等 P0/P1 冲突；
3. 补全总索引和各应用专题索引；
4. 收敛重复教程和重复规范；
5. 明确文档放置矩阵和计划/报告的回流归档规则。
