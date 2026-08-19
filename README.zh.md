# dsh-github-picker

<div align="center">

[English](README.md) | 简体中文

</div>

DeepSeek Harness Web GUI 的 GitHub Issue 与 Pull Request 引用插件。点击输入框右下角的 GitHub 图标，即可搜索当前工作区仓库的 Issue 与 PR，并插入引用文本——GitHub URL，或 `@owner/repo#编号` 提及。

![dsh-github-picker 在 DeepSeek Harness Web GUI 中的效果](docs/image/preview.jpeg)

## 安装与更新

```sh
dsh plugin --profile web add dsh-github-picker
```

已有安装用同一条命令即可更新到最新版本；需要固定版本时在包名后追加 `@<版本>`。安装后重启 `dsh web`。

## 用法

点击输入框右下角的 GitHub 图标。弹窗列出仓库最近的 Issue 和 PR——每页 12 条，滚动到底部自动加载下一页，直至取完全部结果（无上限）——输入关键字即时本地过滤（数字前缀优先）。点击行插入引用；Esc 或点击弹窗外任意处关闭。搜索失败（未安装 gh、未登录、限流、网络错误、仓库未解析）时显示一行本地化提示，而不是静默关闭。

每行显示 GitHub 官方状态图标、标题和 `#编号`：

| 状态 | 图标 |
| --- | --- |
| 打开的 Issue | `issue-opened`（绿） |
| 已关闭的 Issue | `issue-closed`（紫） |
| 打开的 PR | `git-pull-request`（绿） |
| Draft PR | `git-pull-request-draft`（灰） |
| 已关闭未合并的 PR | `git-pull-request-closed`（红） |
| 已合并的 PR | `git-merge`（紫） |

选中后按**插入格式**落稿：

```text
@owner/name#125                                 # 格式 ref（默认）
https://github.com/owner/name/issues/125        # 格式 url
```

Agent 开始执行前，Host 会扫描草稿中的 GitHub 引用——URL、`@owner/repo#编号`、裸 `#编号`——并为每个引用注入一条简短消息：

```xml
<github-reference repo="owner/name" number="125" />
```

插件只传递仓库与编号，从不拉取 Issue 正文。

## 数据来源

只使用 **gh CLI**：复用本机 `gh` 登录态，调用 `gh api search/issues`（一次查询同时返回 Issue 和 PR）。不涉及设备流、OAuth App 或任何已保存凭据。仓库通过工作区 `git remote get-url origin`（https、ssh、`git@` 形式）自动解析；无法解析时弹窗会提示如何添加 remote。

## 设置

插件卡片（标题「GitHub 引用」，英文界面为 "GitHub Picker"）位于官方插件配置页。它显示 gh 连接状态（`gh auth status` 报告的已登录帐号）与**插入格式**（`@owner/repo#编号` 或 `GitHub URL`）。这是唯一的设置项：没有「启用」开关——选择器始终可用——也没有结果上限。

## 配置

Host 插件配置写入所选 profile 的 `cordis.patch.yml`：

```yaml
- id: dsh-github-picker
  config:
    searchTimeoutMs: 15000
    repoCacheTtl: 30000
```

- `searchTimeoutMs`——数据源调用超时（默认 15000 毫秒）。
- `repoCacheTtl`——仓库解析结果按工作区缓存时长（默认 30000 毫秒）。

修改 Host 配置后需重启 `dsh web`；纯客户端改动只需刷新浏览器。

## 开发

```sh
pnpm install
pnpm run check
```

检查阶梯为 typecheck + 测试 + 构建，每个源文件 100% 覆盖率；`lib/` 随仓库提交，profile 安装无需构建。安装本地检出时，在 `~/.dsh/profiles/web/package.json` 中加入依赖与 `dsh.profile.bundles`，执行 `pnpm install` 后重启 `dsh web`。插件以 `/plugins/dsh-github-picker/client.js` 提供服务，网关路由 `/api/githubPicker/*`。

## 许可证

MIT