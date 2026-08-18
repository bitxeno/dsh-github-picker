# dsh-github-picker

<div align="center">
  
[English](README.md) | 简体中文

</div>

DeepSeek Harness Web GUI 的 GitHub Issue 与 Pull Request 引用插件。点击输入框右下角的 GitHub 图标，即可打开当前工作区仓库 Issue 与 PR 的搜索列表，并插入引用文本——GitHub URL，或 `@owner/repo#编号` 提及。

![dsh-github-picker 在 DeepSeek Harness Web GUI 中的效果](docs/image/preview.jpeg)


## 安装与更新

```sh
dsh plugin --profile web add https://github.com/bitxeno/dsh-github-picker/archive/refs/heads/main.tar.gz
```

已有安装也使用这条命令更新——它始终安装 `main` 分支的最新提交，URL 无需随版本改动。安装完成后重启 `dsh web`，确保 Host 和浏览器客户端加载新版本。

如需锁定某个发布版本，把 `refs/heads/main` 换成对应 tag，例如 `refs/tags/v0.1.0`。

## 用法

点击输入框右下角的 GitHub 图标，弹出搜索弹窗，显示仓库最近的 Issue 和 PR；在弹窗的搜索框里输入数字或标题关键字即可实时过滤（数字前缀优先，与 GitHub 自家补全一致）。点击行（或先点击选中再按回车）落稿引用，Esc 或点击弹窗外任意处关闭。搜索失败（未安装 gh、未登录、限流、网络错误、仓库未解析）时显示一行本地化提示，而不是静默关闭。

每一行显示 GitHub 官方状态图标、标题和 `#编号` 标签：

| 状态 | 图标 | 颜色 |
| --- | --- | --- |
| 打开的 Issue | `issue-opened` | 绿 |
| 已关闭的 Issue | `issue-closed`（对勾） | 紫 |
| 打开的 PR | `git-pull-request` | 绿 |
| Draft PR | `git-pull-request-draft` | 灰 |
| 已关闭未合并的 PR | `git-pull-request-closed`（×） | 红 |
| 已合并的 PR | `git-merge` | 紫 |

选中后按设置里的**插入格式**二选一落稿：

```text
@owner/name#125                                 # 格式 ref（默认）
https://github.com/owner/name/issues/125        # 格式 url
```

在 Agent 开始执行步骤前，Host 会扫描草稿中的 GitHub 引用——URL、`@owner/repo#编号` 形式、以及裸 `#编号` token——并为每个引用注入一条简短的消息：

```xml
<github-reference repo="owner/name" number="125" />
```

插件只传递仓库与编号，**从不拉取 Issue 正文**；Agent 需要时可用自身工具查看引用内容。

## 数据来源

插件**只使用 gh CLI**——复用本机 `gh` 登录态，调用 `gh api search/issues`，一次查询同时返回 Issue 和 PR。不涉及设备流、OAuth App 或任何已保存凭据；设置页会展示 gh 连接状态（`gh auth status` 报告的已登录帐号）。gh CLI 支持 macOS、Linux、Windows。

仓库始终通过工作区 `git remote get-url origin`（https、ssh、`git@` 形式）自动解析；无法解析时，弹窗会显示一行提示说明如何添加 remote。

## 设置

打开 **设置 → GitHub 引用** 可配置：

- **连接卡片**——gh CLI 连接状态：带 GitHub 图标的卡片显示「GitHub **通过 gh CLI**」，右侧为**已连接**（绿色）或**未连接**徽章。
- **插入格式**——落稿为 `@owner/repo#编号`（默认）或 `GitHub URL`。
- **结果数量上限**——每次搜索返回的 Issue/PR 数量上限（默认 20，范围 1–100）。

没有「启用」开关：选择器在输入框中始终可用。

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

每次搜索的条目上限已改为**设置 → GitHub 引用**里的持久化选项，无需重启 Host 即可生效。

修改 Host 配置后需重启 `dsh web`；纯客户端改动只需刷新浏览器。

## 说明

- 选择器是输入框工具行（`conversation.input.right`，发送按钮左侧）里的一个普通组件，采用与参考项目 dsh-skill-picker 相同的做法：图标按钮的弹窗是相对定位容器里的兄弟节点（`absolute; bottom: calc(100% + 8px); right: 0`），无 portal。不存在自定义触发、浮层或键盘拦截机制。
- 落稿通过框架输入机器（`inputActions.setDraft`）写入完整的新草稿，撤销历史与 Host 的提及扫描自动生效。
- 弹窗每次打开加载一次最近列表（按会话缓存 30 秒，TTL 内重开即时显示、超时自动重取），之后本地过滤，输入不会堆积请求。
- `#编号` / URL / `@owner/repo#编号` 提及语法由 Host 预步骤扫描器（`scanMentions`）与选择器落稿文本（`pickText`）共用，修改任一侧时需保持同步。
- 搜索失败会被分类并以一行本地化提示渲染到弹窗里（文案见 `src/client/locales.ts` 的 `picker.error.*`），「未安装 gh」不再是静默关闭。

## 开发

```sh
pnpm install
pnpm run check
```

检查阶梯为 typecheck + 测试 + 构建，且每个源文件 100% 覆盖率。开发依赖通过 `link:` 指向本机已安装的 harness 包（见 `AGENTS.md`）；`lib/` 下构建产物随仓库提交，profile 安装无需构建。


如果改为安装本地检出（开发构建或未发布改动），则在 `~/.dsh/profiles/web/package.json` 中加入本包：

```json
{
  "dependencies": {
    "dsh-github-picker": "file:/path/to/dsh-github-picker"
  },
  "dsh": {
    "profile": {
      "bundles": ["...", "dsh-github-picker"]
    }
  }
}
```

然后在 profile 目录执行 `pnpm install` 并重启 `dsh web`，刷新浏览器页面即可。插件以 `/plugins/dsh-github-picker/client.js` 提供服务，网关路由 `/api/githubPicker/*`。客户端 bundle 按请求实时读取：纯客户端改动只需刷新页面；Host 契约变更需要重启 `dsh web`。

## 许可证

MIT