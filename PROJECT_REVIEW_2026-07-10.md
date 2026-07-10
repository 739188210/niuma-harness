# Niuma Harness 项目整体评审记录

- 评审日期：2026-07-10
- 评审对象：`niuma-harness` 当前工作区
- 评审性质：全项目只读评审
- 评审范围：产品定位、CLI、初始化流程、doctor/check、rules/skills/commands 分发与收敛、文件系统安全、文档与模板一致性、测试与发布准备度
- 代码修改：评审当日无；后续已按本文件优先级开始整改
- 最近更新：2026-07-11

## 0. 后续整改进度（2026-07-11）

本文件第 1～11 节保留 2026-07-10 评审时的原始判断和复现证据，作为整改基线。本节记录评审后的实际修复状态；不能用本节的当前状态反向解释原始评审当日已经不存在相关问题。

### 0.1 当前进度概览

| 原评审项 | 状态 | 当前结果 |
|---|---|---|
| P0-1 删除 entry contract 后 doctor 仍通过 | 已完成 | doctor 要求唯一、完整、顺序正确且内容一致的 contract；缺失、单侧 marker、重复、乱序和 drift 都会失败 |
| P0-2 取消选择 skill 会删除用户维护配置 | 已完成 | skill 使用通用 package-only `niuma-skill.json` 声明 ownership；deselect 只删除 tool-owned 文件，保留 user-owned 和未知文件 |
| P0-3 Codex command-derived skill 覆盖同名用户 skill | 已完成 | schema-2 artifact ownership ledger 覆盖全部 native command artifacts；未登记目标和已漂移目标均拒绝覆盖 |
| P0-4 init 后期失败留下半初始化状态 | 部分完成 | command artifacts 已在任何 scaffold 写入前完成全量 render/preflight，并在写入前二次 revalidate；其他 writer，尤其无效 `opencode.json`，尚未纳入统一全局 preflight/事务机制 |
| P1-1 doctor 过度信任 generated manifest | 部分完成 | schema 2 ledger 会校验 command records、路径和 exact-byte digest；manifest 其他字段与实际 harness root/package manifest 的可信绑定仍未完成 |
| P1-2 tool-managed 内容被替换后 doctor 仍通过 | 部分完成 | entry contract 和 ledger 中的 native command artifacts 已做内容完整性检查；core docs、rules、skill tool-owned payload 等仍主要检查结构或浅层 metadata |
| P1-3 切换 agent 后旧 surfaces 不会收敛 | 部分完成 | previous-agent command ownership records 会保留并由 doctor 持续验证；旧 entry、rules adapters、skills 和 command surfaces 尚未自动清理 |
| P1-4 user-maintained 目标为目录时 init 错误成功 | 未处理 | 仍待调整 `writeFile()` 的目标类型检查顺序 |
| P1-5 macOS `/var/...` 合法 workspace 被拒绝 | 未处理 | 仍待重新定义 canonical workspace root 与 workspace 内 symlink 边界 |
| P1-6 duplicate contract blocks 未被拒绝 | 已完成 | 与 P0-1 一并修复，init 和 doctor 都拒绝重复 contract |
| P1-7 修改 `--harness-dir` 形成竞争 harness | 未处理 | 仍待定义显式迁移或冲突停止语义 |

### 0.2 已完成整改

#### Entry contract 完整性

新增严格 contract 状态分析，区分：

- `missing`
- `missing-begin`
- `missing-end`
- `multiple`
- `out-of-order`
- `valid`

`doctor` 仅接受唯一、完整且与 canonical template 内容一致的 contract。`init` 对残缺、重复或乱序 contract 停止处理；`multi` 模式会先准备并验证所有 entry，再开始任何 entry 写入，避免部分刷新。

该整改关闭：

- P0-1
- P1-6

#### 通用 skill payload ownership

新增 package-only `templates/skills/<skill>/niuma-skill.json`。未声明文件默认属于 tool-managed；显式 `ownership: "user"` 的文件首次缺失时创建，re-init 和 deselect 时保留。未知 workspace 文件始终保留，metadata 本身不分发到 agent-native skill 目录。

实现不包含 ZenTao-specific ownership 分支，可用于后续新增 skill。

该整改关闭：

- P0-2

#### 通用 native command artifact ledger

