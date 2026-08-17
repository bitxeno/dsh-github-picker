# dsh-github-picker 开发方案 —— `#` 前缀 GitHub Issue/PR 搜索插件

> 状态：**已实现（v5.1：设置区段保留，标题改为「GitHub 引用」，无启用开关）** · 产品名：`dsh-github-picker` · 参考插件：`dsh-at-file`（v0.6.0）
> 文档保存于 `docs/plan/`。

> ## ⚠️ 实现修订（v2，2026-08）：架构从自研 `#` 菜单转为标准 `@` 触发源
>
> 本方案 v1 的「自研 `#` 触发器 + 自定义浮层」已在实施中放弃，改为 **A 方案（完全替换）：注册标准 `@` 输入触发源**，理由：
>
> - 自研 `#` 菜单（`trigger.ts`/`keyboard.ts`/`menu-state.ts`/`menu.tsx`/`dock.tsx`/`position.ts`）在真实 GUI 上出现会话级状态竞态、视口外定位等问题，维护成本高；
> - 标准管线（`detectTrigger` 扫描 `/` 和 `@`，`TriggerChar` 冻结）提供触发检测、分组菜单、键盘导航、会话挂载，`@` 与 dsh-at-file 同触发共享菜单；用户确认采用 A 方案。
>
> **最终实现（与 v1 正文不同之处以本节为准）：**
> - 触发：`@`，source 名 `github`（组标题即显示 `github`），order 20。
> - 候选行：GitHub octicon 状态图标（issue open/closed、PR open/draft/closed/merged，六态）+ 标题 + `#编号`；标题通过注入样式覆盖框架的 `max-width:40%` 限制，占满行宽。
> - 选中：按设置 **插入格式** 落稿 `@owner/repo#编号`（默认）或 `https://github.com/...` URL。
> - 失败：`candidates()` 捕获错误 → `classifySearchError` 分类 → 渲染一行本地化提示（`ghError: true`，不可选中），避免框架 `source-failed` 静默关菜单。
> - host 侧不变：`ghIssue/*` 端点、`<github-reference>` 提及标记（URL / `@owner/repo#N` / 裸 `#N` 三种形态，`scanMentions` 去重）、settings 命名空间（新增 `insertFormat`）、gh CLI 默认 + API 设备流两种数据源。
> - 已删除文件：`src/client/trigger.ts`、`keyboard.ts`、`menu-state.ts`、`menu.tsx`、`dock.tsx`、`position.ts` 及其测试。当前客户端文件清单见 `AGENTS.md`。
>
> v2 修订同时补充：`merged` 字段（closed PR 的 `pull_request.merged_at` 投影 → git-merge 图标）、错误提示 i18n（`menu.error.*`）、菜单行弹性覆盖（`dsh-slash-option-github-` 前缀圈定）。
>
> ## ⚠️ v3（2026-08）：去掉 device flow，只保留 gh CLI
>
> 按用户确认：**移除 GitHub device flow 授权，数据源只保留 gh CLI；初始化时读取 `gh auth status` 展示连接状态（不保存 token）**。
> - 删除：`src/device-flow.ts`、`src/token-store.ts`、`src/providers/api.ts` 及其测试；host/gateway 移除 `getAuthState`/`beginDeviceFlow`/`pollDeviceFlow`/`signOut` 端点；settings 移除 `mode`/`clientId`/`scope`，进而移除仓库覆盖 `repo`，仅剩 `enabled` + `insertFormat`。
> - 新增：`src/gh-auth.ts`（`gh auth status --json hosts` → 帐号连接状态）与端点 `ghIssue/getGhAuthStatus`。
> - 设置页改为 GitHub 品牌连接卡片（图标 + 「通过 gh CLI」+ Connected/未连接徽章，即时展示已登录帐号）；插入格式下拉 `ref` 置首。
> - 仓库一律由工作区 git remote 自动解析。

