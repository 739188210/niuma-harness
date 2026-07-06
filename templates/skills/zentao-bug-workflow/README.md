# ZenTao Bug Workflow Skill

这个 skill 用于让 Codex 按固定流程读取自部署禅道的 Bug、保存处理证据、查看截图、修改代码并输出修复说明。

当前适配环境：

- 禅道开源版 20.6
- API 前缀 `/api.php/v1`
- Token 通过 `Token` 请求头传递
- 只处理 `.env` 中指定的产品和项目范围

## 目录结构

```text
zentao-bug-workflow/
  .env
  SKILL.md
  README.md
  scripts/
    zentao_bug.ps1
  references/
    zentao-20.6-api.md
  tasks/
    bug-<id>-<timestamp>/
```

## 配置

编辑 `.env`：

```env
ZENTAO_BASE_URL=http://192.168.31.238
ZENTAO_ACCOUNT=你的禅道账号
ZENTAO_PASSWORD=你的禅道密码
ZENTAO_PRODUCT_ID=21
ZENTAO_PROJECT_ID=91
ZENTAO_API_PREFIX=/api.php/v1
ZENTAO_ALLOW_WRITE=false
```

说明：

- `ZENTAO_PRODUCT_ID` 是 Bug 所属产品 ID。
- `ZENTAO_PROJECT_ID` 是授权处理的项目 ID。
- `ZENTAO_ALLOW_WRITE=false` 表示默认只读，不允许自动改禅道状态。
- 不要把 `.env` 里的账号、密码、token 发到聊天或提交到代码仓库。

## 常用命令

列出当前产品下未关闭 Bug：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" list-unclosed -Limit 10
```

读取单个 Bug JSON：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" get 6517
```

准备 Bug 处理目录并自动下载图片：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" prepare 6517
```

清理指定 Bug 的临时处理目录：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" cleanup 6517
```

测试接口认证：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" ping
```

## 处理流程

让 Codex 处理 Bug 时，可以直接说：

```text
用禅道流程处理 Bug 6517
```

Codex 应按以下流程执行：

1. 运行 `prepare <bugID>`。
2. 读取临时目录里的 `bug.json`、`steps.txt` 和 `images/`。
3. 结合文本和图片理解 Bug。
4. 在当前代码仓库中定位相关模块。
5. 修改代码并运行相关测试或构建。
6. 如果涉及前端页面、弹窗、上传、保存、跳转、提示、列表刷新等可见行为，必须用 Playwright 或 Browser 插件实际打开页面验证。
7. 输出修复说明、自动化验证结果和浏览器验证结果。
8. 运行 `cleanup <bugID>` 删除临时目录。

## 前端验证要求

涉及前端 UI 的 Bug，不能只靠 `build`、`lint` 或单元测试结束。Codex 需要用 Playwright 或 Browser 插件执行真实用户路径：

- 打开 Bug 复现步骤里的页面。
- 执行点击、输入、上传、保存、删除、筛选、关闭弹窗等操作。
- 检查提示文案、弹窗关闭、列表刷新、页面跳转、表单重置、按钮状态等结果。
- 必要时截图留证。
- 如果无法启动或访问前端页面，需要在最终结果里说明原因。

## 临时任务目录

`prepare` 会在 skill 目录下创建：

```text
tasks/bug-6517-20260702-111533/
  bug.json
  steps.html
  steps.txt
  task.json
  images/
    11664.png
```

这些文件只用于当前 Bug 处理：

- `bug.json`：禅道原始 Bug 数据。
- `steps.html`：Bug 复现步骤 HTML。
- `steps.txt`：从 HTML 提取出的可读文本。
- `task.json`：本地任务摘要和图片下载结果。
- `images/`：Bug 中引用的截图或图片。

处理完成后应执行 `cleanup <bugID>`。只有在你明确要求保留证据时，才保留 `tasks/` 下的目录。

## 安全边界

即使 `.env` 中的账号有更大权限，Codex 也只能按本 skill 的边界工作：

- 只读取 `ZENTAO_PRODUCT_ID` 对应产品下的 Bug。
- 只处理 `ZENTAO_PROJECT_ID` 对应项目上下文。
- 不跨产品、不跨项目查 Bug。
- 默认不回写禅道。
- 只有你明确允许，并且 `.env` 中 `ZENTAO_ALLOW_WRITE=true`，才允许执行 resolve 等写操作。

## 故障排查

如果登录失败：

- 检查 `ZENTAO_BASE_URL` 是否能访问。
- 检查 `ZENTAO_ACCOUNT` 和 `ZENTAO_PASSWORD` 是否正确。

如果列表读取为空：

- 确认 `ZENTAO_PRODUCT_ID` 是否是 Bug 页面 URL 中的 `productID`。
- 当前脚本默认使用 `status=unclosed`。

如果接口 404：

- 先保持 `ZENTAO_API_PREFIX=/api.php/v1`。
- 如果你们禅道 API 路由不同，再尝试 `/api/v1`。

如果图片下载失败：

- Codex 仍可根据文本处理。
- 必要时检查禅道文件读取权限或截图 URL 是否过期。