生成态 manifest 升级为 schema 2，新增通用 artifact ownership ledger。当前 ledger 首期覆盖 Claude、Codex、OpenCode 的所有 native command artifacts，记录：

```json
{
  "kind": "command",
  "source": "commands/dev-check.md",
  "target": ".claude/commands/dev-check.md",
  "digest": "sha256:<exact-byte digest>"
}
```

当前行为：

- 目标不存在：允许创建并登记。
- 目标存在但无 matching ownership record：拒绝覆盖。
- 已登记且当前 exact-byte digest 未漂移：允许刷新。
- 已登记但当前内容漂移：停止并保留现有字节。
- 已登记文件缺失：允许重建。
- symlink、dangling symlink、目录或其他非普通文件目标：拒绝。
- agent 切换时保留 previous-agent command records，doctor 继续验证其文件和 digest。

command plan 会在任何 scaffold mutation 前完整 render/preflight，并在 command 写入前再次全量 revalidate。该机制防止已知 command collision 导致部分 scaffold 写入，但尚不等价于跨 writer、跨进程或崩溃安全的文件系统事务。

该整改关闭：

- P0-3

并部分推进：

- P0-4
- P1-1
- P1-2
- P1-3

### 0.3 后续代码质量整理

在不改变 CLI 行为、错误文本、生成内容和测试断言语义的前提下，完成了：

- command 模板在单次 plan 中复用渲染结果，减少重复同步读取；
- skill 文件清单和 ownership metadata 在单次 init/doctor 中按需缓存；
- doctor 的 rules/skills/commands manifest 数组字段校验抽取为共享流程；
- command-derived skill 与 native skill 共用 Markdown metadata 校验；
- `test/init.test.js` 按 docs、agents、rules、artifacts、workspace 拆分为 focused suites；
- 测试 manifest JSON 修改使用共享 helper；
- 删除仓库内无调用的函数、无效 options 状态和未被消费的内部深路径导出。

项目仍只声明 CLI，不承诺 `src/*` 深路径程序化 API。

### 0.4 当前验证证据

整改和代码整理后已运行：

```bash
npm test
npm run pack:dry
git diff --check
```

结果：

- `npm test`：167 passed，0 failed。
- `npm run pack:dry`：通过，package preview 共 106 个文件；新增 ledger、artifact doctor 和 Markdown checker 模块均包含在 package 中。
- `git diff --check`：通过，无输出。
- 临时 workspace smoke：fresh multi init 生成 schema 2 和 20 条 command artifact records；doctor 通过；drift/unowned collision 会在预期位置停止且保留用户字节；clean dry-run 不写文件。

尚未执行：commit、push、PR、package 发布、真实 tarball 安装 smoke、Windows CI、真实 ZenTao/MySQL 网络或数据库行为验证。

### 0.5 下一整改项

按 P0 顺序，下一项是 **P0-4：init 全局 preflight 与失败一致性**。建议先将所有可预见失败前置到统一 plan：

1. entry contract 与所有 entry 目标；
2. `opencode.json` 解析、类型和 managed instruction 合并；
3. template/rules/skills/commands 的读取与渲染；
4. 所有目标路径、类型、symlink 和 ownership 冲突；
5. 全部 preflight 成功后再进入 apply；
6. 之后再评估 atomic write、staging、rollback journal 和跨进程锁。

## 1. 结论摘要

当前项目作为 `0.0.2` 阶段的 **AI 工程协议脚手架生成器和结构检查器**，基础设计基本合格；作为能够可靠承诺“可控、可观察、可恢复、上下文高效”的正式工程 harness，目前尚不合格。

项目已经具备清晰的生成架构、较完整的 CLI 集成测试和 rules/skills/commands 多工具分发能力。但本次评审确认了多个高优先级问题，包括：

1. 删除 entry contract 后，`doctor` 仍可返回健康。
2. 取消选择 ZenTao skill 会删除用户维护的配置。
3. Codex command-derived skill 会覆盖同名用户 skill。
4. `init` 在后期校验失败时会留下半初始化或混合版本状态。
5. `doctor` 过度信任它本应验证的 generated manifest。
6. tool-managed 内容被篡改后，大量文件仍可通过 `doctor`。
7. 切换 agent 后，旧 agent 的 managed surfaces 不会完整收敛。

因此，当前版本适合继续内部开发、验证信息架构和演进生成模型，但不建议在修复数据保护、初始化一致性和 doctor 可信度问题前，将其作为强保证的正式 harness 对外推广。