> ## ⚠️ v4（2026-08）：去掉 `@` 触发源，改为输入框右下角图标 + 弹窗（参考 dsh-skill-picker）
>
> 按用户确认：**删除标准 `@` 输入触发源（`src/client/source.ts` 及其测试），改为 composer 工具行图标按钮**（`conversation.input.right` 列表槽，id `gh-issue-picker`，order 100）。
> - 交互：点击 GitHub 图标 → 弹出搜索框 + 结果列表（按钮旁兄弟节点，`absolute; bottom: calc(100% + 8px); right: 0`，无 portal）；每次打开加载一次最近列表（query `''`，按会话缓存 30s），本地 `rankEntries` 过滤；点击行 → `inputActions.setDraft` 落稿完整新草稿（`@owner/repo#N` 或 URL），关闭弹窗；Esc / 弹窗外点击关闭；加载中、失败提示（`picker.error.*` 本地化，不可选中）、空列表均有本地化文案。
> - 新增：`src/client/picker.tsx` + `tests/picker.spec.tsx`（jsdom）；`styles.ts` 删除 MenuView 行布局覆盖（`dsh-slash-option-github-` 前缀），弹窗样式内联。
> - settings 命名空间保持不变（`enabled` 关闭时隐藏按钮）；host 侧 `scanMentions`/`ghIssue/*` 端点均不变；已删除 `dsh-client-ui-input-trigger` 的 inject/peer 依赖。
> - 已删除文件：`src/client/source.ts`、`tests/source.spec.ts`。当前客户端文件清单见 `AGENTS.md`。

> ## ⚠️ v5（2026-08）：去掉浏览器设置页，配置收进官方插件 Config —— 后经 v5.1 撤销
>
> 初案（按用户初步确认）：**插件配置不再在侧边栏设置页里显示，改由官方插件配置管理（profile 的 `cordis.patch.yml`）；删除「GitHub 提及」启用开关（选择器始终可用）**。为此删除了 `src/settings.ts`、`src/gh-auth.ts`、`src/client/SettingsSection.tsx`、`src/client/styles.ts`，契约收敛为 `ghIssue/search` + `ghIssue/getConfig`。
>
> ### v5.1（2026-08）：撤销设置页移除，仅保留「无启用开关」+ 改标题
>
> 用户撤销了设置页移除：**插件配置（设置区段）恢复显示在侧边栏；但删除「启用 GitHub 提及」开关；侧边栏标题从「GitHub 提及」改为「GitHub 引用」**。
> - 恢复：`src/settings.ts`（`gh-issue` 命名空间只剩 `insertFormat`，schema 无 `enabled`）、`src/gh-auth.ts`、`src/client/SettingsSection.tsx`（连接卡片 + 插入格式下拉，无 enable 卡片）、`src/client/styles.ts`（去掉已失效的 `dsh-slash-option-github-` MenuView 尾部覆盖）；host `inject` 恢复 `settings`，包依赖恢复 `@deepseek-ai/dsh-settings` / `@deepseek-ai/dsh-client-ui-settings`。
> - 契约恢复为四个端点：`ghIssue/search` + `ghIssue/getSettings` + `ghIssue/updateSettings` + `ghIssue/getGhAuthStatus`；`GhIssueConfig` → `GhIssueSettings { insertFormat }`（无 `enabled`），Config schema 不再含 `insertFormat`（回到设置页管理）。
> - 标题：`settings.title` / 侧边栏 `label` 从「GitHub 提及」改为「GitHub 引用」（en 对应 `GitHub references`）。
> - `enabled` 彻底删除：`expandMentions`/`mentionPreStep`/picker/搜索门禁均无开关判断，mention 预步骤始终标记。

## 一、现状分析（已完成调研）

### 1.1 参考插件 dsh-at-file 的架构（v0.6.0，本机已安装）

