# dsh-github-picker

GitHub issue and pull request references for the DeepSeek Harness web GUI. Type `@` in the composer to search the current workspace repository and insert a reference — a GitHub URL, or an `@owner/repo#number` mention — with the same autocomplete gesture GitHub uses in its own editors.

![dsh-github-picker in the DeepSeek Harness web GUI](docs/image/preview.jpeg)


## Install or Update

```sh
dsh plugin --profile web add https://github.com/bitxeno/dsh-github-picker/archive/refs/heads/main.tar.gz
```

Use the same command to update an existing installation — it always installs the latest commit on `main`, so the URL never needs a version bump. Restart `dsh web` after installation so the Host and browser client load the new version.

To pin a specific release instead, swap `refs/heads/main` for the tag ref, e.g. `refs/tags/v0.1.0`.

## Usage

Type `@` in the composer. The standard trigger menu appears with the repository's recent issues and pull requests, grouped under the **github** header; keep typing to filter by number or title. Arrow keys navigate, Enter (or a click) picks, Escape closes. A search failure (gh CLI missing, not authenticated, rate limited, network error, unresolved repository) renders as one hint row instead of silently closing the menu.

Each row shows GitHub's own state icon, the title, and the `#number` tag:

| State | Icon | Color |
| --- | --- | --- |
| Open issue | `issue-opened` | green |
| Closed issue | `issue-closed` (check) | purple |
| Open PR | `git-pull-request` | green |
| Draft PR | `git-pull-request-draft` | gray |
| Closed, unmerged PR | `git-pull-request-closed` (×) | red |
| Merged PR | `git-merge` | purple |

Picking inserts one of two texts, chosen in Settings (**Insert format**):

```text
@owner/name#125                                 # format: ref (default)
https://github.com/owner/name/issues/125        # format: url
```

Before the agent starts a step, the Host scans the draft for GitHub references — URLs, `@owner/repo#number` forms, and bare `#number` tokens — and adds a short reference message for each:

```xml
<github-reference repo="owner/name" number="125" />
```

The plugin passes the repository and number only — it never fetches issue bodies. The agent can inspect a reference with its available tools when the task requires it.

## Data Source

The plugin uses the **gh CLI** exclusively — reuse the local `gh` login and call `gh api search/issues`, which returns issues and pull requests in one query. No device flow, OAuth app, or stored credential is involved; the settings page shows the gh connection status (which accounts `gh auth status` reports). `gh` CLI works on macOS, Linux, and Windows.

The repository is always resolved from the workspace `git remote get-url origin` (https, ssh, and `git@` forms); without a resolvable repository the `@` menu shows a hint row explaining how to add a remote.

## Settings

Open **Settings -> GitHub 提及** to configure:

- **Connection card** — the gh CLI connection status: a GitHub-marked card showing "GitHub **via gh CLI**" with a **Connected** (green) or **Not connected** pill and the logged-in accounts (active marked `*`).
- **Enable** — turns the `@` surface on and off.
- **Insert format** — `@owner/repo#number` (default) or `GitHub URL` for the picked text.

## Configuration

Host plugin configuration goes into the selected profile's `cordis.patch.yml`:

```yaml
- id: dsh-github-picker
  config:
    defaultLimit: 20
    searchTimeoutMs: 15000
    repoCacheTtl: 30000
```

- `defaultLimit` caps entries per search (default 20).
- `searchTimeoutMs` bounds provider calls (default 15000).
- `repoCacheTtl` caches the resolved repository per workspace (default 30000 ms).

## Notes

- The plugin is a **standard `@` input-trigger source** (source name `github`, ordered after dsh-at-file) on the framework-owned MenuView. No custom `#` trigger, overlay, keyboard handling, or dock exists — everything the standard pipeline provides is reused.
- The shared MenuView caps the candidate name at `flex:none; max-width:40%`; the plugin's injected stylesheet overrides the row layout for the `github` rows only (scoped by the stable option id prefix `dsh-slash-option-github-`), so the title flexes into the row and the `#number` tag shrinks to its content. The slash menu and other `@` sources keep the framework layout.
- Search results are cached per session for 30 seconds; a fast typer never stacks provider calls.
- The `#number` / URL / `@owner/repo#number` mention grammar is shared by the Host's pre-step scanner (`scanMentions`) and the picker's inserted text; keep them in sync when changing either.
- A search failure is classified and rendered in the menu as one localized hint row (see the `menu.error.*` copy in `src/client/locales.ts`), so "gh is not installed" is visible instead of a silent close.

## Development

```sh
pnpm install
pnpm run check
```

The check ladder is typecheck + tests + build with 100% coverage per source file. Dev dependencies are `link:` entries into the installed harness packages (see `AGENTS.md`); built files under `lib/` are committed so profile installation runs without a build.

To install a local checkout instead (development builds or unreleased changes), add the package to `~/.dsh/profiles/web/package.json`:

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

Then `pnpm install` inside the profile and restart `dsh web`. Refresh the browser page. The plugin serves at `/plugins/dsh-github-picker/client.js` and the gateway routes `/api/ghIssue/*`. The client bundle is read per request, so a pure client change only needs a refresh; a Host contract change needs the `dsh web` restart.

## License

MIT