## 2. 产品定位判断

Roadmap 将项目定位为 AI engineering harness generator，而非 Claude、Codex、OpenCode 或其他 agent runtime。核心目标是把普通 workspace 转换为 AI-agent-ready workspace，并获得四种属性：

- Controllable：agent 自主行为存在边界。
- Observable：状态和结果依赖证据，而非口头声明。
- Recoverable：任务可中断、恢复，失败有受限恢复路径。
- Context-efficient：只加载必要上下文，避免重复和陈旧信息。

这个边界是合理的。项目不必成为完整 agent runtime，但必须明确区分：

- 当前可以可靠提供的是：协议文档生成、native artifact 分发、结构验证。
- 当前主要依赖 agent 自觉执行的是：行动分类、审批暂停、验证证据、任务台账、恢复流程和 durable memory 更新。

更准确的当前产品描述应是：

> Agent working protocol scaffold + native artifact distributor + structural integrity checker.

如果继续使用“可控、可观察、可恢复”的强表述，应明确这些属性目前属于 agent-compliance-based / best-effort，而非由运行时强制执行。

## 3. 评审方法与证据

### 3.1 阅读范围

本次评审覆盖了：

- `README.md`
- `harness-roadmap.md`
- `CLAUDE.md`
- `package.json`
- `templates/manifest.json`
- `templates/entry/entry.md`
- `templates/core/docs/`
- `templates/core/agent-work/`
- `templates/commands/`
- `templates/skills/`
- `src/agents.js`
- `src/args.js`
- `src/cli.js`
- `src/rules.js`
- `src/skills.js`
- `src/commands.js`
- `src/scaffold.js`
- `src/scaffold/*`
- `src/doctor.js`
- `src/doctor/*`
- `src/fs-safe.js`
- `src/contract.js`
- `src/harness-status.js`
- `test/init.test.js`
- `test/doctor.test.js`
- `test/help.test.js`
- `test/helpers.js`

### 3.2 执行证据

评审过程中运行或由独立验证流程运行了：

```bash
npm test
npm pack --dry-run --json
```

结果：

- `npm test`：146 passed，0 failed。
- `npm pack --dry-run --json`：成功生成 package 内容预览。

此外，在隔离临时 workspace 中通过公开 CLI 复现了以下行为：

- 删除 contract markers 后 `doctor` 仍返回成功。
- 修改 generated manifest 的 rules/skills/commands/path 字段后可削弱或重定向检查。
- 修改 tool-managed docs/commands 内容后 `doctor` 仍返回成功。
- 从 Claude 切换到 Codex 后，旧 Claude entry/commands/skills 仍保留且 `doctor` 通过。
- `--skills none` 删除 ZenTao 用户配置。
- Codex command 覆盖已有同名用户 skill。
- user-maintained target 是目录时，`init` 仍成功并写 manifest。
- 无效 `opencode.json` 导致部分文件写入后才失败。
- macOS `/var/...` 路径因系统 symlink 被拒绝。
- 修改 selected rule 后 re-init 不刷新且 `doctor` 通过。
- 删除 experimental task execution record 后 `doctor` 失败，re-init 会恢复它。

### 3.3 当前工作区状态

评审开始时工作区位于 `main`，存在一项既有未提交修改：

```text
M CLAUDE.md
```

该修改不是本次评审产生的。本次评审未修改代码或该文件。

## 4. 项目优点

### 4.1 架构边界清楚

CLI 主流程相对清晰：

1. `src/args.js` 解析参数。
2. `src/cli.js` 完成 agent/rules 处理并分派命令。
3. `src/scaffold.js` 通过统一 context 编排所有 writer。
4. `src/doctor.js` 定位 generated manifest 并执行检查。

rules、skills、commands 各自有独立选择模型、writer 和 doctor checker，便于继续扩展。

### 4.2 无运行时依赖

项目为 CommonJS Node CLI，Node.js 要求为 `>=18`，没有第三方运行时依赖。这降低了初始化工具自身的供应链和安装复杂度。

### 4.3 使用真实 CLI 做测试

测试不是 mock 内部函数，而是通过 `spawnSync` 执行真实 CLI，在临时目录观察实际文件系统结果。这个测试策略适合脚手架工具，能够覆盖路径、生成结构和退出码等真实行为。