```
src/index.ts        函数式插件（name/inject/Config/apply），挂载 Remote + 设置 + 提及标记
src/runtime.ts      AtFileRuntime extends TypertRemoteService，@Remote 方法经 Typert 网关暴露
src/contract.ts     单一共享契约：zod codec + 类型 + InvocationDescriptor（host/client 共用）
src/typert.ts       手写严格 Typert manifest，经 ctx.typert.register 注册（不依赖 @Remote 标记表）
src/settings.ts     settings 命名空间注册（enable 开关等），host 侧持有
src/mention.ts      agent/pre-step 边界：扫描 @path → stat 验证 → 注入 <workspace-reference> 标记
src/client/        浏览器半区（单文件 bundle，/plugins/dsh-at-file/client.js）
  source.ts         InputTriggerSource：@ 触发、候选检索、plain-text 落稿
  search.ts         文件名排序（精确/前缀/子串/紧凑）
  FilesDock.tsx     输入框上方引用条（打开/移除）
  SettingsSection.tsx  设置页区段（enable + 过滤规则管理）
```

关键机制：

- **Typert Remote 走 host↔browser 的严格契约**（`atFile/search`、`atFile/getSettings`、`atFile/updateSettings`），客户端经 `ctx.remote.$mount` + `ctx.reflect.get('remote.atFile')` 解析（**不能用点号读**：fiber 链会在 Loader 内部 fork 处断掉，AGENTS.md 明示这是作者踩过的坑）。
- **`#` 提及与 `@` 提及同构**：客户端落稿纯文本 token → pre-step 边界验证存在性 → 注入结构化标记供模型使用。
- 浏览器读写设置**必须走插件自有 Remote**（公开包不暴露 `WEB_SETTINGS_NAMESPACES`）。

### 1.2 关键约束：DSH 输入触发管线不支持 `#`

对运行中的 GUI（http://127.0.0.1:3080，rev 824002b438fa）做了实证检查：

1. **运行时硬编码**：实际下发的 `@deepseek-ai/dsh-client-ui-input-trigger` bundle 中，`detectTrigger` 逐字符回扫时 `if (ch !== "/" && ch !== "@") continue;` —— **只认 `/` 和 `@`**。
2. **类型冻结**：`TriggerChar = '/' | '@'` 是 type alias，无法用 declaration merging 扩展；`InputTriggerSource.trigger` 被该类型约束。
3. **`toggleSource` 合成启动救不了**：它打开菜单后，下一次 `track()`（任何草稿/光标变化）会重新跑 `detectTrigger`，`#` 检测不到 → `raw === null` → 菜单被强制关闭。即：**无法借标准管线的壳做 `#` 的实时过滤**。

**结论**：`#` 触发器必须在插件内部自研实现（自捕获键盘 + 自渲染浮动菜单 + 自管键盘导航），不修改 DSH。这恰好是 dsh-at-file 中 `FolderNavigator` 的既有先例（文档级 keydown 捕获 + 自定义 overlay 插槽），是完全受支持、可分发、可升级的插件模式。

### 1.3 环境事实（已验证）

- `gh` CLI v2.87.3 已安装并已登录（keyring，含 `repo` scope）；`git` 可用。
- `gh api -X GET search/issues -f q='repo:o/r ...' --jq '...'` 一次返回 **issue + PR**（`pull_request != null` 判别，已用 cli/cli 仓库实测），支持 `sort:updated-desc`（空查询显示最近）。
- 插件安装方式：写入 `~/.dsh/profiles/web/package.json` 的 dependencies + `dsh.profile.bundles` 列表（dsh-at-file 即 `github:omdsh-dev/dsh-at-file`），`dsh plugin --profile web add <pkg>` 转发 pnpm。
- 设置页区段：`settings.section` 插槽（root scope，list 类型，order/label），dsh-at-file 已示范注册方式。
- 输入区插槽：`conversation.input.overlay`（浮动层，MenuView 与 FolderNavigator 都在此渲染，互斥时各自返回 null）与 `conversation.input.dock`（输入框上方引用条）。`InputZone` owner 提供 `session` + `input`（draft/draftRev/phase）；`useInput`/`inputActions.setDraft` 走标准 kit。

## 二、总体架构

**自包含插件 `dsh-github-picker`**（host + web client 双半区，与 dsh-at-file 同构）：

