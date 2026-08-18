/**
 * The client-side Typert Remote contribution for the dsh-github-picker host
 * service: mounts the shared strict descriptors into `ctx.remote.githubPicker`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { GH_PICKER_INVOCATIONS } from '../contract.ts'
import type {
  GhAuthStatus,
  GitHubSearchResult,
} from '../contract.ts'

/** The githubPicker Remote namespace's client contribution. */
export const GH_PICKER_REMOTE: TypertRemoteContribution = {
  package: 'dsh-github-picker',
  descriptors: GH_PICKER_INVOCATIONS,
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  // Typed face of the mounted namespace. Note: the runtime access is NOT the
  // dotted `ctx.remote.githubPicker` read — that path walks the cordis fiber
  // chain and stops at the Loader's runtime-less internal forks between a
  // plugin entry and the root fiber. The plugin resolves the namespace
  // service through `ctx.reflect.get('remote.githubPicker')` instead (see
  // client/index.ts).
  /** The `githubPicker` namespace face mounted under `ctx.remote.githubPicker`. */
  interface TypertRemoteNamespace$6769746875625069636b6572 {
    search: (query: string, page: number, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>
    getGhAuthStatus: () => Promise<RemoteResult<GhAuthStatus>>
  }
  interface TypertRemoteMap {
    'githubPicker/search': (query: string, page: number, agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<GitHubSearchResult>>
    'githubPicker/getGhAuthStatus': () => Promise<RemoteResult<GhAuthStatus>>
  }
  interface TypertRemoteNamespaceMap {
    githubPicker: TypertRemoteNamespace$6769746875625069636b6572
  }
}