### 4.4 Agent surface 覆盖较完整

当前支持：

- Claude：`CLAUDE.md`、`.claude/rules`、`.claude/skills`、`.claude/commands`
- Codex：`AGENTS.md`、`.agents/skills`
- OpenCode：`AGENTS.md`、`opencode.json`、`.opencode/skills`、`.opencode/commands`
- Multi：同时生成三类 native surfaces

### 4.5 Rules single-source adapter 思路正确

项目没有把 rule 正文复制到每个 agent native 目录，而是：

```text
templates/core/docs/rules/*
  -> <harness-dir>/docs/rules/*
  -> agent-native pointers/adapters
```

Claude pointer、OpenCode managed instructions 和 Codex entry navigation 的总体方向符合 context-efficient 原则。

### 4.6 已考虑路径穿越和普通 symlink 攻击

`src/fs-safe.js` 集中处理路径 containment、目标类型和 symlink 拒绝，测试也覆盖了目录、文件和 dangling symlink。这说明安全边界不是事后补充，而是架构的一部分。

## 5. 已确认问题

下面按优先级记录本次确认的问题。风险等级综合考虑数据丢失、安全边界、健康检查可信度和恢复难度。

## 5.1 P0：必须优先修复

### P0-1 删除 entry contract 后，doctor 仍通过

- 风险：高
- 类型：完整性检查绕过
- 相关位置：
  - `src/doctor/core-checks.js:38-59`
  - `test/doctor.test.js:131-139`

当 entry 文件不包含 contract begin marker 时，doctor 会直接跳过 contract integrity 检查。结果是：用户或 agent 可以删除整个 operating loop 和 markers，只留下任意普通文本，doctor 仍返回 `Status: OK`。

这与 README 和 entry template 中“doctor checks the managed contract”的承诺直接冲突，也破坏了项目最核心的 always-loaded protocol 保证。

建议：

- 对 generated manifest 声明的 entry file，必须要求恰好一个完整 contract block。
- 缺少 marker、只有单侧 marker、重复 block 都应失败。
- 如果未来确实支持完全 user-managed entry，应在可信状态中显式记录，而不是通过“marker 缺失”推断。

### P0-2 取消选择 skill 会删除用户维护配置

- 风险：高
- 类型：用户数据丢失
- 相关位置：
  - `src/scaffold/skills-writer.js:31-43`
  - `src/fs-safe.js:143-157`

未选择的 known skill 会通过 `removeDirectory()` 递归删除整个目录。对于 `zentao-bug-workflow`，这会同时删除被设计为 user-maintained 的 `zentao.config.json` 以及用户添加的其他文件。

复现场景：

1. 初始化 ZenTao skill。
2. 用户编辑 `.claude/skills/zentao-bug-workflow/zentao.config.json`。
3. 运行 `init --skills none` 或改成其他 skill。
4. 整个目录和配置被删除。

建议：

- 明确记录 managed files 与 user files 的 ownership。
- deselect 时只删除 Niuma-owned files。
- 保留 runtime config 和未知用户文件。
- 目录为空后才删除目录。

### P0-3 Codex command-derived skill 覆盖同名用户 skill

- 风险：高
- 类型：用户内容覆盖
- 相关位置：
  - `src/scaffold/commands-writer.js:59-68`
  - `src/scaffold.js:75-81`

Codex command 会写到：

```text
.agents/skills/<command-id>/SKILL.md
.agents/skills/<command-id>/agents/openai.yaml
```

这些文件使用 unconditional overwrite。当前 collision 检查只比较 package 内 commands 和 package 内 skills，不检查 workspace 中是否已有同名用户 skill。

复现场景：用户已有 `.agents/skills/git-sync/SKILL.md`，运行 Codex init 后被 Niuma 生成内容覆盖。

建议：

- 为 Niuma-generated native artifacts 增加 ownership marker 或 previous-manifest ownership ledger。
- 只有确认目标由 Niuma 管理时才允许刷新。
- 对同名但无 ownership 证据的目录应停止并报告冲突，而不是覆盖。

### P0-4 init 后期失败会留下半初始化状态

- 风险：高
- 类型：事务一致性 / 可恢复性
- 相关位置：
  - `src/scaffold.js:26-40`
  - `src/scaffold/rules-adapters-writer.js:63-72`
  - `src/scaffold/rules-adapters-writer.js:95-110`

