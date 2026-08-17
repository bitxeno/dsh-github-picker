# AGENTS.md

Out-of-tree DeepSeek Harness plugin (host + Web client bundle). The harness
checkout is not required for development on this machine: devDependencies
are `link:` entries into the installed package tree under the npx cache
(`/Volumes/UsbDrive/cxf/.npm/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai`).
The reference recipe this repo follows is `dsh-at-file` (same directory
level).

## Layout

```
src/index.ts        host entry: function plugin (name/inject/Config/apply, no default export)
src/runtime.ts      GhIssueRuntime (TypertRemoteService, @Remote search/settings/gh-auth) — wire namespace `ghIssue`
src/mention.ts      Host pre-step scanner: URLs, @owner/repo#number, and bare #number
                    → <github-reference> markers (source `gh-issue-mention`)
src/contract.ts     one shared descriptor set + zod codecs + entry/settings/auth-status types
src/gh-auth.ts      reads `gh auth status --json hosts` → the account-connection status (no token material)
src/typert.ts       strict host Typert manifest, registered via ctx.typert.register
src/settings.ts     the `gh-issue` settings namespace (enable, insertFormat defaulting to 'ref')
src/repo.ts         git remote URL parsing (https/ssh/git@ forms) + per-workspace TTL cache
src/providers/      SearchProvider seam: gh.ts only (gh api search/issues, NDJSON). No device flow,
                    no REST-API mode, no token store, no repository override.
src/invariant.ts    ./invariant companion (real `No runtime invariant:` reason)
src/client/         browser half, served as the single file /plugins/dsh-github-picker/client.js
  index.ts          apply: $mount the Remote contribution, per-session cache, the standard
                    `@` source registry, settings section, locale, styles
  source.ts         the standard `@` InputTriggerSource (SOURCE_NAME 'github', order 20):
                    candidates from the host search, pick text by insertFormat,
                    failure hint row (localized, unpickable)
  search.ts         pure ranking (number exact/prefix > title contains/prefix) +
                    classifySearchError (wire failure → hint kind, message-based)
  cache.ts          per-session result cache (TTL, shared in-flight, superseded-signal yield)
  icons.tsx         GitHub octicon set: issue open/closed, PR open/draft/closed/merged,
                    alert (hint row), GitHub mark (connection card); the icon field carries a React element
  SettingsSection.tsx  GitHub-branded connection card (via gh CLI), enable switch, insert format (ref first)
  locales.ts        zh (product copy) / en dictionaries, NS = 'gh-issue' (includes menu.error.* hint copy)
  styles.ts         single injected stylesheet (--dsw-alias-* tokens, dsh_atGh prefix) +
                    the MenuView row-flex override scoped to the github rows
tests/              node-env specs (11 files); jsdom pragma where a browser API is needed
```

## Contracts with the harness (do not drift)

- The wire endpoints are `ghIssue/search`, `ghIssue/getSettings`,
  `ghIssue/updateSettings`, and `ghIssue/getGhAuthStatus`. Search results
  and the gh account-connection status cross the wire; no token material
  ever does — the plugin only reads `gh auth status` facts and never stores
  any credential.
- The Host Gateway resolves the endpoint through the **strict Typert manifest**
  (`src/typert.ts`, registered via `ctx.typert.register`) — never through
  `@Remote` marker tables, because the harness's source-launch dev
  environment loads the gateway from protocol `src` while a profile-loaded
  plugin bundle loads protocol `lib` (two marker tables). The `@Remote`
  decorator stays for documentation and lib-consistent deployments.
- The descriptor set lives in `src/contract.ts` and is shared verbatim by the
  host manifest and the client contribution; the agent lookup codec's
  `typeSymbol` must stay `@deepseek-ai/dsh-session/types#SessionId`.
- The client composes only through the standing seams (`ctx.remote.$mount`,
  `ctx.slots.register`, `ctx.locale.register`, `ctx.get('inputTriggers')`).
  The mounted Remote namespace is resolved through
  `ctx.reflect.get('remote.ghIssue')` — NOT the dotted `ctx.remote.ghIssue`
  read, which walks the fiber chain and stops at the Loader's runtime-less
  forks.
- **The plugin is a STANDARD `@` input-trigger source** (the pipeline only
  scans `/` and `@`; `TriggerChar = '/' | '@'` is frozen). There is no custom
  `#` trigger, overlay, keyboard capture, or dock anymore — earlier versions
  implemented `#` inside the plugin and those files (trigger/keyboard/
  menu-state/menu/dock/position) were deleted in the `@` refactor. Do not
  reintroduce them; if a `#`-only gesture is ever needed again, it must be a
  separate decision documented in `docs/plan/`.
- The framework's MenuView renders every trigger menu. When a source's
  `candidates()` rejects, the framework **silently removes the group** (and
  auto-closes the menu when no groups remain) — so the source catches its own
  search failures and returns one unpickable hint row (`ghError: true`)
  instead, keeping the menu open with a localized explanation.
- The MenuView caps the candidate `name` at `flex:none; max-width:40%` (the
  CSS-module classes are hashed but the suffixes `_itemName`/`_itemDescription`
  are stable). `styles.ts` overrides the row layout **only for the github
  rows**, scoped by the stable row id prefix `dsh-slash-option-github-` (the
  framework builds option ids as `dsh-slash-option-${source}-${index}`): name
  becomes `flex:1; max-width:none` and description `flex:none`, so the title
  flexes and the `#number` shrinks. The slash menu and other `@` sources keep
  the framework layout. If the source name changes, update the selector.
- The mention grammar (bare `#number`, `@owner/repo#number`, and issue/PR
  URLs) is scanned by the host's `scanMentions`; the picker's inserted text
  must stay within those three forms so the pre-step always marks picks.
  Keep `src/mention.ts` and `src/client/source.ts` in sync.
- The plugin registers the `gh-issue` namespace through `ctx.settings.register`,
  but the public DSH package does not expose that namespace through
  `WEB_SETTINGS_NAMESPACES`. Browser reads and writes MUST use
  `ghIssue/getSettings` and `ghIssue/updateSettings`; the Host methods own
  normalization and call the owner settings scope.
- The web server serves exactly one file per client plugin: keep the client
  bundle single-file; styles are the injected `styles.ts` string (no CSS
  artifacts). `lib/` is committed; the profile install
  (`~/.dsh/profiles/web/node_modules/dsh-github-picker`) is a **copy**, not a
  symlink — after a build, copy the `lib/` files there. The client.js is read
  per request (refresh is enough); a Host/contract change needs a `dsh web`
  restart.

## Check ladder

`pnpm run check` (typecheck + tests + build) must be green before every
commit; `lib/` is committed (file: profile installs run without a build).
Coverage: statements/branches/lines 100% per source file (`src/types.ts` is
type-only and excluded); defensive arms take a `/* v8 ignore -- reason */`
comment. Run `pnpm exec vitest run --coverage` to see the per-file table.

## Dev environment notes

- `devDependencies` are `link:` entries into the npx cache's installed
  packages (no `../dsh` source tree on this machine). `pnpm install` after
  cloning; the links resolve from `/Volumes/UsbDrive/cxf/.npm/_npx/...`.
- Live testing: install into the web profile
  (`~/.dsh/profiles/web/package.json` dependencies + `dsh.profile.bundles`),
  `pnpm install` there, restart `dsh web`, refresh the GUI. The plugin serves
  at `/plugins/dsh-github-picker/client.js` and the gateway routes
  `/api/ghIssue/*`.

## Copy

Product copy is Chinese (locale dictionary in `src/client/locales.ts`); code
comments, JSDoc, and the English README are English.