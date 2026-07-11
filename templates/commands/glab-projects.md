---
description: 列出当前 GitLab 用户参与的项目，并按易读格式汇总
argument-hint: ""
---

请列出当前 `glab` 已登录用户参与的 GitLab 项目，并用中文汇总。

## 执行步骤

1. 确定本次查询的 GitLab host：
   - 优先采用用户已设置的 `GITLAB_HOST`；否则根据当前仓库的 Git remote 和 `glab` 配置判断。
   - 如果存在多个候选实例且无法确定，询问用户，不要猜测 host。
   - 将选定值记为 `<gitlab-host>`；不要在模板中写死 IP、域名或端口。

2. 检查选定实例的认证状态：
   `glab auth status --hostname <gitlab-host>`
   - 如果失败，停止并提示用户先登录。

3. 通过 `GITLAB_HOST` 显式指定同一 host，并列出当前用户参与的全部项目：
   `GITLAB_HOST=<gitlab-host> glab api --paginate "projects?membership=true&per_page=100"`
   - 不要对包含端口的自建实例使用 `glab api --hostname`；部分 `glab` 版本会将其判定为无效 hostname。

4. 如需更易读的结果，可以用 Python 解析 API JSON：
   `GITLAB_HOST=<gitlab-host> glab api --paginate "projects?membership=true&per_page=100" | python -c "import sys,json; data=json.load(sys.stdin); print('membership_count=' + str(len(data))); print('\n'.join('{}\t{}\t{}\t{}'.format(p.get('id'), p.get('path_with_namespace'), p.get('visibility'), p.get('last_activity_at')) for p in data))"`

## 输出要求

请汇总：

- 项目总数
- 每个项目的 ID、path_with_namespace、visibility、last_activity_at（如果可用）
- 常用操作示例：`glab repo view <project-path>`、`glab repo clone <project-path>`

## 安全约束

- 只读查询，不要创建、删除或修改项目。
- 不要输出 token 或敏感配置。
- 只检查并使用本次明确选定的 GitLab 实例；其他已配置实例的认证失败不应视为阻塞错误。
