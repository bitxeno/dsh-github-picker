# dsh-github-picker

DeepSeek Harness Web GUI 的 GitHub Issue 与 Pull Request 引用插件。在输入框输入 `@` 即可搜索当前工作区仓库的 Issue 和 PR，并插入引用文本——GitHub URL，或 `@owner/repo#编号` 提及，与 GitHub 自家编辑器里的自动补全交互一致。

![dsh-github-picker 在 DeepSeek Harness Web GUI 中的效果](docs/image/preview.jpeg)


## 安装与更新

```sh
dsh plugin --profile web add https://github.com/bitxeno/dsh-github-picker/archive/refs/heads/main.tar.gz
```

已有安装也使用这条命令更新——它始终安装 `main` 分支的最新提交，URL 无需随版本改动。安装完成后重启 `dsh web`，确保 Host 和浏览器客户端加载新版本。

如需锁定某个发布版本，把 `refs/heads/main` 换成对应 tag，例如 `refs/tags/v0.1.0`。

## 用法

在输入框输入 `@`，弹出标准触发菜单，在 **github** 分类下显示仓库最近的 Issue 和 PR；继续输入数字或标题关键字即可实时过滤。方向键上下选择，回车（或点击）确认，Esc 关闭。搜索失败（未安装 gh、未登录、限流、网络错误、仓库未解析）时显示一行提示，而不是静默关闭菜单。

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

插件**只使用 gh CLI**——复用本机 `gh` 登录态（`gh auth status`），调用 `gh api search/issues`，一次查询同时返回 Issue 和 PR。不涉及设备流、OAuth App 或任何已保存凭据；设置页会展示 gh 连接状态（`gh auth status` 报告的已登录帐号）。gh CLI 支持 macOS、Linux、Windows。

仓库始终通过工作区 `git remote get-url origin`（https、ssh、`git@` 形式）自动解析；无法解析时，`@` 菜单会显示一行提示说明如何添加 remote。

## 设置

打开 **设置 → GitHub 提及** 可配置：

- **连接卡片**——gh CLI 连接状态：带 GitHub 图标的卡片显示「GitHub **通过 gh CLI**」，右侧为**已连接**（绿色）或**未连接**徽章，并列出已登录帐号（活跃帐号带 `*`）。
- **启用**——整体开关 `@` 功能。
- **插入格式**——落稿为 `@owner/repo#编号`（默认）或 `GitHub URL`。

## 配置

Host 插件配置写入所选 profile 的 `cordis.patch.yml`：

```yaml
- id: dsh-github-picker
  config:
    defaultLimit: 20
    searchTimeoutMs: 15000
    repoCacheTtl: 30000
```

- `defaultLimit`——每次搜索的条目上限（默认 20）。
- `searchTimeoutMs`——数据源调用超时（默认 15000 毫秒）。
- `repoCacheTtl`——仓库解析结果按工作区缓存时长（默认 30000 毫秒）。

## 说明

- 插件是一个**标准 `@` 输入触发源**（source 名 `github`，排在 dsh-at-file 之后），菜单完全由框架 MenuView 渲染。不存在自定义 `#` 触发、浮层、键盘处理或引用条——标准管线提供什么就用什么。
- 框架 MenuView 将候选名限制为 `flex:none; max-width:40%`；插件注入的样式表只针对 `github` 行做覆盖（按稳定的 `dsh-slash-option-github-` 行 id 前缀圈定），让标题占满行内剩余宽度、`#编号` 标签收缩到内容大小。斜杠菜单与其他 `@` 源保持框架布局。
- 搜索结果按会话缓存 30 秒，快速连续输入不会堆积请求。
- `#编号` / URL / `@owner/repo#编号` 提及语法由 Host 预步骤扫描器（`scanMentions`）与选择器落稿文本共用，修改任一侧时需保持同步。
- 搜索失败会被分类并以一行本地化提示渲染到菜单里（文案见 `src/client/locales.ts` 的 `menu.error.*`），「未安装 gh」不再是静默关闭。

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

然后在 profile 目录执行 `pnpm install` 并重启 `dsh web`，刷新浏览器页面即可。插件以 `/plugins/dsh-github-picker/client.js` 提供服务，网关路由 `/api/ghIssue/*`。客户端 bundle 按请求实时读取：纯客户端改动只需刷新页面；Host 契约变更需要重启 `dsh web`。

## 许可证

MIT