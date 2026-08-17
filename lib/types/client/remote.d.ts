/**
 * The client-side Typert Remote contribution for the dsh-github-picker host
 * service: mounts the shared strict descriptors into `ctx.remote.ghIssue`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate, GitHubSearchResult } from '../contract.ts';
/** The ghIssue Remote namespace's client contribution. */
export declare const GH_ISSUE_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** The `ghIssue` namespace face mounted under `ctx.remote.ghIssue`. */
    interface TypertRemoteNamespace$67684973737565 {
        search: (query: string, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        getSettings: () => Promise<RemoteResult<GhIssueSettings>>;
        updateSettings: (update: GhIssueSettingsUpdate) => Promise<RemoteResult<GhIssueSettings>>;
        getGhAuthStatus: () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteMap {
        'ghIssue/search': (query: string, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        'ghIssue/getSettings': () => Promise<RemoteResult<GhIssueSettings>>;
        'ghIssue/updateSettings': (update: GhIssueSettingsUpdate) => Promise<RemoteResult<GhIssueSettings>>;
        'ghIssue/getGhAuthStatus': () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteNamespaceMap {
        ghIssue: TypertRemoteNamespace$67684973737565;
    }
}
