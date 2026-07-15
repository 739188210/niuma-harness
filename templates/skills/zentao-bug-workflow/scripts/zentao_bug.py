#!/usr/bin/env python3
"""Cross-platform ZenTao bug helper for the zentao-bug-workflow skill."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from http import cookiejar
from urllib import error, parse, request


SECRET_KEYS = {"token", "password", "authtoken", "accesstoken", "refreshtoken"}
PLACEHOLDER_CONFIG_VALUES = {
    ("auth", "account"): {"change-me"},
    ("auth", "password"): {"change-me"},
}
PLACEHOLDER_HOSTS = {"zentao.example.com"}
PROCESS_COMMENT_PATTERNS = (
    "验证：",
    "验证:",
    "Vitest",
    "vitest",
    "vue-tsc",
    "build:local",
    "pnpm",
    "Playwright",
    "浏览器验证",
)


def skill_root() -> Path:
    return Path(__file__).resolve().parents[1]


def command_init_config(root: Path) -> dict[str, Any]:
    example = root / "zentao.config.example.json"
    config_path = root / "zentao.config.json"

    if config_path.is_symlink():
        raise RuntimeError(f"Refusing to initialize local config through symlink: {config_path.name}")
    if config_path.exists():
        if not config_path.is_file():
            raise RuntimeError(f"Local config path is not a regular file: {config_path.name}")
        return {
            "created": False,
            "config": config_path.name,
            "nextStep": "Local config already exists and was not modified.",
        }

    if example.is_symlink() or not example.is_file():
        raise RuntimeError(f"Config example must be a regular file: {example.name}")

    contents = example.read_bytes()
    try:
        with config_path.open("xb") as fh:
            fh.write(contents)
        if os.name != "nt":
            config_path.chmod(0o600)
    except FileExistsError:
        return {
            "created": False,
            "config": config_path.name,
            "nextStep": "Local config already exists and was not modified.",
        }
    except Exception:
        try:
            config_path.unlink()
        except FileNotFoundError:
            pass
        raise

    return {
        "created": True,
        "config": config_path.name,
        "nextStep": (
            "Fill api.baseUrl, auth.account, and auth.password locally, then run ping. "
            "Do not paste passwords, tokens, cookies, or the populated config into chat."
        ),
    }


def load_config(root: Path) -> dict[str, Any]:
    path = root / "zentao.config.json"
    if not path.exists():
        example = root / "zentao.config.example.json"
        raise RuntimeError(
            f"Missing local config at {path}. Run init-config or copy {example.name} to {path.name}, then fill sensitive values locally. "
            "Do not paste passwords, tokens, cookies, or the populated config into chat."
        )
    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def require_config(config: dict[str, Any], include_scopes: bool = True) -> None:
    required = [
        ("api", "baseUrl"),
        ("api", "prefix"),
        ("auth", "account"),
        ("auth", "password"),
    ]
    if include_scopes:
        required.extend([("scopes", "read"), ("scopes", "write")])
    for section, key in required:
        value = config.get(section, {}).get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            raise RuntimeError(f"Missing required zentao.config.json value: {section}.{key}")
        assert_not_placeholder_config(section, key, value)

    if include_scopes:
        scopes = config.get("scopes")
        if not isinstance(scopes, dict):
            raise RuntimeError("zentao.config.json scopes must be an object")
        read_scopes = scopes.get("read")
        write_scopes = scopes.get("write")
        if not isinstance(read_scopes, list) or not isinstance(write_scopes, list):
            raise RuntimeError("zentao.config.json scopes.read and scopes.write must be arrays")
        validate_scope_entries(read_scopes, "read")
        validate_scope_entries(write_scopes, "write")
        if not read_scopes:
            raise RuntimeError(
                "zentao.config.json scopes.read is empty. Complete the First-Use Scope Setup before running bug commands; "
                "scopes.write may remain empty for read-only use."
            )


def validate_scope_entries(scopes: list[Any], scope_type: str) -> None:
    for index, scope in enumerate(scopes):
        label = f"scopes.{scope_type}[{index}]"
        if not isinstance(scope, dict):
            raise RuntimeError(f"zentao.config.json {label} must be an object")
        if scope.get("product") is None or isinstance(scope.get("product"), (dict, list, bool)):
            raise RuntimeError(f"zentao.config.json {label}.product must be a product ID")
        if not isinstance(scope.get("projects"), list):
            raise RuntimeError(f"zentao.config.json {label}.projects must be an array")
        if scope_type == "write":
            actions = scope.get("actions")
            if not isinstance(actions, list) or any(action not in {"comment", "resolve"} for action in actions):
                raise RuntimeError(
                    f"zentao.config.json {label}.actions must be an array containing only comment or resolve"
                )


def assert_not_placeholder_config(section: str, key: str, value: Any) -> None:
    if not isinstance(value, str):
        return

    if (section, key) == ("api", "baseUrl"):
        host = normalize_hostname(parse.urlparse(value.strip()).hostname or "")
        if host == "example.com" or host in PLACEHOLDER_HOSTS or host.endswith(".example.com"):
            raise_placeholder_config_error(section, key)
        return

    placeholders = PLACEHOLDER_CONFIG_VALUES.get((section, key), set())
    if value.strip() in placeholders:
        raise_placeholder_config_error(section, key)


def normalize_hostname(host: str) -> str:
    return host.strip().lower().rstrip(".")


def raise_placeholder_config_error(section: str, key: str) -> None:
    raise RuntimeError(
        f"zentao.config.json still contains placeholder value for {section}.{key}. "
        "Edit the local config file before running ZenTao network requests; do not paste passwords into chat."
    )


def join_url(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


class NoRedirectHandler(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


def request_json(
    method: str,
    url: str,
    body: dict[str, Any] | None = None,
    token: str | None = None,
) -> Any:
    headers = {"Accept": "application/json"}
    data = None
    if token:
        headers["Token"] = token
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {url}: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Request failed for {url}: {exc.reason}") from exc

    if not raw:
        return {}
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Response was not JSON for {url}: {text[:500]}") from exc


def request_text(
    method: str,
    url: str,
    token: str | None = None,
    form: dict[str, Any] | None = None,
    opener: request.OpenerDirector | None = None,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, str]:
    headers = {"Accept": "*/*"}
    if extra_headers:
        headers.update(extra_headers)
    data = None
    if token:
        headers["Token"] = token
    if form is not None:
        data = parse.urlencode(form).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"

    req = request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        open_fn = opener.open if opener else request.urlopen
        with open_fn(req, timeout=30) as resp:
            status = getattr(resp, "status", 200)
            raw = resp.read()
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {url}: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Request failed for {url}: {exc.reason}") from exc

    return status, raw.decode("utf-8", errors="replace")


def configured_endpoint(config: dict[str, Any], key: str, bug_id: int) -> str:
    endpoint = config.get("api", {}).get(key, "")
    if not endpoint:
        return ""
    formatted = str(endpoint).format(bugID=bug_id, bugId=bug_id, id=bug_id)
    if re.match(r"^https?://", formatted):
        return formatted
    return join_url(config["api"]["baseUrl"], formatted)


def default_comment_endpoint(config: dict[str, Any], bug_id: int) -> str:
    endpoint = config.get("api", {}).get("commentEndpoint", "")
    if endpoint:
        return configured_endpoint(config, "commentEndpoint", bug_id)
    return join_url(config["api"]["baseUrl"], f"index.php?m=action&f=comment&objectType=bug&objectID={bug_id}")


def add_query(url: str, params: dict[str, str]) -> str:
    parsed = parse.urlsplit(url)
    current = dict(parse.parse_qsl(parsed.query, keep_blank_values=True))
    current.update(params)
    query = parse.urlencode(current)
    return parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, parsed.fragment))


def get_token(config: dict[str, Any]) -> str:
    token_url = join_url(config["api"]["baseUrl"], config["api"]["prefix"].rstrip("/") + "/tokens")
    response = request_json(
        "POST",
        token_url,
        {
            "account": config["auth"]["account"],
            "password": config["auth"]["password"],
        },
    )
    token = response.get("token") or response.get("data", {}).get("token")
    if not token:
        raise RuntimeError("ZenTao token response did not include a token.")
    return str(token)


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if str(key).lower() in SECRET_KEYS:
                result[key] = "[REDACTED]"
            else:
                result[key] = redact(item)
        return result
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def print_json(value: Any) -> None:
    print(json.dumps(redact(value), ensure_ascii=False, indent=2))


def html_to_text(source: str) -> str:
    if not source:
        return ""
    decoded = html.unescape(source)
    with_breaks = re.sub(r"(?i)</p>|<br\s*/?>", "\n", decoded)
    text = re.sub(r"<[^>]+>", "", with_breaks)
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def bug_object(response: Any) -> Any:
    if isinstance(response, dict):
        if "data" in response:
            return response["data"]
        if "bug" in response:
            return response["bug"]
    return response


def field_value(value: Any, names: list[str]) -> Any:
    if isinstance(value, dict):
        for name in names:
            if name in value:
                return value[name]
        for nested in ("data", "bug"):
            if nested in value:
                result = field_value(value[nested], names)
                if result is not None:
                    return result
    return None


def bool_config(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).lower() == "true"


def scope_matches(scope: dict[str, Any], product: Any, project: Any, allow_project_zero: bool) -> bool:
    if not scope or scope.get("product") is None or product is None:
        return False
    if str(scope.get("product")) != str(product):
        return False

    projects = scope.get("projects") or []
    if len(projects) == 0:
        return True

    if allow_project_zero and (project is None or str(project) in {"", "0"}):
        return True

    return any(str(allowed) == str(project) for allowed in projects)


def assert_read_scope(response: Any, config: dict[str, Any]) -> None:
    product = field_value(response, ["product", "productID"])
    project = field_value(response, ["project", "projectID"])
    allow_project_zero = bool_config(config.get("safety", {}).get("allowProjectZero"), True)
    deny_by_default = bool_config(config.get("safety", {}).get("denyByDefault"), True)

    for scope in config.get("scopes", {}).get("read", []):
        if scope_matches(scope, product, project, allow_project_zero):
            return

    if not deny_by_default:
        return

    raise RuntimeError(f"Bug is outside configured read scopes. product={product} project={project}.")


def assert_write_scope(response: Any, config: dict[str, Any], action: str) -> None:
    product = field_value(response, ["product", "productID"])
    project = field_value(response, ["project", "projectID"])
    allow_project_zero = bool_config(config.get("safety", {}).get("allowProjectZero"), True)

    for scope in config.get("scopes", {}).get("write", []):
        actions = scope.get("actions") or []
        if scope_matches(scope, product, project, allow_project_zero) and action in actions:
            return

    raise RuntimeError(
        f"Bug is outside configured write scopes or action is not allowed. "
        f"action={action} product={product} project={project}."
    )


def product_wide_read_scopes(config: dict[str, Any]) -> list[dict[str, Any]]:
    scopes = []
    for scope in config.get("scopes", {}).get("read", []):
        if scope.get("product") is not None and len(scope.get("projects") or []) == 0:
            scopes.append(scope)
    return scopes


def task_root(root: Path) -> Path:
    return root / "tasks"


def new_task_dir(root: Path, bug_id: int) -> Path:
    parent = task_root(root)
    parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = parent / f"bug-{bug_id}-{stamp}"
    (path / "images").mkdir(parents=True, exist_ok=True)
    return path


def image_refs(steps_html: str, config: dict[str, Any]) -> list[dict[str, str]]:
    refs: dict[str, dict[str, str]] = {}
    if not steps_html:
        return []

    decoded = html.unescape(steps_html)
    for match in re.finditer(r"""src=["']([^"']+)["']""", decoded):
        src = match.group(1)
        if re.match(r"^https?://", src):
            path = parse.urlparse(src).path
            name = Path(path).name or f"image-{len(refs) + 1}.png"
            refs[src] = {"url": src, "fileName": name}

    for match in re.finditer(r"fileID=(\d+)", decoded):
        file_id = match.group(1)
        url = join_url(config["api"]["baseUrl"], f"index.php?m=file&f=read&t=png&fileID={file_id}")
        refs[url] = {"url": url, "fileName": f"{file_id}.png"}

    for match in re.finditer(r"\{(\d+)\.(png|jpg|jpeg|gif|webp)\}", decoded, flags=re.IGNORECASE):
        file_id, ext = match.group(1), match.group(2)
        url = join_url(config["api"]["baseUrl"], f"index.php?m=file&f=read&t={ext}&fileID={file_id}")
        refs[url] = {"url": url, "fileName": f"{file_id}.{ext}"}

    return list(refs.values())


def same_origin(left: str, right: str) -> bool:
    left_parts = parse.urlparse(left)
    right_parts = parse.urlparse(right)
    return (
        left_parts.scheme.lower(),
        normalize_hostname(left_parts.hostname or ""),
        left_parts.port,
    ) == (
        right_parts.scheme.lower(),
        normalize_hostname(right_parts.hostname or ""),
        right_parts.port,
    )


def download_file(url: str, target: Path, token: str, config: dict[str, Any]) -> None:
    if not same_origin(url, config["api"]["baseUrl"]):
        raise RuntimeError(f"Refusing to download external image URL from ZenTao bug content: {url}")
    req = request.Request(url, headers={"Token": token})
    opener = request.build_opener(NoRedirectHandler)
    with opener.open(req, timeout=30) as resp:
        target.write_bytes(resp.read())


def save_bug_task(response: Any, config: dict[str, Any], token: str, root: Path, bug_id: int) -> dict[str, Any]:
    bug = bug_object(response)
    path = new_task_dir(root, bug_id)
    images = path / "images"
    steps_html = str(bug.get("steps", "")) if isinstance(bug, dict) else ""
    steps_text = html_to_text(steps_html)

    (path / "bug.json").write_text(json.dumps(redact(response), ensure_ascii=False, indent=2), encoding="utf-8")
    (path / "steps.html").write_text(steps_html, encoding="utf-8")
    (path / "steps.txt").write_text(steps_text, encoding="utf-8")

    downloads = []
    for index, ref in enumerate(image_refs(steps_html, config), start=1):
        file_name = ref.get("fileName") or f"image-{index}.png"
        target = images / file_name
        try:
            download_file(ref["url"], target, token, config)
            downloads.append({"url": ref["url"], "path": str(target), "ok": True})
        except Exception as exc:  # keep text evidence usable when images fail
            downloads.append({"url": ref["url"], "path": str(target), "ok": False, "error": str(exc)})

    summary = {
        "bugId": bug_id,
        "taskDir": str(path),
        "bugJson": str(path / "bug.json"),
        "stepsHtml": str(path / "steps.html"),
        "stepsText": str(path / "steps.txt"),
        "imageCount": sum(1 for item in downloads if item["ok"]),
        "downloads": downloads,
    }
    (path / "task.json").write_text(json.dumps(redact(summary), ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def cleanup_tasks(root: Path, bug_id: int, task_dir: str | None) -> dict[str, Any]:
    parent = task_root(root).resolve()
    if not parent.exists():
        return {"removed": [], "taskRoot": str(parent)}

    if task_dir:
        candidates = [Path(task_dir).resolve()]
    elif bug_id > 0:
        candidates = [path.resolve() for path in parent.glob(f"bug-{bug_id}-*") if path.is_dir()]
    else:
        raise RuntimeError("BugId or TaskDir is required for cleanup.")

    removed = []
    for candidate in candidates:
        try:
            candidate.relative_to(parent)
        except ValueError as exc:
            raise RuntimeError(f"Refusing to delete outside task root: {candidate}") from exc
        if not candidate.name.startswith("bug-"):
            raise RuntimeError(f"Refusing to delete non-bug task directory: {candidate}")
        shutil.rmtree(candidate)
        removed.append(str(candidate))

    return {"removed": removed, "taskRoot": str(parent)}


def base_api_url(config: dict[str, Any]) -> str:
    return join_url(config["api"]["baseUrl"], config["api"]["prefix"])


def command_ping(config: dict[str, Any], token: str) -> Any:
    return request_json("GET", f"{base_api_url(config)}/ping", token=token)


def command_list(config: dict[str, Any], token: str, limit: int, page: int) -> list[dict[str, Any]]:
    scopes = product_wide_read_scopes(config)
    if not scopes:
        raise RuntimeError(
            "list-unclosed requires a product-wide read scope with an empty projects array. "
            "Use get/prepare for a known bug ID, or add a product-wide scope in zentao.config.json."
        )

    products = sorted({str(scope["product"]) for scope in scopes})
    results = []
    for product in products:
        product_id = parse.quote(product, safe="")
        url = f"{base_api_url(config)}/bugs?product={product_id}&status=unclosed&limit={limit}&page={page}"
        results.append({"product": int(product) if product.isdigit() else product, "response": request_json("GET", url, token=token)})
    return results


def command_get(config: dict[str, Any], token: str, bug_id: int) -> Any:
    response = request_json("GET", f"{base_api_url(config)}/bugs/{bug_id}", token=token)
    assert_read_scope(response, config)
    return response


def command_prepare(config: dict[str, Any], token: str, root: Path, bug_id: int) -> dict[str, Any]:
    response = command_get(config, token, bug_id)
    return save_bug_task(response, config, token, root, bug_id)


def read_comment(args: argparse.Namespace) -> str:
    if args.comment_file:
        path = Path(args.comment_file)
        if not path.exists():
            raise RuntimeError(f"Comment file does not exist: {path}")
        return path.read_text(encoding="utf-8").strip()
    return (args.comment or "").strip()


def require_comment(comment: str) -> str:
    if not comment:
        raise RuntimeError("A non-empty comment is required. Pass --comment or --comment-file.")
    return comment


def require_concise_worklog_comment(comment: str) -> str:
    comment = require_comment(comment)
    plain = re.sub(r"\s+", "", html_to_text(comment) or comment)
    if len(plain) > 80:
        raise RuntimeError("ZenTao writeback comment must be concise: describe the fix in 80 Chinese characters or fewer.")
    for pattern in PROCESS_COMMENT_PATTERNS:
        if pattern in comment:
            raise RuntimeError(
                "ZenTao writeback comment should describe the fix only. "
                "Keep validation commands and process details in the final chat response, not in ZenTao."
            )
    return comment


def comment_to_html(comment: str) -> str:
    escaped = html.escape(comment).replace("\n", "<br />")
    return f"<p>{escaped}</p>"


def extract_uid(source: str) -> str:
    patterns = [
        r"""name=["']uid["'][^>]*value=["']([^"']+)["']""",
        r"""value=["']([^"']+)["'][^>]*name=["']uid["']""",
    ]
    for pattern in patterns:
        match = re.search(pattern, source, flags=re.IGNORECASE)
        if match:
            return html.unescape(match.group(1))
    raise RuntimeError("Could not find uid in ZenTao comment form HTML.")


def ensure_writes_enabled(config: dict[str, Any]) -> None:
    if not bool_config(config.get("writePolicy", {}).get("enabled"), False):
        raise RuntimeError(
            "Write operation blocked. Set writePolicy.enabled=true in zentao.config.json only after explicit user approval."
        )


def command_comment(config: dict[str, Any], token: str, bug_id: int, comment: str) -> Any:
    ensure_writes_enabled(config)
    comment = require_concise_worklog_comment(comment)
    response = command_get(config, token, bug_id)
    assert_write_scope(response, config, "comment")

    comment_url = default_comment_endpoint(config, bug_id)
    form_url = add_query(comment_url, {"t": "html"})
    opener = request.build_opener(request.HTTPCookieProcessor(cookiejar.CookieJar()))
    _, form_html = request_text("GET", form_url, token=token, opener=opener)
    uid = extract_uid(form_html)
    status, body = request_text(
        "POST",
        comment_url,
        token=token,
        opener=opener,
        extra_headers={
            "X-Requested-With": "XMLHttpRequest",
            "Referer": form_url,
        },
        form={
            "actioncomment": comment_to_html(comment),
            "uid": uid,
        },
    )
    if "添加备注" in body and "actioncomment" in body:
        raise RuntimeError(
            "ZenTao returned the comment form after POST instead of accepting the comment. "
            "The web comment endpoint likely requires a browser login session and does not accept API Token authentication."
        )
    return {
        "status": status,
        "commented": True,
        "bodyPreview": body[:500],
    }


def account_from_user_field(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("account") or value.get("id") or "")
    return str(value or "")


def default_resolve_assignee(bug: Any, config: dict[str, Any], assigned_to_override: str = "") -> str:
    if assigned_to_override.strip():
        return assigned_to_override.strip()
    if isinstance(bug, dict):
        opened_by = account_from_user_field(bug.get("openedBy"))
        if opened_by:
            return opened_by
        assigned_to = account_from_user_field(bug.get("assignedTo"))
        if assigned_to:
            return assigned_to
    return str(config.get("auth", {}).get("account", ""))


def command_resolve_web(
    config: dict[str, Any],
    token: str,
    bug_response: Any,
    bug_id: int,
    resolution: str,
    comment: str,
    assigned_to_override: str = "",
) -> Any:
    bug = bug_object(bug_response)
    assigned_to = default_resolve_assignee(bug, config, assigned_to_override)

    base = config["api"]["baseUrl"]
    form_url = join_url(base, f"index.php?m=bug&f=resolve&bugID={bug_id}&t=html")
    post_url = join_url(base, f"index.php?m=bug&f=resolve&bugID={bug_id}")
    opener = request.build_opener(request.HTTPCookieProcessor(cookiejar.CookieJar()))
    _, form_html = request_text("GET", form_url, token=token, opener=opener, extra_headers={"X-Requested-With": "XMLHttpRequest"})
    uid = extract_uid(form_html)

    form = {
        "resolution": resolution,
        "resolvedBuild": "trunk",
        "resolvedDate": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "assignedTo": assigned_to,
        "uid": uid,
    }
    if comment:
        form["comment"] = comment_to_html(comment)

    status, body = request_text(
        "POST",
        post_url,
        token=token,
        opener=opener,
        form=form,
        extra_headers={
            "X-Requested-With": "XMLHttpRequest",
            "Referer": form_url,
        },
    )
    try:
        parsed = json.loads(body) if body.strip() else {}
    except json.JSONDecodeError:
        parsed = {"bodyPreview": body[:500]}

    if isinstance(parsed, dict) and parsed.get("result") not in (None, "success"):
        raise RuntimeError(f"ZenTao resolve failed: {parsed}")

    return {
        "status": status,
        "resolved": True,
        "assignedTo": assigned_to,
        "response": parsed,
    }


def command_resolve(
    config: dict[str, Any],
    token: str,
    bug_id: int,
    resolution: str | None,
    comment: str = "",
    assigned_to: str = "",
) -> Any:
    ensure_writes_enabled(config)
    if comment:
        comment = require_concise_worklog_comment(comment)

    response = command_get(config, token, bug_id)
    assert_write_scope(response, config, "resolve")
    effective_resolution = resolution or config.get("writePolicy", {}).get("resolution") or "fixed"
    return command_resolve_web(config, token, response, bug_id, effective_resolution, comment, assigned_to)


def command_validated(config: dict[str, Any], token: str, bug_id: int, comment: str, resolution: str | None) -> dict[str, Any]:
    auto_comment = bool_config(config.get("writePolicy", {}).get("autoCommentAfterValidation"), False)
    auto_resolve = bool_config(config.get("writePolicy", {}).get("autoResolveAfterValidation"), False)
    if not auto_comment and not auto_resolve:
        return {
            "bugId": bug_id,
            "commented": False,
            "resolved": False,
            "skipped": "Both autoCommentAfterValidation and autoResolveAfterValidation are false.",
        }

    ensure_writes_enabled(config)
    responses = []
    commented = False
    resolved = False

    if auto_resolve:
        resolve_comment = require_concise_worklog_comment(comment) if auto_comment else comment
        responses.append({"action": "resolve", "response": command_resolve(config, token, bug_id, resolution, resolve_comment)})
        resolved = True
        commented = bool(resolve_comment)
    elif auto_comment:
        responses.append({"action": "comment", "response": command_comment(config, token, bug_id, require_concise_worklog_comment(comment))})
        commented = True

    return {
        "bugId": bug_id,
        "commented": commented,
        "resolved": resolved,
        "responses": responses,
    }


def positive_bug_id(value: int, command: str) -> int:
    if value <= 0:
        raise RuntimeError(f"BugId is required for {command}.")
    return value


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ZenTao bug workflow helper")
    parser.add_argument(
        "command",
        nargs="?",
        default="list-unclosed",
        choices=["get", "list-active", "list-unclosed", "prepare", "cleanup", "init-config", "ping", "comment", "resolve", "validated"],
    )
    parser.add_argument("bug_id", nargs="?", type=int, default=0)
    parser.add_argument("--limit", "-Limit", type=int, default=20)
    parser.add_argument("--page", "-Page", type=int, default=1)
    parser.add_argument("--resolution", "-Resolution", default="")
    parser.add_argument("--comment", "-Comment", default="")
    parser.add_argument("--comment-file", "-CommentFile", default="")
    parser.add_argument("--assigned-to", "-AssignedTo", default="")
    parser.add_argument("--task-dir", "-TaskDir", default="")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    root = skill_root()

    try:
        if args.command == "cleanup":
            print_json(cleanup_tasks(root, args.bug_id, args.task_dir or None))
            return 0
        if args.command == "init-config":
            print_json(command_init_config(root))
            return 0

        config = load_config(root)
        require_config(config, include_scopes=args.command != "ping")
        token = get_token(config)

        if args.command == "ping":
            print_json(command_ping(config, token))
        elif args.command in {"list-active", "list-unclosed"}:
            print_json(command_list(config, token, args.limit, args.page))
        elif args.command == "get":
            print_json(command_get(config, token, positive_bug_id(args.bug_id, "get")))
        elif args.command == "prepare":
            print_json(command_prepare(config, token, root, positive_bug_id(args.bug_id, "prepare")))
        elif args.command == "comment":
            print_json(command_comment(config, token, positive_bug_id(args.bug_id, "comment"), read_comment(args)))
        elif args.command == "resolve":
            print_json(
                command_resolve(
                    config,
                    token,
                    positive_bug_id(args.bug_id, "resolve"),
                    args.resolution,
                    read_comment(args),
                    args.assigned_to,
                )
            )
        elif args.command == "validated":
            print_json(command_validated(config, token, positive_bug_id(args.bug_id, "validated"), read_comment(args), args.resolution))
        else:
            raise RuntimeError(f"Unsupported command: {args.command}")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
