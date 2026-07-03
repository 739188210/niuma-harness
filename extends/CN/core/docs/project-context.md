# 项目上下文

此文件存储关于项目的已验证稳定事实。agent 和人类会在发现持久项目知识时维护它。

不要把此文件用于临时调查笔记、未验证猜测或任务本地细节。请将这些内容放入工作区级别的 `agent-work/` 目录或当前任务记录。

## 如何维护此文件

- 记录事实前，先根据当前工作区文件或用户确认进行验证。
- 优先记录简洁、持久的事实，而不是冗长的调查叙述。
- 当项目变化且旧上下文过时时，更新相关事实。
- 如果某个事实未知，就保持未知，并在任务执行期间检查工作区。

## 元数据

- Created: Unknown until verified.
- Last updated: Unknown until verified.
- Scan scope: Unknown until verified.
- Known gaps: 在此记录已验证的缺口；未知项在被发现前不要写入。

## 项目摘要

在验证后记录产品用途、主要用户，以及主要业务或领域目标。

## 技术栈

记录已验证的 runtime、language、framework、package manager、database、storage 和 test framework 细节。

## 代码地图

从当前工作区验证后，记录稳定的模块边界和重要路径。

## 工程约定

记录持久约定，例如 API response format、error handling、auth/security model、logging 和 configuration patterns。

## 构建与验证命令

在验证后，将权威项目命令记录在这里。

```bash
# install

# test

# lint/typecheck/build
```

## 参考实现

列出 agent 应复用为模式的稳定参考模块或功能。

## 未决问题

跟踪无法从当前文件回答的项目级问题。
