---
description: 列出当前 GitLab 用户参与的项目，并按易读格式汇总
argument-hint: ""
---

请列出当前 `glab` 已登录用户参与的 GitLab 项目，并用中文汇总。

## 执行步骤

1. 检查 `glab` 认证状态：
   `glab auth status --hostname 192.168.31.107:9090`
   - 如果失败，停止并提示用户先登录。

2. 优先使用 `GITLAB_HOST` 指定自建实例，并用 `glab repo list` 查看成员项目：
   `GITLAB_HOST=192.168.31.107:9090 glab repo list --member --per-page 100`

3. 如果第 2 步输出为空或信息不足，使用 GitLab API 兜底，同样显式指定 host：
   `GITLAB_HOST=192.168.31.107:9090 glab api "projects?membership=true&per_page=100"`

4. 如需更易读的结果，可以用 Python 解析 API JSON：
   `GITLAB_HOST=192.168.31.107:9090 glab api "projects?membership=true&per_page=100" | python -c "import sys,json; data=json.load(sys.stdin); print('membership_count=' + str(len(data))); print('\n'.join('{}\t{}\t{}\t{}'.format(p.get('id'), p.get('path_with_namespace'), p.get('visibility'), p.get('last_activity_at')) for p in data))"`

## 输出要求

请汇总：

- 项目总数
- 每个项目的 ID、path_with_namespace、visibility、last_activity_at（如果可用）
- 常用操作示例：`glab repo view <project-path>`、`glab repo clone <project-path>`

## 安全约束

- 只读查询，不要创建、删除或修改项目。
- 不要输出 token 或敏感配置。
- 如果 `gitlab.com` 的认证失败但 `192.168.31.107:9090` 正常，不要把它当作阻塞错误；说明当前自建 GitLab 正常即可。