init 按顺序直接修改 workspace，但对 `opencode.json` 等可失败输入的解析发生在多项写入之后，也没有 rollback。

无效 `opencode.json` 可导致：

- entry 已写入；
- harness docs 已写入；
- rule files 已修改；
- native rules adapter 阶段失败；
- skills/commands/status manifest 尚未完成。

在已有 harness 上切换 agent 时，旧 manifest 还可能描述修改前状态，形成混合版本。

建议：

1. 写入前完成所有 preflight：配置解析、目标类型、collision、路径、模板读取和渲染。
2. 对关键文件采用同目录临时文件 + atomic rename。
3. 对跨文件转换引入 staging 或 rollback journal。
4. status manifest 仅在全部操作成功后更新，但不能把它当作唯一事务机制。

## 5.2 P1：重要完整性与收敛问题

### P1-1 doctor 过度信任 generated manifest

- 风险：高
- 类型：信任边界错误
- 相关位置：
  - `src/doctor/status.js:21-27`
  - `src/doctor/checks.js:79-147`
  - `src/doctor/core-checks.js:43-46`
  - `src/doctor/core-checks.js:110-124`

`manifest.json` 同时被当作被检查对象和检查范围的权威来源。将 `rules`、`skills`、`commands` 改为空数组，可以关闭对应检查。

`harnessDir` 和 `workDir` 也被直接信任，用于生成 expected contract 和选择任务目录；它们没有严格绑定到实际发现的 harness root 和 package manifest 声明。

建议验证：

- `createdBy === "niuma-harness"`
- `harnessDir` 等于实际 manifest 所在目录名
- `workDir` 等于 package manifest 声明值
- commands 等不可配置字段等于可信预期
- configurable selections 不能只靠待验证 manifest 自证

### P1-2 Tool-managed 文件内容被替换后 doctor 仍通过

- 风险：高
- 类型：健康检查假阳性
- 相关位置：
  - `src/doctor/core-checks.js:101-106`
  - `src/doctor/core-checks.js:148-160`
  - `src/doctor/commands-checks.js:30-59`
  - `src/doctor/rules-checks.js:23-35`

大量 tool-managed 文件只检查存在且为 regular file，不比较 canonical content。以下内容可以被替换为任意文本而继续通过 doctor：

- policy/process/layer docs
- `agent-work/README.md`
- Claude/OpenCode command files
- rule 内容
- 部分 skill helper/script

entry contract 有内容比较，skill frontmatter 有浅层检查，但覆盖范围不足。

建议：

- 对 tool-managed 文件比较渲染后的 canonical bytes 或 package-derived digest。
- 仅排除明确 user-managed 文件和 runtime config。
- 对 helper scripts 也执行完整内容或签名检查。

### P1-3 切换 agent 后旧 surfaces 不会收敛

- 风险：中
- 类型：状态收敛不完整
- 相关位置：
  - `src/scaffold/entries.js:15-45`
  - `src/scaffold/skills-writer.js:17-28`
  - `src/scaffold/commands-writer.js:13-23`

例如从 `multi` 切到 `claude` 后，以下旧产物可继续存在：

```text
AGENTS.md
.agents/skills/*
.opencode/commands/*
.opencode/skills/*
```

新 manifest 只声明 Claude，doctor 只检查当前 agent，因此不报告旧 managed artifacts。旧 agent 工具仍可能发现并执行这些内容。

建议：

- 读取 previous generated manifest，得到由 Niuma 拥有的旧 surfaces。
- 删除或解除旧 managed contract/artifacts。
- 未知用户文件继续保留。
- doctor 应检查已知但未选择的 stale Niuma artifacts。

### P1-4 user-maintained 目标为目录时 init 错误成功

- 风险：中
- 类型：目标类型校验顺序错误
- 相关位置：`src/fs-safe.js:95-108`

当 `overwrite: false` 且目标路径存在时，代码先返回 `skip`，之后的 regular-file 检查不可达。因此，如果 `docs/project-context.md` 是目录，init 会成功、打印 SKIP、生成 manifest；仅后续 doctor 才失败。

建议：先执行 `lstat` 并验证类型，再处理 preserve/skip。

### P1-5 macOS `/var/...` 合法 workspace 被拒绝

- 风险：中
- 类型：平台兼容 / 过度 symlink 拒绝
- 相关位置：
  - `src/fs-safe.js:32-53`
  - `test/helpers.js:38-42`

