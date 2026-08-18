/**
 * The dsh-github-picker host Remote service (`ctx.githubPicker`, wire
 * namespace `githubPicker`). Registered as a TypertRemoteService so the Host
 * Gateway's source-mode discovery exports its @Remote methods to the Web
 * client under `/api/githubPicker/<method>` with zero generated artifacts:
 * `search` takes the resolved live Agent (the `agent` Typert lookup) and
 * searches its workspace repository through the gh CLI only (no device flow,
 * no stored tokens); `getSettings`/`updateSettings` serve the durable
 * settings (insert format) over the plugin-owned scope; `getGhAuthStatus`
 * reports the gh account-connection status for the settings page. The Host
 * only marks validated `#number` references at `agent/pre-step`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {
  GhAuthStatus,
  GhIssueSettings,
  GhIssueSettingsUpdate,
  GitHubRepoRef,
  GitHubSearchResult,
} from './contract.ts'
import type { ResolvedConfig } from './types.ts'
import { RepoResolver } from './repo.ts'
import type { SearchProvider } from './providers/contract.ts'
import type { GhCommand } from './providers/gh.ts'
import { readGhAuthStatus } from './gh-auth.ts'

/** The gh data source plus the auth-status command seam. */
export interface GhDeps {
  /** The issue/PR search provider (gh api search/issues). */
  readonly gh: SearchProvider
  /** The gh subprocess runner (auth status + search share the seam). */
  readonly ghCommand: GhCommand
}

/** Gh-issue workspace service: search the agent's repository for the composer picker. */
export class GhIssueRuntime extends TypertRemoteService {
  private readonly resolver: RepoResolver

  /**
   * Register the service under the `githubPicker` key (the wire namespace).
   * @param ctx - owning cordis context.
   * @param config - resolved plugin configuration.
   * @param readSettings - live settings read for the insert format.
   * @param writeSettings - durable settings write returning the resolved section.
   * @param gh - the gh CLI search provider.
   * @param ghCommand - the gh subprocess runner (auth status + search share the seam).
   * @param authTimeoutMs - subprocess timeout for the auth-status probe.
   */
  constructor(
    ctx: Context,
    private readonly config: ResolvedConfig,
    private readonly readSettings: () => GhIssueSettings,
    private readonly writeSettings: (update: GhIssueSettingsUpdate) => Promise<GhIssueSettings>,
    private readonly gh: SearchProvider,
    private readonly ghCommand: GhCommand,
    private readonly authTimeoutMs: number,
  ) {
    super(ctx, 'githubPicker')
    this.resolver = new RepoResolver(undefined, undefined, config.repoCacheTtl)
  }

  /** Read the resolved durable settings through the plugin-owned wire. */
  @Remote
  getSettings(): GhIssueSettings {
    return this.readSettings()
  }

  /** Persist one settings field and return the resolved section. */
  @Remote
  updateSettings(update: GhIssueSettingsUpdate): Promise<GhIssueSettings> {
    return this.writeSettings(update)
  }

  /**
   * Search the addressed agent's repository for issues and pull requests
   * through the gh CLI.
   * @param query - the typed query ('' lists recent items).
   * @param agent - the live agent resolved from the `agentId` wire field; its
   *   session header owns the workspace cwd.
   * @param signal - caller lifetime; the provider races it.
   * @returns the bounded entry list and the resolved repository identity.
   */
  @Remote
  async search(query: string, agent: Agent, signal: AbortSignal): Promise<GitHubSearchResult> {
    const cwd = agent.session.header.cwd
    if (cwd === undefined) {
      throw new Error('dsh-github-picker: the session has no workspace directory')
    }
    const repo = await this.resolveRepo(cwd, '', signal)
    if (repo === undefined) {
      throw new Error('dsh-github-picker: no GitHub repository detected (add a git remote)')
    }
    const entries = await this.gh.search(repo, query, signal)
    return {
      entries,
      repo,
      source: 'gh',
      truncated: entries.length >= this.config.defaultLimit,
    }
  }

  /** Resolve the repository identity through the workspace git remote. */
  resolveRepo(
    cwd: string,
    override: string,
    signal: AbortSignal,
  ): Promise<GitHubRepoRef | undefined> {
    return this.resolver.resolve(cwd, override, signal)
  }

  /** The gh account-connection status for the settings page (no token material). */
  @Remote
  getGhAuthStatus(): Promise<GhAuthStatus> {
    // One-shot probe on the settings page; a host-side timeout bounds it, so
    // the wire contract needs no cancellation parameter.
    return readGhAuthStatus(this.ghCommand, this.authTimeoutMs, AbortSignal.timeout(this.authTimeoutMs))
  }
}