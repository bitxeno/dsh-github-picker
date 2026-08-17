/**
 * The dsh-github-picker host Remote service (`ctx.ghIssue`, wire namespace
 * `ghIssue`). Registered as a TypertRemoteService so the Host Gateway's
 * source-mode discovery exports its @Remote methods to the Web client under
 * `/api/ghIssue/<method>` with zero generated artifacts: `search` takes the
 * resolved live Agent (the `agent` Typert lookup) and searches its workspace
 * repository through the gh CLI only (no device flow, no stored tokens);
 * `getGhAuthStatus` reports the gh account-connection status for the
 * settings page. The Host only marks validated `#number` references at
 * `agent/pre-step`.
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate, GitHubRepoRef, GitHubSearchResult } from './contract.ts';
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
/** Gh-issue workspace service: search the agent's repository for the @ picker. */
export declare class GhIssueRuntime extends TypertRemoteService {
    private readonly config;
    private readonly readSettings;
    private readonly writeSettings;
    private readonly gh;
    private readonly ghCommand;
    private readonly authTimeoutMs;
    private readonly resolver;
    /**
     * Register the service under the `ghIssue` key (the wire namespace).
     * @param ctx - owning cordis context.
     * @param config - resolved plugin configuration.
     * @param readSettings - live settings read; false refuses the endpoint.
     * @param writeSettings - durable settings write returning the resolved section.
     * @param gh - the gh CLI search provider and subprocess seam.
     * @param ghCommand - the gh subprocess runner (auth status + search share the seam).
     * @param timeoutMs - subprocess timeout for the auth-status probe.
     */
    constructor(ctx: Context, config: ResolvedConfig, readSettings: () => GhIssueSettings, writeSettings: (update: GhIssueSettingsUpdate) => Promise<GhIssueSettings>, gh: SearchProvider, ghCommand: GhCommand, authTimeoutMs: number);
    /** Read the resolved durable settings through the plugin-owned wire. */
    getSettings(): GhIssueSettings;
    /** Persist one settings field and return the resolved section. */
    updateSettings(update: GhIssueSettingsUpdate): Promise<GhIssueSettings>;
    /**
     * Search the addressed agent's repository for issues and pull requests
     * through the gh CLI.
     * @param query - the text typed after `@` ('' lists recent items).
     * @param agent - the live agent resolved from the `agentId` wire field; its
     *   session header owns the workspace cwd.
     * @param signal - caller lifetime; the provider races it.
     * @returns the bounded entry list and the resolved repository identity.
     */
    search(query: string, agent: Agent, signal: AbortSignal): Promise<GitHubSearchResult>;
    /** Resolve the repository identity through the settings override or git remote. */
    resolveRepo(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined>;
    /** The gh account-connection status for the settings page (no token material). */
    getGhAuthStatus(): Promise<GhAuthStatus>;
}
