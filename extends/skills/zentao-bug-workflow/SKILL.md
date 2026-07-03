---
name: zentao-bug-workflow
description: Read and process bugs from a self-hosted ZenTao 20.6 instance using the bundled PowerShell script and local `.env` credentials. Use when the user asks Codex to handle a ZenTao/禅道 bug, read bug details, list active ZenTao bugs, use a ZenTao bug as the basis for code changes, or optionally write a verified fix result back to ZenTao.
---

# ZenTao Bug Workflow

## Overview

Use this workflow to read ZenTao bugs, understand the reproduction details, modify the current repository, validate the fix, and optionally resolve the bug. The skill is designed for self-hosted ZenTao Open Source 20.6 deployments that use API v1.

## Configuration

Read credentials from `.env` in this skill directory. Do not ask the user to paste passwords or tokens into chat.

Required keys:

- `ZENTAO_BASE_URL`
- `ZENTAO_ACCOUNT`
- `ZENTAO_PASSWORD`
- `ZENTAO_PRODUCT_ID`
- `ZENTAO_PROJECT_ID`
- `ZENTAO_API_PREFIX`
- `ZENTAO_ALLOW_WRITE`

Before first use, tell the user to fill `.env` if it still contains placeholders such as `zentao.example.com` or `change-me`.

## Scope Boundary

Operate only inside the product and project declared in `.env`:

- Read bugs only for `ZENTAO_PRODUCT_ID`.
- Treat `ZENTAO_PROJECT_ID` as the only authorized project context.
- Do not list, inspect, search, update, or resolve bugs from other products or projects, even if the configured account can access them.
- If a user gives a ZenTao URL or bug ID that appears outside the configured product/project, stop and ask for explicit confirmation before reading it.
- Do not use account permissions as authorization. Use the `.env` product and project IDs as the effective boundary for this skill.

## Commands

Run commands from any working directory:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" list-active
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" list-unclosed
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" get 12345
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" prepare 12345
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" cleanup 12345
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" ping
```

Resolve only after explicit user approval and only when `.env` has `ZENTAO_ALLOW_WRITE=true`:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\zentao-bug-workflow\scripts\zentao_bug.ps1" resolve 12345
```

## Bug Handling Workflow

When the user asks to process a ZenTao bug:

1. Read `references/zentao-20.6-api.md` if API behavior or endpoint shape is relevant.
2. Check whether `.env` appears configured without printing secrets.
3. Prepare a task directory with `scripts/zentao_bug.ps1 prepare <bugID>` instead of plain `get` when the goal is to fix the bug.
4. Load the generated `bug.json`, `steps.txt`, and any downloaded images from `tasks/bug-<id>-<timestamp>/images`.
5. Summarize the bug title, reproduction steps, expected behavior, actual behavior, severity, module, assignee, build, and image evidence.
   If the ZenTao description, reproduction steps, expected behavior, or actual behavior is unclear or internally inconsistent after reading the bug information, stop and confirm with the user before making code changes. Do not infer missing product behavior or proceed based on guesses.
6. Inspect the repository before editing. Search for relevant route names, UI text, error messages, API names, stack traces, or module names from the bug.
7. Make the smallest code change that addresses the root cause and matches existing repo patterns.
8. Validate with the most focused relevant tests, lint, typecheck, or build available for the changed area.
9. If the fix affects a frontend page, modal, upload flow, save action, toast/message, navigation, table/list refresh, form state, or visible UI behavior, verify the behavior with Playwright or the Browser plugin against the running app.
10. Report the changed files, automated validation result, browser verification result, and a concise fix note suitable for ZenTao.
    End the final response with one separate line named `日志/commit 总结：`, formatted as `<bugID> <short natural-language fix summary>`.
    Derive the summary from the resolved behavior, not by copying the full ZenTao title. Keep it short enough for a daily log or Git commit message.
    Example: for `6515 【FAT_素材管理】上传素材页面中选择的文件 上传失败了，没有删除按钮，期望：增加删除`, output `日志/commit 总结：6515 上传素材页面新增上传文件的删除按钮`.
11. Clean up the task directory with `scripts/zentao_bug.ps1 cleanup <bugID>` after the bug is handled and no further image inspection is needed.
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
- `.env` has `ZENTAO_ALLOW_WRITE=true`.
- The bug belongs to the configured `ZENTAO_PRODUCT_ID` and `ZENTAO_PROJECT_ID` context.
- The repository fix was made and validation was attempted.
- The response text to be written does not include secrets, tokens, local absolute credential paths, or unrelated debugging logs.

If validation fails for unrelated reasons, explain that and do not resolve the ZenTao bug automatically.

## Failure Handling

If authentication fails, tell the user to check `ZENTAO_BASE_URL`, `ZENTAO_ACCOUNT`, and `ZENTAO_PASSWORD` in `.env`.

If endpoints return 404, try changing `ZENTAO_API_PREFIX` between `/api.php/v1` and `/api/v1`.

If bug fields are missing or the response shape differs, inspect the JSON response and adjust `scripts/zentao_bug.ps1` rather than guessing.

If image download fails, continue with text evidence and mention the failed image URLs without printing credentials or tokens.

Never print `ZENTAO_PASSWORD` or token values in final answers.
