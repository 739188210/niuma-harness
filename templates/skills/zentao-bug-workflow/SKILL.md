---
name: zentao-bug-workflow
description: Read and process bugs from a self-hosted ZenTao 20.6 instance using the bundled cross-platform Python script and local zentao.config.json credentials, scopes, and write policy. Use when the user asks the agent to handle a ZenTao/禅道 bug, read bug details, list active ZenTao bugs, use a ZenTao bug as the basis for code changes, or optionally write a verified fix result back to ZenTao.
---

# ZenTao Bug Workflow

## Overview

Use this workflow to read ZenTao bugs, understand reproduction details, modify the current repository, validate the fix, and optionally resolve the bug. The skill is designed for self-hosted ZenTao Open Source 20.6 deployments that use API v1.

## Configuration

Read runtime configuration from `zentao.config.json` in this skill directory. Niuma distributes `zentao.config.example.json`, not the runtime config. The example is tool-managed and may be refreshed on re-init; never edit it as the live config.

Before first use:

1. From the skill directory, run `python scripts/zentao_bug.py init-config` on Windows or `python3 scripts/zentao_bug.py init-config` on Linux/macOS. It creates `zentao.config.json` from the example only when the local config is missing; it never overwrites an existing local config.
2. Ask the user to fill `api.baseUrl`, `auth.account`, and `auth.password` locally. Never ask them to paste passwords, tokens, session cookies, or the populated config into chat.
3. Run `python scripts/zentao_bug.py ping` on Windows or `python3 scripts/zentao_bug.py ping` on Linux/macOS only after those local connection values are configured.
4. Guide the user through the non-sensitive scope and writeback choices below before running bug commands.

If the helper is unavailable, manually copy `zentao.config.example.json` to `zentao.config.json` in the same directory. Do not make the helper fall back to the example.

The local `zentao.config.json` is not managed by Niuma, is not synchronized between agent roots, and should not be committed.

Required top-level sections:

- `api.baseUrl`
- `api.prefix`
- `auth.account`
- `auth.password`
- `scopes.read`
- `scopes.write`
- `writePolicy`
- `safety`

Example:

```json
{
  "api": {
    "baseUrl": "http://zentao.example.com",
    "prefix": "/api.php/v1",
    "commentEndpoint": ""
  },
  "auth": {
    "account": "agent",
    "password": "change-me"
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

If an existing `zentao.config.json` still contains placeholders such as `zentao.example.com` or `change-me`, stop before network access and ask the user to update those values locally.

### Scope Examples

Keep the distributed `scopes.read` and `scopes.write` arrays empty until the user explicitly confirms the product, project, read range, and writeback level. After confirmation, a project-limited read scope plus comment-only write scope looks like:

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

Use `{ "product": 12, "projects": [] }` only when the user approves product-wide read access. The example IDs are not authorization defaults. A write scope must list `actions` from `comment` and `resolve`; it remains inactive until `writePolicy.enabled=true` is also explicitly approved.

### First-Use Scope Setup

The distributed example starts with empty read and write scopes. If the connection values are configured but `scopes.read` is missing or empty, start a guided setup instead of continuing to a normal bug command. An empty `scopes.write` is a valid read-only choice.

Rules:

- Never ask the user to paste passwords, tokens, or session cookies into chat.
- First run `scripts/zentao_bug.py ping` to verify the address and credentials; `ping` is allowed before scopes are configured.
- Ask for non-sensitive business identifiers first:
  - product name, such as `素材库`
  - project name, such as `FAT测试` or `素材中心`
  - whether read access should cover the whole product or only the named project
  - whether writeback is allowed: no writeback, comment only, or comment plus resolve
- Prefer product and project names over numeric IDs because most users do not know ZenTao IDs.
- Try to resolve product/project names to IDs through available ZenTao API pages, web pages, bug URLs, or a user-provided bug ID. If there are multiple matches, show only the non-sensitive candidates and ask the user to choose.
- Ask for numeric product/project IDs only as a fallback when name lookup is unavailable, ambiguous, or blocked by permissions.
- After the user confirms the intended product/project and writeback policy, update `zentao.config.json` for them.
- Do not add, broaden, or remove scopes without explicit user confirmation in the same conversation.
- Keep `writePolicy.autoCommentAfterValidation` and `writePolicy.autoResolveAfterValidation` disabled unless the user explicitly asks for automatic writeback.

Recommended first-use questions:

1. `产品名称是什么？`
2. `项目名称是什么？读取范围是整个产品，还是只限这个项目？`
3. `处理完成后是否允许写回禅道？不写回 / 只评论 / 评论并解决。`

## Scope Boundary

Use `zentao.config.json` as the effective authorization boundary. Do not use the account's full ZenTao permissions as authorization.

- Read a bug only if its `product` and `project` match `scopes.read`.
- Write to a bug only if `writePolicy.enabled=true`, the bug matches `scopes.write`, and the write action is listed in that scope's `actions`.
- A read scope with `"projects": []` means product-wide read access for that product.
- A read scope with `"projects": [91]` means only bugs in that project, plus project `0` or blank when `safety.allowProjectZero=true`.
- `list-active` and `list-unclosed` require product-wide read scopes because ZenTao's product bug list can include bugs from multiple projects.
- If the user gives a ZenTao URL or bug ID outside configured scopes, stop and ask for explicit confirmation before changing config.
- Do not add, broaden, or remove scopes unless the user explicitly confirms the change.

## Commands

From this skill directory, prefer the Python entrypoint because it works on Windows, Linux, and macOS:

```bash
# Windows
python scripts/zentao_bug.py init-config
# Linux/macOS
python3 scripts/zentao_bug.py init-config

