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
src/runtime.ts      GhIssueRuntime (TypertRemoteService, @Remote search/getGhAuthStatus) —
                    wire namespace `githubPicker`
src/mention.ts      Host pre-step scanner: URLs, @owner/repo#number, and bare #number
                    → <github-reference> markers (source `github-picker-mention`)
src/contract.ts     one shared descriptor set + zod codecs + entry/config types
src/typert.ts       strict host Typert manifest, registered via ctx.typert.register
src/settings.ts     the `github-picker` settings namespace (insert format;
                    no enable switch — the picker is always on)
src/gh-auth.ts      reads `gh auth status --json hosts` → the account-connection status (no token material)
src/repo.ts         git remote URL parsing (https/ssh/git@ forms) + per-workspace TTL cache
src/providers/      SearchProvider seam: gh.ts only (gh api search/issues, NDJSON). No device flow,
                    no REST-API mode, no token store, no repository override.
src/invariant.ts    ./invariant companion (real `No runtime invariant:` reason)
src/client/         browser half, served as the single file /plugins/dsh-github-picker/client.js
  index.ts          apply: $mount the Remote contribution, per-session cache, the composer
                    slot registration (hooks/settings via the bound settings scope), locale,
                    styles, and the settings.plugin.item card registration (keyed)
  picker.tsx        the composer control for `conversation.input.right` (list slot, id
                    'gh-issue-picker', order 100): a GitHub-mark button whose popup is a
                    plain sibling (absolute, bottom: calc(100% + 8px), right: 0). Opens a
                    searchable list from the host search (12 per page; scrolling to the
                    bottom fetches the next page), filters locally via search.ts,
                    inserts via inputActions.setDraft, failure hint row (localized, unpickable)
  SettingsSection.tsx  the settings.plugin.item card (keyed 'github-picker'): the gh
                    connection card (via gh CLI) + the insert-format select, reading and
                    writing the namespace through the bound settings scope. No enable
                    switch, no result limit — the popup scrolls through every page.
  styles.ts         settings-section stylesheet (`--dsw-alias-*` tokens, `dsh_atGh` prefix);
                    the picker popup styles are inline in picker.tsx
  remote.ts         the shared-descriptors client contribution for ctx.remote.$mount
  search.ts         pure ranking (number exact/prefix > title contains/prefix) +
                    classifySearchError (wire failure → hint kind, message-based)
  cache.ts          per-session result cache (TTL, shared in-flight, superseded-signal yield)
  icons.tsx         GitHub octicon set: issue open/closed, PR open/draft/closed/merged,
                    alert (hint row), and the GitHub mark (connection card + the composer button)
  locales.ts        zh (product copy) / en dictionaries, NS = 'github-picker'. Picker error copy
                    (`picker.error.*`) + settings copy (title 'GitHub 引用', insert format,
                    auth status) — no enable-switch keys.
