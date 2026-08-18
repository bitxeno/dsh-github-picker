/**
 * The client-side Typert Remote contribution for the dsh-github-picker host
 * service: mounts the shared strict descriptors into `ctx.remote.githubPicker`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate, GitHubSearchResult } from '../contract.ts';
/** The githubPicker Remote namespace's client contribution. */
export declare const GH_ISSUE_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** The `githubPicker` namespace face mounted under `ctx.remote.githubPicker`. */
    interface TypertRemoteNamespace$6769746875625069636b6572 {
        search: (query: string, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        getSettings: () => Promise<RemoteResult<GhIssueSettings>>;
        updateSettings: (update: GhIssueSettingsUpdate) => Promise<RemoteResult<GhIssueSettings>>;
        getGhAuthStatus: () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteMap {
        'githubPicker/search': (query: string, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        'githubPicker/getSettings': () => Promise<RemoteResult<GhIssueSettings>>;
        'githubPicker/updateSettings': (update: GhIssueSettingsUpdate) => Promise<RemoteResult<GhIssueSettings>>;
        'githubPicker/getGhAuthStatus': () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteNamespaceMap {
        githubPicker: TypertRemoteNamespace$6769746875625069636b6572;
    }
}