macOS 默认 `/var -> private/var`。当前实现检查绝对路径上的每一级祖先，因此：

```bash
niuma-harness init /var/tmp/example --agent claude
```

会因为 `/var` 是 symlink 而失败。测试 helper 对临时目录执行 `realpathSync`，隐藏了普通用户路径问题。

建议：

- canonicalize workspace root。
- 以 canonical workspace root 为 containment 边界。
- 不因 workspace 外部的标准系统 symlink 直接拒绝。
- 仍需拒绝 workspace 内部可导致越界的 symlink。

### P1-6 duplicate contract blocks 未被拒绝

- 风险：中
- 类型：contract 完整性
- 相关位置：
  - `src/contract.js:7-30`
  - `src/doctor/core-checks.js:41-72`

contract slice/replace 和 doctor 都只处理第一个 begin/end pair。追加第二个旧 contract 后，re-init 刷新第一个、保留第二个，doctor 仍通过。两个 always-loaded managed blocks 可能包含冲突指令。

建议要求 entry 中恰好存在一个 contract block，并检查 marker 数量和顺序。

### P1-7 修改 `--harness-dir` 会形成竞争 harness

- 风险：中
- 类型：迁移语义不明确
- 相关位置：
  - `src/scaffold.js:44-65`
  - `src/scaffold/entries.js:48-56`
  - `src/doctor/status.js:7-18`

已有默认 `harness/` 时重新运行 `--harness-dir ai-harness`，会创建第二套 scaffold，并把 entry 指向新目录，但旧 user-maintained `project-context.md` 留在旧目录。普通 doctor discovery 还可能优先发现旧 manifest 并报告与当前 entry 不一致。

建议明确：

- 不支持隐式迁移时，检测到其他 Niuma harness 后停止并要求显式选择。
- 若支持迁移，应设计 context 迁移、旧状态清理和 discovery 优先级。

## 5.3 P2：产品和设计缺口

### P2-1 Rules 的 canonical ownership 语义冲突

- 风险：中
- 类型：产品模型不一致
- 相关位置：
  - `README.md:220-230`
  - `harness-roadmap.md:90-110`
  - `templates/core/HARNESS_GUIDE.md:58-65`
  - `src/scaffold/rules-writer.js:48-55`
  - `test/init.test.js:734-750`

README/Roadmap 将 package templates 和 generated rules 描述为 canonical 分发源，但 selected rules 使用 `overwrite: false`，本地修改会永久覆盖后续 package 更新。HARNESS_GUIDE 又将生成 rules 描述为 team-maintained。

这意味着安全规则修复可能无法传播，同时 doctor 只检查存在性。

必须选择明确模型：

1. Tool-managed canonical rules：每次刷新；用户扩展放单独 override 层。
2. User-forked rules：首次生成后归项目维护；doctor 不再宣称它们与 package canonical 一致。

### P2-2 Bootstrap、task ledger 和 feedback 是 prose-only

- 风险：中
- 类型：观测与恢复能力缺口
- 相关位置：
  - `templates/core/docs/project-context.md`
  - `templates/core/agent-work/README.md`
  - `templates/core/docs/experiments/task-execution-record.md`
  - `src/doctor/core-checks.js:109-125`

当前系统不检查：

- bootstrap 是否完成或是否有效；
- active task 是否有 `status.md`；
- status 是否记录 next action；
- verification evidence 是否存在；
- `harness-feedback.md` 是否按实验要求创建；
- stale/abandoned task 是否需要恢复或清理。

这些能力依赖 agent 遵守文档，doctor 不提供状态机或语义验证。这属于 roadmap 中 doctor content-quality checks 尚未完成的一部分。

### P2-3 实验文档宣称可禁用，但实现上强制存在

- 风险：中
- 类型：文档与行为矛盾
- 相关位置：
  - `templates/core/docs/experiments/task-execution-record.md:100-102`
  - `templates/manifest.json:25-28`
  - `src/scaffold/entries.js:48-56`
  - `src/doctor/core-checks.js:101-106`

实验文档称机制可以被移除或禁用，但它是无条件 tool-managed template：删除后 doctor 失败，re-init 会重新生成。当前不存在 supported disabled state。

建议提供 feature flag/manifest state，或删除可禁用声明。