tests/              node-env specs (11 files); jsdom pragma where a browser API is needed
```

## Contracts with the harness (do not drift)

- The wire endpoints are `githubPicker/search` and `githubPicker/getGhAuthStatus`
  (the gateway route is `/api/githubPicker/*`). These names are distinct from the
  sibling `dsh-at-github` plugin's `ghIssue/*` wire namespace, its `gh-issue`
  settings/locale namespaces, and its `gh-issue-mention` reference source — the
  two plugins may be installed side by side. Search results and the gh
  account-connection status cross the wire; no token material ever does — the
  plugin only reads `gh auth status` facts and never stores any credential.
- The Host Gateway resolves the endpoint through the **strict Typert manifest**
  (`src/typert.ts`, registered via `ctx.typert.register`) — never through
  `@Remote` marker tables, because the harness's source-launch dev
  environment loads the gateway from protocol `src` while a profile-loaded
  plugin bundle loads protocol `lib` (two marker tables). The `@Remote`
  decorator stays for documentation and lib-consistent deployments.
- The descriptor set lives in `src/contract.ts` and is shared verbatim by the
  host manifest and the client contribution; the agent lookup codec's
  `typeSymbol` must stay `@deepseek-ai/dsh-session/types#SessionId`.
- The plugin registers the `github-picker` namespace through `ctx.settings.register`
  — **no enable switch exists, the picker is always on** and the namespace
  holds only `insertFormat`. Browser reads and writes MUST go through the
  official settings scope (`ctx.settingsScope.bind({ namespace: 'github-picker' })`
  in `src/client/index.ts`): the page card reads via `useSettings` (the slots
  hooks seat over a snapshot adapter) and writes via `scope.set(field, value)`,
  which owns revision fencing and recovery. No wire method serves the setting —
  the Host methods were removed when the card moved onto the scope.
- The client composes only through the standing seams (`ctx.remote.$mount`,
  `ctx.slots.register`, `ctx.locale.register`). The mounted Remote namespace
  is resolved through
  `ctx.reflect.get('remote.githubPicker')` — NOT the dotted
  `ctx.remote.githubPicker` read, which walks the fiber chain and stops at the
  Loader's runtime-less forks.
- **The settings card is a keyed `settings.plugin.item` registration**
  (`ctx.slots.inject('settings.plugin.item', ...)` with `key: 'github-picker'`
  in `src/client/index.ts`; `src/client/remote.ts` imports the slot's type
  declaration from `dsh-client-ui-settings-plugins`). The official
  configurable-plugins tab pairs it with the namespace the Host serves, so the
  card dispatches without a settings wire method. The `settings.section`
  slot and the socket-style section id/order options are gone.
- **The picker is a plain component in the `conversation.input.right` list
  slot** (the seat just before the send button), mounted with
  `ctx.slots.inject('conversation.input.right', () => ctx.slots.register(...))`
  inside an effect that returns the disposer — the reference dsh-skill-picker
  recipe. It receives the owner InputZone (`session`, `input`), the session
  kit (`useInput`, `inputActions`), its inject face (`search` + the bound
  `useSettings` hooks seat), and the locale `t`. The popup is a plain sibling
  of the button (`position:absolute; bottom: calc(100% + 8px); right: 0`),
  no portal; drafts are written ONLY through `inputActions.setDraft` (full
  next draft), never by touching the textarea DOM. Do not reintroduce
  trigger/overlay/keyboard-capture machinery — earlier versions implemented a
  custom `#` trigger and the standard `@` source; those files (trigger/
  keyboard/menu-state/menu/dock/position/source.ts) were deleted in the
  composer-slot refactor.
- The popup loads the first result page once per open (query `''`, cached per
  session AND page with a 30s TTL) and fetches the next `PICKER_PAGE_SIZE`
  page as the list scrolls toward the bottom, until the end of the result
  set (no cap — endless scroll). Filtering happens
  locally via `rankEntries`, so typing never stacks provider calls. A search
  failure is classified by `classifySearchError` and rendered as one
  localized, unpickable hint row.
- The mention grammar (bare `#number`, `@owner/repo#number`, and issue/PR
  URLs) is scanned by the host's `scanMentions`; the picker's inserted text
  must stay within those three forms so the pre-step always marks picks.
  Keep `src/mention.ts` and `src/client/picker.tsx` (`pickText`) in sync.
  The pre-step skips references a sibling plugin already marked (identical
  `<github-reference .../>` markers, via `referenceKeysOf`), so installing
  dsh-at-github alongside does not duplicate markers.
- The web server serves exactly one file per client plugin: keep the client
  bundle single-file; styles are the injected `styles.ts` string (no CSS
  artifacts). `lib/` is committed; the profile install
  (`~/.dsh/profiles/web/node_modules/dsh-github-picker`) is a **copy**, not a
  symlink — after a build, copy the `lib/` files there. The client.js is read
  per request (refresh is enough); a Host/contract change needs a `dsh web`
  restart.

## Release

Publishing is automated but the **version bump is manual and local**:

1. `pnpm run check` must be green (the check ladder below).
2. Bump `version` in **both** `package.json` and `dsh.plugin.json`
   (they must stay identical — the workflow fails on mismatch).
3. Commit as `chore(release): bump version to X.Y.Z`, push `main`.

The GitHub Action (`.github/workflows/release.yml`) then takes over on the
bump push (or `workflow_dispatch`): it creates and pushes the annotated tag
`vX.Y.Z`, creates a GitHub Release (`--generate-notes`; `--prerelease` for
prerelease versions), and runs `npm publish` (`--tag next` for prereleases).
It is idempotent — an existing tag skips every step, so unrelated
`package.json` touches do not re-release. It needs the `NPM_TOKEN` repo
secret (npm automation token); without it the tag/release still succeed and
only the npm step fails. CI does not run tests/build: `devDependencies` are
machine-local `link:` entries and the published artifact is the committed
`lib/`. Release locally (no automation) when offline or for practice: bump +
commit, `git tag -a vX.Y.Z -m "Release vX.Y.Z"`, `git push origin main
vX.Y.Z`, `npm publish`.

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
  `/api/githubPicker/*`.

## Copy

Product copy is Chinese (locale dictionary in `src/client/locales.ts`); code
comments, JSDoc, and the English README are English.