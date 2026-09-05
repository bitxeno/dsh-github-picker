/**
 * The client-side Typert Remote contribution for the dsh-github-picker host
 * service: mounts the shared strict descriptors into `ctx.remote.githubPicker`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client';
import type { GhAuthStatus, GitHubSearchResult } from '../contract.ts';
/** The githubPicker Remote namespace's client contribution. */
export declare const GH_PICKER_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** The `githubPicker` namespace face mounted under `ctx.remote.githubPicker`. */
    interface TypertRemoteNamespace$6769746875625069636b6572 {
        search: (query: string, page: number, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        getGhAuthStatus: () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteMap {
        'githubPicker/search': (query: string, page: number, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>;
        'githubPicker/getGhAuthStatus': () => Promise<RemoteResult<GhAuthStatus>>;
    }
    interface TypertRemoteNamespaceMap {
        githubPicker: TypertRemoteNamespace$6769746875625069636b6572;
    }
}
