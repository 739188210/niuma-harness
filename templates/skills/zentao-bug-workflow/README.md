# ZenTao Bug Workflow Skill

这个 skill 用于让 agent 按固定流程读取自部署禅道的 Bug、保存处理证据、查看截图、修改代码并输出修复说明。

当前适配环境：

- 禅道开源版 20.6
- API 前缀默认 `/api.php/v1`
- Token 通过 `Token` 请求头传递
- 运行配置为本地 `zentao.config.json`，由分发的 `zentao.config.example.json` 首次创建

## 目录结构

```text
zentao-bug-workflow/
  zentao.config.example.json
  zentao.config.json       # 首次使用时在本地创建，不由 Niuma 分发
  SKILL.md
  README.md
  scripts/
    zentao_bug.py
    zentao_bug.ps1
  references/
    zentao-20.6-api.md
  tasks/
    bug-<id>-<timestamp>/
```

## 配置

首次使用时：

1. 在实际使用的 skill 目录运行：

   ```bash
   # Windows
   python scripts/zentao_bug.py init-config
   # Linux/macOS
   python3 scripts/zentao_bug.py init-config
   ```

   它只会在 `zentao.config.json` 不存在时，从 `zentao.config.example.json` 创建本地配置；已存在的本地配置不会被读取、覆盖或删除。
2. 只在本地填写 `api.baseUrl`、`auth.account` 和 `auth.password`；不要把密码、Token、Cookie 或完整配置粘贴到聊天中。
3. 不要直接把 example 当作运行配置，也不要在 example 中保存真实凭据；re-init 会刷新它。
4. 本地配置完成后，在 Windows 运行 `python scripts/zentao_bug.py ping`，在 Linux/macOS 运行 `python3 scripts/zentao_bug.py ping`。
5. 再根据产品、项目、读取范围和写回策略配置 scope；扩大 scope 或启用写回前需要用户明确确认。

如果 helper 不可用，才手动将 `zentao.config.example.json` 复制为 `zentao.config.json`。

`zentao.config.json` 不由 Niuma 管理、不会在不同 agent root 之间同步，也不应提交到代码仓库。其结构如下：

```json
{
  "api": {
    "baseUrl": "http://zentao.example.com",
    "prefix": "/api.php/v1",
    "commentEndpoint": ""
  },
  "auth": {
    "account": "你的禅道账号",
    "password": "你的禅道密码"
  },
  "scopes": {
    "read": [],
    "write": []
  },
  "writePolicy": {
    "enabled": false,
    "autoCommentAfterValidation": false,
    "autoResolveAfterValidation": false,
    "resolution": "fixed"
  },
  "safety": {
    "denyByDefault": true,
    "allowProjectZero": true
  }
}
```

说明：

- `scopes.read` 是只读白名单。
- `scopes.write` 是写入白名单。
- `"projects": []` 表示允许该产品下所有项目。
- `"projects": [91]` 表示只允许项目 91；当 `allowProjectZero=true` 时，禅道里 project 为 `0` 或空的 Bug 也可以通过产品级判断。
- `writePolicy.enabled=false` 表示默认只读，不允许写回禅道。
- `api.commentEndpoint` 是独立备注接口覆盖项。留空时使用禅道默认 Web 备注接口：`/index.php?m=action&f=comment&objectType=bug&objectID={bugID}`。
- 分发的 `zentao.config.example.json` 使用占位值和空 scope，仅用于创建本地配置。
- `scopes.read=[]` 表示读取范围尚未授权；`scopes.write=[]` 可以作为长期只读配置。
- 不要把填入真实账号密码的 `zentao.config.json` 提交到代码仓库。

### scope 配置示例

分发模板保持空 scope。只有用户明确确认产品、项目、读取范围和写回级别后，才填写下列示例中的 ID；`12` 和 `91` 仅为示例，不代表默认授权：

```json
{
  "scopes": {
    "read": [
      { "product": 12, "projects": [91] }
    ],
    "write": [
      { "product": 12, "projects": [91], "actions": ["comment"] }
    ]
  }
}
```

- `{ "product": 12, "projects": [] }` 表示该产品下所有项目的产品级读取范围。
- `{ "product": 12, "projects": [91] }` 表示只允许项目 `91`。
- 写入 scope 必须配置 `actions`，可选值仅为 `comment` 和 `resolve`。
- 即使已配置写入 scope，仍必须经用户明确确认后才将 `writePolicy.enabled` 改为 `true`；默认不允许写回。