python scripts/zentao_bug.py list-active
python scripts/zentao_bug.py list-unclosed
python scripts/zentao_bug.py get 12345
python scripts/zentao_bug.py prepare 12345
python scripts/zentao_bug.py cleanup 12345
python scripts/zentao_bug.py ping
python scripts/zentao_bug.py comment 12345 --comment "修复搜索无结果空状态多余文案。"
```

Resolve only after explicit user approval and only when `writePolicy.enabled=true` and the bug matches a write scope with `resolve` in `actions`:

```bash
python scripts/zentao_bug.py resolve 12345 --comment "修复搜索无结果空状态多余文案。"
```

When resolving a bug, the script must assign it back to the bug opener (`openedBy.account`) by default for acceptance. Use `--assigned-to <account>` only when the user explicitly specifies a different receiver.

After code changes and validation, use `validated` when the user has explicitly enabled automatic ZenTao writeback. It follows `writePolicy.autoCommentAfterValidation` and `writePolicy.autoResolveAfterValidation`:

```bash
python scripts/zentao_bug.py validated 12345 --comment "修复搜索无结果空状态多余文案。"
```

On Windows, `scripts/zentao_bug.ps1` remains as a compatibility wrapper around `scripts/zentao_bug.py`.

## Bug Handling Workflow

When the user asks to process a ZenTao bug:

1. Read `references/zentao-20.6-api.md` if API behavior or endpoint shape is relevant.
2. Check whether `zentao.config.json` appears configured without printing secrets.
3. Prepare a task directory with `scripts/zentao_bug.py prepare <bugID>` instead of plain `get` when the goal is to fix the bug.
4. Load the generated `bug.json`, `steps.txt`, and any downloaded images from `tasks/bug-<id>-<timestamp>/images`.
5. Summarize the bug title, reproduction steps, expected behavior, actual behavior, severity, module, assignee, build, and image evidence.
   If the ZenTao description, reproduction steps, expected behavior, or actual behavior is unclear or internally inconsistent after reading the bug information, stop and confirm with the user before making code changes.
6. Inspect the repository before editing. Search for relevant route names, UI text, error messages, API names, stack traces, or module names from the bug.
7. Make the smallest code change that addresses the root cause and matches existing repo patterns.
8. Validate with the most focused relevant tests, lint, typecheck, or build available for the changed area.
9. If the fix affects a frontend page, modal, upload flow, save action, toast/message, navigation, table/list refresh, form state, or visible UI behavior, verify the behavior with Playwright or the Browser plugin against the running app.
10. Report the changed files, automated validation result, browser verification result, and a concise fix note suitable for ZenTao.
    ZenTao writeback comments must be short and only describe the problem or fix, for example `修复搜索无结果空状态多余文案。`.
    Do not write validation commands, test names, browser steps, build output, local paths, or process logs into ZenTao comments.
    End the final response with one separate line named `日志/commit 总结：`, formatted as `<bugID> <short natural-language fix summary>`.
11. Clean up the task directory with `scripts/zentao_bug.py cleanup <bugID>` after the bug is handled and no further image inspection is needed.
12. Ask before any write operation to ZenTao unless the user already gave explicit approval in the same request.

## Frontend Verification

Use browser-based verification whenever a bug concerns visible frontend behavior. Prefer Playwright or the Browser plugin to perform the actual user flow described by the ZenTao bug:

- Open the affected route from `steps.txt`.
- Reproduce the original interaction, such as edit, save, upload, delete, filter, search, close modal, or navigate.
- Check the observable result: toast/message appears, modal closes, list refreshes, upload state resets, page navigates, button state changes, or validation text changes.
- Capture screenshots when they help compare the fix against the ZenTao image evidence.
- Inspect console errors and failed network requests if the UI still behaves incorrectly.

Do not treat a frontend fix as fully verified by build/typecheck alone unless the app cannot be run locally or the user explicitly waives browser verification. If browser verification cannot be performed, state exactly why in the final response.

## Task Directories

Use `tasks/` under this skill directory for transient per-bug material. `prepare <bugID>` creates a directory named `bug-<id>-<timestamp>` containing:

- `bug.json`: raw scoped ZenTao bug response.
- `steps.html`: raw HTML reproduction field.
- `steps.txt`: readable text extracted from the reproduction field.
- `task.json`: local task summary and downloaded image paths.
- `images/`: screenshots or inline images referenced by the bug.

Treat task directories as temporary. Do not modify repository code from inside `tasks/`; only use it as read-only evidence while fixing the real project. Before final response, run `cleanup <bugID>` unless the user explicitly asks to keep the evidence directory.

## Write Policy

Default to read-only. Do not resolve, close, edit, or comment on a ZenTao bug unless all conditions are true:

- The user explicitly requested the write action.
- `writePolicy.enabled=true`.
- The bug belongs to a configured `scopes.write` entry.
- The requested write action is allowed by that scope's `actions`.
- The repository fix was made and validation was attempted.
- The response text to be written does not include secrets, tokens, local absolute credential paths, or unrelated debugging logs.

Standalone comments use ZenTao's web comment form flow by default: GET the comment form, parse `uid`, then POST `actioncomment` plus `uid`. `api.commentEndpoint` is only an override when a deployment uses a different comment path. Resolving bugs also uses ZenTao's web resolve form flow: GET the resolve form, parse `uid`, then POST `resolution`, `resolvedBuild`, `resolvedDate`, `assignedTo`, and optional rich-text `comment`. Convert resolve comments to `<p>...</p>` HTML before submit so Chinese text is preserved. The default `assignedTo` for resolve must be the bug opener (`openedBy.account`) so the issue returns to the reporter/acceptance owner instead of remaining assigned to the current handler.

ZenTao writeback comments are not validation reports. Keep them concise, normally one sentence and no more than 80 Chinese characters. The Python helper rejects comments that contain common validation/process terms such as `验证：`, `pnpm`, `vitest`, `vue-tsc`, or `build:local`.

If validation fails for unrelated reasons, explain that and do not resolve the ZenTao bug automatically.

## Failure Handling

If authentication fails, tell the user to check `api.baseUrl`, `auth.account`, and `auth.password` in `zentao.config.json`.

If endpoints return 404, try changing `api.prefix` between `/api.php/v1` and `/api/v1`.

If list commands are blocked because only project-level read scopes exist, ask the user whether to add a product-wide read scope or provide a specific bug ID.

If bug fields are missing or the response shape differs, inspect the JSON response and adjust `scripts/zentao_bug.py` rather than guessing.

If image download fails, continue with text evidence and mention the failed image URLs without printing credentials or tokens.

Never print `auth.password` or token values in final answers.