### P2-4 Capability/skill metadata 模型尚未完成

- 风险：中
- 类型：roadmap 缺口
- 相关位置：
  - `src/skills.js`
  - `src/harness-status.js`
  - `src/doctor/skills-checks.js`
  - `harness-roadmap.md:149-152`

当前 skill discovery 主要依赖目录名，manifest 仅记录名称。缺少机器可读的：

- agent/runtime 兼容性；
- 必需 binaries/packages；
- 权限和网络要求；
- 数据副作用和风险等级；
- 输入/输出契约；
- 验证方式；
- 可用性探测。

因此默认 `--skills all` 可能安装当前 workspace 无法使用或不应使用的能力，doctor 仍报告健康。

### P2-5 Runtime enforcement 目前完全是 advisory

- 风险：产品定位风险
- 类型：能力边界
- 相关位置：
  - `src/cli.js:30-39`
  - `templates/core/docs/automation/automation-intent.md`
  - `harness-roadmap.md:154-163`

当前可执行命令只有 init、doctor/check，没有 hooks、completion interception、approval gate 或 runtime event collection。非遵循型 agent 可以跳过行动分类、测试和任务记录，项目本身无法阻止或检测。

这并不要求项目变成完整 agent runtime；但需要二选一或组合：

- 收紧产品承诺，明确依赖 agent compliance；
- 提供可选 native hooks/adapters，在支持的平台上加强 enforcement 和 telemetry。

## 6. 测试和发布缺口

### 6.1 未安装真实 npm tarball 后执行 smoke test

当前：

- `npm test` 直接运行源码树。
- `npm pack --dry-run` 是独立手工命令。
- 没有将真实 tarball 安装到干净目录后执行 `init` 和 `doctor`。

风险：`package.json.files` 漏文件、bin 权限、package-relative template discovery 等问题可能在源码测试全绿时进入发布包。

建议加入：

1. `npm pack` 到临时目录。
2. 在干净 fixture 中安装 tarball。
3. 运行 installed bin 的 init/doctor/check。
4. 验证生成的 skills/rules/commands 和 helper scripts 均在包内。

### 6.2 ZenTao security helper 测试主要是文本匹配

相关测试：`test/init.test.js:1026-1067`。

当前测试检查 Python 源码是否包含特定函数名、错误文案和调用表达式，但不执行 helper，也不 mock 网络边界。因此不能证明：

- placeholder config 一定在网络请求前被拒绝；
- token 不会发往 cross-origin URL；
- redirect handler 行为正确；
- 脚本没有语法或参数解析错误。

这是安全测试设计缺口，不代表当前已确认存在 token 泄漏漏洞。

### 6.3 Database readonly helper 缺少行为验证

只分发或检查文件不足以证明 SQL parser 对注释、CTE、多语句、危险语法和编码边界的处理。应通过 fixture 和 fake driver 执行 helper 行为测试。

### 6.4 跨平台验证不足

- symlink 创建失败时，部分测试静默不执行核心断言。
- 未见 Windows CI matrix。
- PowerShell wrapper 未被执行。
- macOS `/var` 问题被 temp helper 的 `realpathSync` 掩盖。

建议至少加入 macOS/Linux/Windows CI，平台不支持 symlink 时应显式 skip，而不是悄悄通过。

## 7. 合格性评分

| 维度 | 结论 | 说明 |
|---|---|---|
| 代码组织 | 合格 | 模块职责较清楚，writer/checker 分离合理 |
| CLI 基础功能 | 合格 | init/doctor/check 主路径完整 |
| 测试策略 | 较好 | 真实 CLI + 临时目录，但存在关键行为和发布测试缺口 |
| Rules 基础分发 | 基本合格 | adapter 模型正确，但 canonical ownership 冲突 |
| Skills 基础分发 | 基本合格 | 多 agent target 完成，但 ownership 和配置删除有严重问题 |
| Commands 基础分发 | 基本合格 | 多 surface 完成，但 Codex 同名覆盖不安全 |
| 路径安全 | 部分合格 | 有集中防护和测试，但存在 macOS 兼容和 TOCTOU 风险 |
| 用户数据保护 | 不合格 | 可删除配置、覆盖同名用户 skill |
| Init 一致性与恢复 | 不合格 | 缺少 preflight/事务性，失败可留下混合状态 |
| Doctor 可信度 | 不合格 | markerless bypass、manifest 自证、内容检查不足 |
| 跨 agent 收敛 | 不完整 | 旧 managed surfaces 残留且不被报告 |
| Observability/Recovery 实质能力 | 不完整 | 主要依赖 prose 和 agent 自觉 |
| 发布准备度 | 暂不合格 | 缺少 packed artifact smoke test 和跨平台验证 |