```
# 输入框敲 #
  └─ 插件自身 keydown 捕获（document 捕获阶段，FolderNavigator 先例）
       └─ 词边界校验 + 草稿回扫定位 #token 段
            └─ 自定义浮动菜单（conversation.input.overlay 插槽渲染）
                 ├─ host 侧 Typert Remote: ghIssue/search(query)
                 │     ├─ 模式一(默认): gh CLI  → gh api search/issues
                 │     └─ 模式二:      Device Flow 授权 → GitHub REST API
                 └─ 选中 → inputActions.setDraft 替换为 `#123 `（纯文本）
                      └─ agent/pre-step 边界 → 注入 <github-reference repo number /> 标记
```

### 2.1 关键决策（决策记录）

| 决策点 | 选择 | 理由 |
|---|---|---|
| 产品名 | `dsh-github-picker` | 用户确认 |
| `#` 触发实现 | 插件自研（keydown + overlay + 自管导航） | 管线硬编码只认 `/@`，改 DSH 需维护 fork 且 node_modules 补丁不持久 |
| 数据源 | 统一 `SearchProvider` 接口，双实现 | gh CLI（零配置、复用 gh 登录）；Device Flow（无 gh 时可用，支持私有仓） |
| Token 存放 | host 侧文件（0600、原子写），**绝不过线** | 浏览器只见 auth 状态，不见 token |
| 提及标记 | 仿 dsh-at-file pre-step 边界，注入 `#数字` 标记 | 模型获得结构化引用，不拉取 issue 内容；pick 时已保证存在性 |
| 与标准管线互斥 | 读 `controller.menu` 快照 | 标准菜单开着时不开自己的；反之亦然 |
| 设备流 clientId | 默认留空，设置页由用户填自己建的 OAuth App | 用户确认；设备流无需回调 URL，需用户自建 GitHub OAuth App |
| 设备流 scope | 默认 `repo`（支持私有仓），设置页可改 | 注明安全影响 |

## 三、模块设计

### 3.1 共享契约 `src/contract.ts`

```ts
GitHubEntry { number, title, kind: 'issue'|'pr', state: 'open'|'closed', url, draft? }
GitHubSearchResult = { entries, repo: {owner,name}, source: 'gh'|'api', truncated }
GhIssueSettings { enabled, mode: 'gh'|'api', repo?: string, clientId?: string, scope: string }
AuthState { status: 'unauthorized'|'pending'|'ready'|'expired'|'error',
            userCode?, verificationUri?, expiresIn?, interval?, message? }
```

InvocationDescriptor（host manifest + client contribution 共用，`src/typert.ts` 注册）：

- `ghIssue/search(query: string, agentId)` → `GitHubSearchResult`（agent lookup 解析 cwd 与仓库）
- `ghIssue/getSettings` / `ghIssue/updateSettings`
- `ghIssue/getAuthState` / `ghIssue/beginDeviceFlow` / `ghIssue/pollDeviceFlow` / `ghIssue/signOut`

### 3.2 Host 侧

| 文件 | 职责 |
|---|---|
| `src/index.ts` | 插件入口：inject `['typert','settings','agents']`，Config schema（schemastery：`repoCacheTtl`、`defaultLimit`、`searchTimeoutMs`），挂 Runtime + typert manifest + 设置 + pre-step 提及 |
| `src/runtime.ts` | `GhIssueRuntime extends TypertRemoteService`，实现全部 @Remote 方法 |
| `src/repo.ts` | git remote URL 解析（https / ssh / git@ 形式 → owner/repo），per-session 缓存 |
| `src/providers/gh.ts` | gh CLI provider：`gh api -X GET search/issues -f q=...`，`--jq` 提取字段，含 PR 判别、超时/中止、错误分类（未登录/未装 gh/限流） |
| `src/providers/api.ts` | REST provider：`GET /search/issues` + Bearer token，401 → 标记 token 失效 |
| `src/device-flow.ts` | GitHub Device Flow 状态机：POST `/login/device/code` → 取 device_code/user_code/interval；按 interval 轮询 `/login/oauth/access_token`；token 落盘（0600、tmp+rename 原子写） |
| `src/token-store.ts` | profile 目录下 token 文件读写（`~/.dsh/profiles/web/dsh-github-picker/token.json`） |
| `src/settings.ts` | `gh-issue` 设置命名空间（enabled/mode/repo/clientId/scope） |
| `src/mention.ts` | pre-step：扫描用户文本 `#(\d+)`（词边界）→ 注入 `<github-reference repo="o/r" number="123" />`，source tag `gh-issue-mention` |
| `src/search.ts` | 纯函数排序：数字精确/前缀/标题子串加权 |

