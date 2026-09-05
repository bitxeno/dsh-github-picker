/**
 * `github-picker` locale namespace: the composer picker button and popup copy
 * (search, loading, empty, the localized failure hint rows) plus the
 * settings section copy (title, insert format, the gh account-connection
 * card). Chinese is the product copy; English mirrors it. There is no enable
 * switch — the picker is always on.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': 'GitHub 引用',
  'picker.open': '选择 GitHub Issue 或 PR',
  'picker.search': '搜索 Issue 或 PR…',
  'picker.clear': '清除搜索',
  'picker.filter': '按状态过滤',
  'picker.filter.all': '全部',
  'picker.filter.open': '开放',
  'picker.filter.closed': '已关闭',
  'picker.loading': '正在搜索…',
  'picker.loadingMore': '正在加载更多…',
  'picker.empty': '没有匹配的 Issue 或 PR',
  'picker.no-repo': '未检测到 GitHub 仓库：请为工作区添加 git remote。',
  'picker.error.gh-missing': '未找到 gh 命令行工具，请安装 gh 并登录（gh auth login）。',
  'picker.error.not-authenticated': 'gh 未登录（运行 gh auth login）。',
  'picker.error.rate-limited': 'GitHub 接口限流，请稍后再试。',
  'picker.error.network': '网络错误，请检查连接后重试。',
  'picker.error.repo-not-found': '未找到该仓库，请检查仓库地址。',
  'picker.error.unknown': '搜索失败，请重试。',
  'settings.title': 'GitHub 引用',
  'settings.description': '检索工作区仓库的 Issue 与 PR，以引用格式插入草稿。',
  'settings.expand': '展开设置',
  'settings.collapse': '收起设置',
  'settings.subtitle': '点击输入框右下角的 GitHub 图标，搜索并引用当前工作区仓库的 Issue 与 Pull Request；仓库自动读取 git remote，数据来自 gh CLI，插件只传递编号，不拉取正文。',
  'settings.insertFormat': '插入格式',
  'settings.insertFormat.url': 'GitHub URL',
  'settings.insertFormat.ref': '@owner/repo#编号（默认）',
  'settings.insertFormatDesc': '选中 Issue/PR 后插入到草稿的引用文本格式。',
  'settings.authStatus.title': 'GitHub',
  'settings.authStatus.via': '通过 ',
  'settings.authStatus.cli': 'gh CLI',
  'settings.authStatus.period': '。',
  'settings.authStatus.loading': '正在读取 gh 登录状态…',
  'settings.authStatus.connected': '已连接',
  'settings.authStatus.notConnected': '未连接',
  'settings.authStatus.none': '未检测到 gh 登录帐号（运行 gh auth login）。',
  'settings.authStatus.failed': '无法读取 gh 登录状态。',
  'settings.authStatus.error': '{message}',
} satisfies Record<string, string>

/** The `github-picker` namespace key union. */
export type GhPickerKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'GitHub Picker',
  'picker.open': 'Pick a GitHub issue or pull request',
  'picker.search': 'Search issues or PRs…',
  'picker.clear': 'Clear search',
  'picker.filter': 'Filter by state',
  'picker.filter.all': 'All',
  'picker.filter.open': 'Open',
  'picker.filter.closed': 'Closed',
  'picker.loading': 'Searching…',
  'picker.loadingMore': 'Loading more…',
  'picker.empty': 'No matching issues or PRs',
  'picker.no-repo': 'No GitHub repository detected: add a git remote to the workspace.',
  'picker.error.gh-missing': 'The gh CLI is not installed. Install it and sign in (gh auth login).',
  'picker.error.not-authenticated': 'gh is not logged in (run gh auth login).',
  'picker.error.rate-limited': 'GitHub API rate limit exceeded; try again later.',
  'picker.error.network': 'Network error; check the connection and retry.',
  'picker.error.repo-not-found': 'Repository not found; check the repository address.',
  'picker.error.unknown': 'Search failed; try again.',
  'settings.title': 'GitHub Picker',
  'settings.description': 'Search the workspace repository for issues and PRs to cite in the draft.',
  'settings.expand': 'Expand settings',
  'settings.collapse': 'Collapse settings',
  'settings.subtitle': 'Click the GitHub icon at the bottom-right of the input box to search and reference issues and pull requests of the current workspace repository; the repository is read from the git remote, data comes from the gh CLI, and the plugin passes the number only, never the body.',
  'settings.insertFormat': 'Insert format',
  'settings.insertFormat.url': 'GitHub URL',
  'settings.insertFormat.ref': '@owner/repo#number (default)',
  'settings.insertFormatDesc': 'The reference text inserted into the draft when an issue or PR is picked.',
  'settings.authStatus.title': 'GitHub',
  'settings.authStatus.via': 'via ',
  'settings.authStatus.cli': 'gh CLI',
  'settings.authStatus.period': '.',
  'settings.authStatus.loading': 'Reading the gh login status…',
  'settings.authStatus.connected': 'Connected',
  'settings.authStatus.notConnected': 'Not connected',
  'settings.authStatus.none': 'No gh account detected (run gh auth login).',
  'settings.authStatus.failed': 'Could not read the gh login status.',
  'settings.authStatus.error': '{message}',
} satisfies Record<GhPickerKey, string>

/** Locale namespace id registered under ctx.locale. */
export const NS = 'github-picker'

/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export function fmt(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole)
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The composer picker and settings copy. */
    [NS]: GhPickerKey
  }
}