## api 评论配置

你们当前禅道的“添加备注”和“解决 Bug”都走 Web 表单接口。脚本已经内置备注流程：

1. `GET /index.php?m=action&f=comment&objectType=bug&objectID={bugID}&t=html`
2. 从返回 HTML 里解析 `uid`
3. `POST /index.php?m=action&f=comment&objectType=bug&objectID={bugID}`
4. 表单字段固定为 `actioncomment` 和 `uid`

所以正常不需要配置太多字段。

解决 Bug 的流程也已内置：

1. `GET /index.php?m=bug&f=resolve&bugID={bugID}&t=html`
2. 从返回 HTML 里解析 `uid`
3. `POST /index.php?m=bug&f=resolve&bugID={bugID}`
4. 表单字段包含 `resolution`、`resolvedBuild`、`resolvedDate`、`assignedTo`、`uid`
5. 如果带备注，脚本会把备注转换成 `<p>...</p>` 富文本 HTML 后提交，避免中文乱码。

```json
"api": {
  "baseUrl": "http://zentao.example.com",
  "prefix": "/api.php/v1",
  "commentEndpoint": ""
}
```

### commentEndpoint

类型：`string`

默认建议：`""`

作用：独立备注接口路径覆盖项。留空时使用脚本内置的禅道默认路径。

可以使用 `{bugID}`、`{bugId}` 或 `{id}` 作为 Bug ID 占位符，例如：

```json
"commentEndpoint": "/api.php/v1/bugs/{bugID}/comments"
```

只有你们禅道二开改了备注路径时才需要配置。不要配置 HTTP method 或字段名，脚本固定按禅道 Web 备注表单提交。

## writePolicy 配置

`writePolicy` 控制是否允许脚本写回禅道，以及修复验证通过后的自动化策略。

```json
"writePolicy": {
  "enabled": false,
  "autoCommentAfterValidation": false,
  "autoResolveAfterValidation": false,
  "resolution": "fixed"
}
```

### enabled

类型：`boolean`

默认建议：`false`

作用：写入总开关。

- `false`：禁止所有写操作。即使 `scopes.write` 配了，也不能解决、关闭、评论或修改 Bug。
- `true`：允许进入写操作判断，但仍必须同时命中 `scopes.write` 和对应 `actions`。

建议只有在你明确希望 agent 可以写回禅道时才改成 `true`。

### autoCommentAfterValidation

类型：`boolean`

默认建议：`false`

作用：修复并验证通过后，是否自动向禅道写处理说明。

- `false`：不自动评论，只在最终回复里给出可复制的修复说明。
- `true`：允许在验证通过后自动评论。实际写入还需要 `enabled=true`。

行为规则：

- 如果同时开启 `autoResolveAfterValidation=true`，脚本会通过禅道 Web resolve 表单解决 Bug，并把备注转成富文本 HTML 后一起提交，不额外调用独立备注接口。
- 如果只开启 `autoCommentAfterValidation=true`，脚本会调用独立 `comment` 命令。此时 Bug 必须命中包含 `comment` 的写入白名单。

### autoResolveAfterValidation

类型：`boolean`

默认建议：`false`

作用：修复并验证通过后，是否自动把 Bug 标记为已解决。

- `false`：不自动解决 Bug。
- `true`：允许验证通过后自动 resolve。实际写入还需要 `enabled=true`，并且 Bug 命中包含 `resolve` 的写入白名单。

这个开关风险比自动评论更高，建议等流程稳定后再开启。

### resolution

类型：`string`

默认建议：`"fixed"`

作用：执行 `resolve` 时提交给禅道的解决结果。

常用值通常包括：

- `"fixed"`：已修复。
- 其它值取决于你们禅道实例的配置和 API 接受值。

如果命令行显式传了 `-Resolution`，命令行参数优先；否则使用这里的配置。

## safety 配置

`safety` 控制白名单外的默认行为，以及禅道 project 为空或为 0 时的处理方式。

```json
"safety": {
  "denyByDefault": true,
  "allowProjectZero": true
}
```

### denyByDefault

类型：`boolean`

默认建议：`true`

作用：是否默认拒绝白名单外的 Bug。