### 3.3 Client 侧

| 文件 | 职责 |
|---|---|
| `src/client/index.ts` | apply：$mount Remote、注册 overlay（`#` 菜单）、注册 dock（引用条）、设置区段、locale、styles；`ctx.reflect.get('remote.ghIssue')` 解析 |
| `src/client/trigger.ts` | **`#` 触发核心**（纯函数）：词边界判定（行首/空白/标点后）、草稿回扫定位 `#token` 段、查询提取；菜单开关状态机 |
| `src/client/menu.tsx` | 浮动菜单（overlay 插槽）：候选人列表、issue/PR 图标、状态徽标、仓库头、loading/error/empty 态；键盘 ↑↓/Enter/Esc；点击外部关闭；标准菜单开着时隐藏 |
| `src/client/keyboard.ts` | document 捕获 keydown：`#` 打开、菜单开着时 ↑↓/Enter/Esc 拦截（preventDefault），其余键放行并实时重扫草稿 |
| `src/client/position.ts` | 菜单定位：mirror-div 测量 textarea 光标像素坐标（GitHub 式光标下弹出） |
| `src/client/cache.ts` | 每会话搜索结果缓存（30s TTL，仿 at-file 的 IndexCache）+ AbortController 竞态 |
| `src/client/dock.tsx` | `conversation.input.dock` 引用条：草稿中 `#123` 解析、点击用 html_url 打开 GitHub、× 移除 token |
| `src/client/SettingsSection.tsx` | 设置区段：enable 开关、数据源模式选择（gh CLI / API）、授权卡（开始授权 → 显示 user_code + verification_uri 链接 + 轮询状态、登出）、仓库覆盖输入、clientId/scope 输入 |
| `src/client/remote.ts` | TypertRemoteContribution + 类型 merge（运行期用 `ctx.reflect.get`，不是点号读） |
| `src/client/locales.ts` | zh（产品文案）/en 双语，NS = `gh-issue` |
| `src/client/styles.ts` | 单文件 CSS 注入（`--dsw-alias-*` token，`dsh_atGh` 前缀） |

### 3.4 数据流

**搜索（gh CLI 模式，默认）**

```
用户敲 #  → 菜单空查询 → ghIssue/search('')
  → host: repo = settings.repo ?? git -C cwd remote get-url origin（解析 o/r，缓存）
  → gh api search/issues q='repo:o/r sort:updated-desc' per_page=20
  → client 按最近更新展示
用户继续敲 "12" → ghIssue/search('12')
  → q='repo:o/r 12 in:title,body'（客户端同时本地对数字做精确/前缀加权）
  → 选中 #123 → 替换 #12 段为 `#123 `
  → 发送时 pre-step 注入 <github-reference repo="o/r" number="123" />
```

**搜索（API 模式）**：同上，但走 REST + Bearer token；未授权时菜单显示「授权提示卡」（点按钮触发设备流）。

**Device Flow 时序**

```
用户点“使用 GitHub 登录”
  → host: POST github.com/login/device/code {client_id, scope}
  → 返回 user_code + verification_uri + interval → 客户端大号展示 user_code + “打开链接”按钮
  → 客户端按 interval 轮询 pollDeviceFlow（host 侧 POST access_token 端点）
  → pending… ready → token 落盘 → 搜索自动可用；expired → 提示重新开始
