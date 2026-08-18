/**
 * The dsh-github-picker host Remote service (`ctx.githubPicker`, wire
 * namespace `githubPicker`). Registered as a TypertRemoteService so the Host
 * Gateway's source-mode discovery exports its @Remote methods to the Web
 * client under `/api/githubPicker/<method>` with zero generated artifacts:
 * `search` takes the resolved live Agent (the `agent` Typert lookup) and
 * searches its workspace repository through the gh CLI only (no device flow,
 * no stored tokens); `getGhAuthStatus` reports the gh account-connection
 * status for the settings card. The durable settings (insert format) live in
 * the plugin-owned settings namespace and reach the browser through the
 * official settings scope — no wire method serves them. The Host only marks
 * validated `#number` references at `agent/pre-step`.
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { GhAuthStatus, GitHubRepoRef, GitHubSearchResult } from './contract.ts';
import type { ResolvedConfig } from './types.ts';
import type { SearchProvider } from './providers/contract.ts';
import type { GhCommand } from './providers/gh.ts';
/** The gh data source plus the auth-status command seam. */
export interface GhDeps {
    /** The issue/PR search provider (gh api search/issues). */
    readonly gh: SearchProvider;
    /** The gh subprocess runner (auth status + search share the seam). */
    readonly ghCommand: GhCommand;
}
/** Gh-issue workspace service: search the agent's repository for the composer picker. */
export declare class GhIssueRuntime extends TypertRemoteService {
    private readonly config;
    private readonly gh;
    private readonly ghCommand;
    private readonly authTimeoutMs;
    private readonly resolver;
    /**
     * Register the service under the `githubPicker` key (the wire namespace).
     * @param ctx - owning cordis context.
     * @param config - resolved plugin configuration.
     * @param gh - the gh CLI search provider.
     * @param ghCommand - the gh subprocess runner (auth status + search share the seam).
     * @param authTimeoutMs - subprocess timeout for the auth-status probe.
     */
    constructor(ctx: Context, config: ResolvedConfig, gh: SearchProvider, ghCommand: GhCommand, authTimeoutMs: number);
    /**
     * Search one page of the addressed agent's repository for issues and pull
     * requests through the gh CLI. The popup loads page 1 on open and fetches
     * the next page as the list scrolls toward the bottom.
     * @param query - the typed query ('' lists recent items).
     * @param page - the 1-based page of the result set.
     * @param agent - the live agent resolved from the `agentId` wire field; its
     *   session header owns the workspace cwd.
     * @param signal - caller lifetime; the provider races it.
     * @returns one bounded page and the resolved repository identity; `truncated`
     *   reports whether a fuller page exists (the sentinel for the next page).
     */
    search(query: string, page: number, agent: Agent, signal: AbortSignal): Promise<GitHubSearchResult>;
    /** Resolve the repository identity through the workspace git remote. */
    resolveRepo(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined>;
    /** The gh account-connection status for the settings page (no token material). */
    getGhAuthStatus(): Promise<GhAuthStatus>;
}