综合判断：

- 内部原型/继续开发：合格。
- 小范围受控试用：修复 P0 后可考虑。
- 正式对外发布并宣称强 harness 保证：当前不合格。

## 8. 推荐修复顺序

### 第一阶段：数据和核心完整性

1. 修复 markerless/duplicate contract 绕过。
2. 禁止删除 skill runtime config 和未知用户文件。
3. 禁止覆盖无 ownership 证明的 Codex 同名 user skill。
4. 修复 user-maintained target 类型校验顺序。

### 第二阶段：初始化一致性

5. 为 init 增加完整 preflight。
6. 对关键覆盖采用 atomic write。
7. 设计失败 rollback 或 staging。
8. 处理 harness-dir 迁移/冲突语义。

### 第三阶段：Ownership 与收敛

9. 建立 artifact ownership ledger 或 managed markers。
10. 使用 previous manifest 清理旧 agent 的 Niuma-owned surfaces。
11. doctor 报告 stale known managed artifacts。
12. 明确 rules 是 tool-managed canonical 还是 user-forked。

### 第四阶段：Doctor 可信度

13. 将 manifest 字段绑定到实际 harness root 和 package manifest。
14. 对 tool-managed 内容做 canonical render/digest 检查。
15. 验证 bootstrap/task/evidence 的最低语义质量。
16. 为实验机制提供显式 enabled/disabled 状态。

### 第五阶段：发布质量

17. 增加 npm tarball 安装 smoke test。
18. 增加 ZenTao/MySQL helper 行为测试。
19. 建立 macOS/Linux/Windows CI matrix。
20. 推进 capability/skill metadata model。

## 9. 建议的验收标准

在准备下一正式版本前，至少应满足：

- 删除或重复 entry contract 会使 doctor 失败。
- deselect skill 不会删除任何 user-maintained/unknown 文件。
- command/skill 同名用户目录不会被静默覆盖。
- 任意 preflight 配置错误不会修改现有有效 harness。
- agent 切换后所有 Niuma-owned stale surfaces 被收敛，用户文件保留。
- doctor 无法通过篡改 manifest 来关闭不可配置的检查。
- tool-managed policy/process/commands 被篡改时 doctor 失败。
- `/var/tmp` 等常见 macOS 路径可以正常使用，同时 workspace 内 symlink 越界仍被拒绝。
- 从真实 npm tarball 安装后 init/doctor 通过。
- 安全 helper 至少有可执行的边界行为测试。

## 10. 未执行或未覆盖事项

本次评审没有执行：

- 没有修改或修复任何代码。
- 没有提交、push、创建 PR 或发布 package。
- 没有执行真实 ZenTao 服务请求。
- 没有连接真实 MySQL 数据库。
- 没有在 Windows CI/PowerShell 环境运行测试。
- 没有进行并发攻击条件下的 symlink TOCTOU 利用测试。
- 没有进行大规模性能、并发或文件数量压力测试。
- 没有验证 Claude、Codex、OpenCode 各 runtime 对生成 native artifacts 的所有版本兼容性。
- 没有评估生成文档对真实 agent 成功率的量化提升；当前仅评审结构、约束和可验证性。

## 11. 最终意见

项目方向成立，基础架构也值得继续演进。当前最大的风险不是“功能少”，而是部分健康检查和 preservation 声明给出了比实际更强的安全感：doctor 可以在核心 contract 缺失或 managed 内容被替换时通过，init 也可能删除或覆盖用户内容。

因此下一阶段不应优先继续扩充更多 rule/skill/command 类型，而应先完成以下底座：

1. 明确 artifact ownership。
2. 保证 init 的失败原子性或至少 preflight 安全性。
3. 将 doctor 从结构存在性检查提升为可信的完整性检查。
4. 让 agent 切换和配置变化真正收敛。
5. 明确 advisory protocol 与 runtime enforcement 的产品边界。

这些问题修复后，项目才具备继续推进 capability metadata、content-quality doctor 和更广泛 agent 适配的可靠基础。
