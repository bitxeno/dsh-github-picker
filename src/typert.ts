/**
 * The hand-written host Typert manifest for the githubPicker Remote. Registered
 * through `ctx.typert.register` in the plugin body, it claims the wire
 * endpoints through the strict registry — the same path generated `./typert`
 * artifacts use — so the Host Gateway resolves search and the gh auth-status
 * probe without consulting the `@Remote` marker table. That
 * marker independence matters in the harness's source-launch development
 * environment, where the tsx-loaded gateway and a profile-loaded plugin
 * bundle can hold separate copies of the decorator module state.
 */
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { GH_ISSUE_INVOCATIONS } from './contract.ts'

/** The githubPicker namespace's host manifest (strict codecs shared with the client). */
export const TYPERT_MANIFEST: TypertContribution = {
  package: 'dsh-github-picker',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'githubPicker',
        exportName: 'GhIssueRuntime',
        description: 'GitHub issue/PR search (gh CLI) and gh account status for the composer picker.',
        tags: [],
        members: [
          {
            kind: 'method',
            name: 'search',
            signature: 'search(query: string, page: number, agent: Agent, signal: AbortSignal): Promise<GitHubSearchResult>',
          },
          {
            kind: 'method',
            name: 'getGhAuthStatus',
            signature: 'getGhAuthStatus(): Promise<GhAuthStatus>',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: GH_ISSUE_INVOCATIONS,
}