- `true`：Bug 不命中 `scopes.read` 时拒绝读取；不命中 `scopes.write` 时拒绝写入。
- `false`：读取校验会放宽，不命中 read scope 也允许继续。

强烈建议保持 `true`。如果改成 `false`，账号能访问的 Bug 更容易被脚本读取到，不适合日常使用。

### allowProjectZero

类型：`boolean`

默认建议：`true`

作用：禅道 Bug 的 `project` 字段为 `0`、空或缺失时，是否允许按产品白名单放行。

- `true`：只要 `product` 命中白名单，且 Bug 的 project 是 `0`、空或缺失，就允许通过。
- `false`：Bug 必须命中配置里的具体 project，project 为 `0` 或空也不会自动放行。

禅道里很多 Bug 只绑定产品，不绑定项目，所以日常建议保持 `true`。如果你们要求所有 Bug 必须绑定项目，可以改成 `false`。

## 常用命令

初始化本地配置（只在不存在时创建，绝不覆盖已有配置）：

```bash
# Windows
python scripts/zentao_bug.py init-config
# Linux/macOS
python3 scripts/zentao_bug.py init-config
```

列出配置了产品级只读白名单的产品下未关闭 Bug：

```bash
python scripts/zentao_bug.py list-unclosed --limit 10
```

读取单个 Bug JSON：

```bash
python scripts/zentao_bug.py get 6517
```

准备 Bug 处理目录并自动下载图片：

```bash
python scripts/zentao_bug.py prepare 6517
```

清理指定 Bug 的临时处理目录：

```bash
python scripts/zentao_bug.py cleanup 6517
```

测试接口认证：

```bash
python scripts/zentao_bug.py ping
```

解决 Bug。需要 `writePolicy.enabled=true`，且 Bug 命中 `scopes.write`，并且对应 scope 的 `actions` 包含 `resolve`：

```bash
python scripts/zentao_bug.py resolve 6517
```

解决 Bug 并附带处理说明：

```bash
python scripts/zentao_bug.py resolve 6517 --comment "已修复并验证通过。"
```

只写备注。需要 `writePolicy.enabled=true`，且 Bug 命中包含 `comment` 的写入白名单：

```bash
python scripts/zentao_bug.py comment 6517 --comment "已修复并验证通过。"
```

验证通过后的自动写回入口。根据 `writePolicy.autoCommentAfterValidation` 和 `writePolicy.autoResolveAfterValidation` 决定是否评论或解决：

```bash
python scripts/zentao_bug.py validated 6517 --comment "已修复并验证通过。"
```

Windows 上也可以继续使用兼容包装器：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\zentao_bug.ps1" get 6517
```

## 安全边界

即使配置账号有更大权限，agent 也只能按本 skill 的边界工作：

- 只读取 `scopes.read` 命中的 Bug。
- 只写入 `scopes.write` 命中的 Bug。
- 写操作还必须命中对应的 `actions`。
- 默认不写回禅道。
- 修改白名单前需要用户明确确认。

## 处理流程

让 agent 处理 Bug 时，可以直接说：

```text
用禅道流程处理 Bug 6517
```

agent 应按以下流程执行：

1. 运行 `zentao_bug.py prepare <bugID>`。
2. 读取临时目录里的 `bug.json`、`steps.txt` 和 `images/`。
3. 结合文本和图片理解 Bug。
4. 在当前代码仓库中定位相关模块。
5. 修改代码并运行相关测试或构建。
6. 如果涉及前端页面、弹窗、上传、保存、跳转、提示、列表刷新等可见行为，必须用 Playwright 或 Browser 插件实际打开页面验证。
7. 输出修复说明、自动化验证结果和浏览器验证结果。
8. 运行 `zentao_bug.py cleanup <bugID>` 删除临时目录。

## 故障排查

如果登录失败：

- 检查 `api.baseUrl` 是否能访问。
- 检查 `auth.account` 和 `auth.password` 是否正确。

如果列表读取被阻止：

- `list-unclosed` 需要产品级只读白名单，即该产品 scope 的 `"projects": []`。
- 如果只想处理某个 Bug，直接使用 `get <bugID>` 或 `prepare <bugID>`。

如果接口 404：

- 先保持 `api.prefix=/api.php/v1`。
- 如果你们禅道 API 路由不同，再尝试 `/api/v1`。

如果图片下载失败：

- agent 仍可根据文本处理。
- 必要时检查禅道文件读取权限或截图 URL 是否过期。