```

### 3.5 安全考量

- **token 永不进浏览器**：`getAuthState` 只回传状态与 user_code/verification_uri；token 仅存 host 侧文件，0600 + 原子写（tmp+rename）。
- gh CLI 模式零新增凭据：复用 `gh` 自己的 keyring 登录态。
- clientId 需用户自建 GitHub OAuth App（Settings → Developer settings → OAuth Apps，设备流无需回调 URL）；**默认留空**，设置页填写，文档写明步骤。
- scope 默认 `repo`（支持私有仓），设置页可改并注明安全影响。
- pre-step 提及只认 `source.kind === 'user'` 的文本（防外部伪造），与 at-file 相同。

## 四、测试策略（镜像 dsh-at-file 的检查阶梯）

`pnpm run check` = typecheck + vitest + build，逐文件 100% 覆盖率（`v8 ignore` 带理由注释）。纯逻辑全部可单测、不触网：

| 文件 | 测试要点 |
|---|---|
| trigger.spec.ts | 词边界（行首/空白/标点/`user#123` 不触发）、span 定位、中文语境、多 `#` |
| search.spec.ts | 数字精确 > 前缀 > 标题子串排序、空查询、limit |
| repo.spec.ts | 五种 URL 形式解析、无 remote、缓存 |
| providers/gh.spec.ts | mock child_process execFile：成功/未登录/未装 gh/限流/中止 |
| device-flow.spec.ts | 状态机：开始→pending→ready→expired→error；轮询间隔；token 落盘 |
| mention.spec.ts | 扫描、词边界、注入格式、非 user 来源跳过 |
| menu/keyboard/dock/section（jsdom）| 键盘导航、pick 落稿替换、互斥、设置交互 |

## 五、构建与安装

- 布局照抄 dsh-at-file：`package.json`（`dsh.bundle.patch` + `dsh.client.platform/inject`）、`build.mjs`（esbuild 单文件 client bundle + ModuleLoader 握手 + ESM host，external `@deepseek-ai/dsh-*`、react）、`cordis.patch.yml`、`dsh.plugin.json`、`tsconfig.json`、`lib/` 提交（profile 安装免构建）。
- 依赖解析：本机缺 `../dsh` 源码树，改用 `file:` 链接指向 npx 缓存中的 `@deepseek-ai/*` 包（`/Volumes/UsbDrive/cxf/.npm/_npx/1e7f6d9597241db0/node_modules/...`）。
- 安装：开发期本地验证用 `~/.dsh/profiles/web/cordis.patch.yml` + package.json dependencies（`file:` 或 git URL）；验证通过后如发布走 `github:omdsh-dev/dsh-github-picker` 形式。

## 六、实施阶段

1. **脚手架**：仓库骨架、构建脚本、契约与类型、host 入口（Remote + 设置 + typert manifest 空实现跑通网关）
2. **数据层**：repo 解析、gh provider、search 排序、缓存 —— 全部单测
3. **设备流**：token store、device-flow 状态机、API provider、设置页授权卡
4. **`#` 菜单**：trigger 检测、keyboard 捕获、menu 组件、定位、pick 落稿 —— jsdom 测试
5. **提及 + dock**：pre-step 注入、引用条
6. **联调验证**：装进 web profile → 重启 `dsh web` → 实际输入 `#` 验证菜单/搜索/插入/模型标记，回归热力图与 at-file 功能
7. **文档 + 收尾**：README（中英）、AGENTS.md、检查阶梯全绿

## 七、决策记录

| 日期 | 决策 | 状态 |
|---|---|---|
| 2026-08-16 | 产品名 `dsh-github-picker` | 已确认 |
| 2026-08-16 | 设备流 `clientId` 默认留空，设置页填写用户自建 OAuth App | 已确认 |
| 2026-08-16 | `#` 触发器自研（不修改 DSH 管线） | 已确认 |
| 2026-08-16 | token 存 host 侧文件，绝不过线到浏览器 | 已确认 |
| 2026-08-16 | 提及标记仿 dsh-at-file pre-step 注入 | 已确认 |
