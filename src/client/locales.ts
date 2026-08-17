/**
 * `gh-issue` locale namespace: the # picker menu, the referenced-issue dock,
 * and the settings section copy. Chinese is the product copy; English
 * mirrors it.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': 'GitHub 提及',
  'menu.aria': 'GitHub Issue 与 Pull Request 选择器',
  'menu.repo': '仓库',
  'menu.loading': '正在搜索…',
  'menu.empty': '没有匹配的 Issue 或 PR',
  'menu.error': '搜索失败',
  'menu.error.gh-missing': '未找到 gh 命令行工具，请安装 gh 并登录（gh auth login）。',
  'menu.error.not-authenticated': 'gh 未登录（运行 gh auth login）。',
  'menu.error.rate-limited': 'GitHub 接口限流，请稍后再试。',
  'menu.error.network': '网络错误，请检查连接后重试。',
  'menu.error.repo-not-found': '未找到该仓库，请检查设置中的仓库地址。',
  'menu.error.unknown': '搜索失败，请重试。',
  'menu.no-repo': '未检测到 GitHub 仓库：请在设置中配置仓库地址，或为工作区添加 git remote。',
  'settings.title': 'GitHub 提及',
  'settings.subtitle': '在输入框输入 @ 搜索并引用当前工作区仓库的 Issue 与 Pull Request；仓库自动读取 git remote，数据来自 gh CLI，插件只传递编号，不拉取正文。',
  'settings.enabled': '启用 @ GitHub 提及',
  'settings.enabledDesc': '关闭后隐藏 @ 选择器，并停止向模型标记所选编号。',
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

/** The `gh-issue` namespace key union. */
export type GhIssueKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'GitHub mentions',
  'menu.aria': 'GitHub issue and pull request picker',
  'menu.repo': 'Repository',
  'menu.loading': 'Searching…',
  'menu.empty': 'No matching issues or PRs',
  'menu.error': 'Search failed',
  'menu.error.gh-missing': 'The gh CLI is not installed. Install it and sign in (gh auth login).',
  'menu.error.not-authenticated': 'gh is not logged in (run gh auth login).',
  'menu.error.rate-limited': 'GitHub API rate limit exceeded; try again later.',
  'menu.error.network': 'Network error; check the connection and retry.',
  'menu.error.repo-not-found': 'Repository not found; check the repository setting.',
  'menu.error.unknown': 'Search failed; try again.',
  'menu.no-repo': 'No GitHub repository detected: set one in Settings or add a git remote to the workspace.',
  'settings.title': 'GitHub mentions',
  'settings.subtitle': 'Type @ to search and reference issues and pull requests of the current workspace repository; the repository is read from the git remote, data comes from the gh CLI, and the plugin passes the number only, never the body.',
  'settings.enabled': 'Enable @ GitHub mentions',
  'settings.enabledDesc': 'Turning this off hides the @ picker and stops marking selected numbers for the model.',
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
} satisfies Record<GhIssueKey, string>

/** Locale namespace id registered under ctx.locale. */
export const NS = 'gh-issue'

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
    /** The # reference, dock, and settings copy. */
    [NS]: GhIssueKey
  }
}
