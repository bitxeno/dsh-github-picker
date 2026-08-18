/**
 * The dsh-github-picker wire contract, shared verbatim by the host manifest
 * (`ctx.typert.register` in typert.ts) and the client contribution
 * (`ctx.remote.$mount` in client/remote.ts). The service exposes GitHub
 * issue/PR search for the browser's composer picker (through the gh CLI
 * only, no device flow), the plugin-owned settings (insert format — there is
 * no enable switch, the picker is always on), and the gh account-connection
 * status. Issue bodies and tokens never cross this boundary: the Host only
 * marks validated `#number` references at `agent/pre-step`.
 */
import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'

/** Entries per search page (the popup loads more as the list scrolls). */
export const PICKER_PAGE_SIZE = 12

/** One searchable GitHub issue or pull request entry. */
export interface GitHubEntry {
  readonly number: number
  readonly title: string
  readonly kind: 'issue' | 'pr'
  readonly state: 'open' | 'closed'
  /** The issue's html_url (opened in the browser by the picker). */
  readonly url: string
  /** True for pull requests still in draft state. */
  readonly draft?: boolean
  /** True for pull requests merged into their base branch. */
  readonly merged?: boolean
}

/** The repository identity a search resolved against. */
export interface GitHubRepoRef {
  readonly owner: string
  readonly name: string
}

/** One search round-trip: the bounded entry list plus the resolved repo. */
export interface GitHubSearchResult {
  readonly entries: readonly GitHubEntry[]
  readonly repo: GitHubRepoRef
  /** The data source that produced the entries (always the gh CLI). */
  readonly source: 'gh'
  /** True when the provider capped the result list. */
  readonly truncated: boolean
}

/** The `github-picker` settings namespace's durable shape (host and client share it). */
export interface GhIssueSettings {
  /** Inserted reference format: the @owner/repo#number form (default) or the plain GitHub URL. */
  readonly insertFormat: 'url' | 'ref'
}

/** One field update sent through the plugin-owned settings Remote. */
export type GhIssueSettingsUpdate =
  | { readonly field: 'insertFormat'; readonly value: 'url' | 'ref' }

/** One logged-in gh account (connection facts only; tokens never cross the wire). */
export interface GhAuthAccount {
  /** The host the account is logged into (e.g. github.com). */
  readonly host: string
  /** The gh/account login name. */
  readonly login: string
  /** Whether this is the active account for git operations. */
  readonly active: boolean
  /** The comma-separated token scopes the account holds ('' when unknown). */
  readonly scopes: string
}

/** The gh account-connection status surfaced to the settings page. */
export interface GhAuthStatus {
  /** Every logged-in account, in gh's reported order; empty when none. */
  readonly accounts: readonly GhAuthAccount[]
  /** Stable failure kind when the status could not be read. */
  readonly error?: 'gh-missing' | 'not-authenticated' | 'unknown'
}

/** Wire codec: one GitHub issue/PR entry. */
export const gitHubEntrySchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  kind: z.enum(['issue', 'pr']),
  state: z.enum(['open', 'closed']),
  url: z.string().min(1),
  draft: z.boolean().optional(),
  merged: z.boolean().optional(),
}).readonly()

/** Wire codec: the resolved repository identity. */
export const gitHubRepoRefSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
}).readonly()

/** Wire codec: one search round-trip result. */
export const gitHubSearchResultSchema = z.object({
  entries: z.array(gitHubEntrySchema),
  repo: gitHubRepoRefSchema,
  source: z.literal('gh'),
  truncated: z.boolean(),
}).readonly()

/** Wire codec: the resolved github-picker settings section. */
export const ghIssueSettingsSchema = z.object({
  insertFormat: z.enum(['url', 'ref']),
}).readonly()

/** Wire codec: one field update. */
export const ghIssueSettingsUpdateSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('insertFormat'), value: z.enum(['url', 'ref']) }).readonly(),
])

/** Wire codec: one logged-in gh account. */
export const ghAuthAccountSchema = z.object({
  host: z.string().min(1),
  login: z.string().min(1),
  active: z.boolean(),
  scopes: z.string(),
}).readonly()

/** Wire codec: the gh account-connection status. */
export const ghAuthStatusSchema = z.object({
  accounts: z.array(ghAuthAccountSchema),
  error: z.enum(['gh-missing', 'not-authenticated', 'unknown']).optional(),
}).readonly()

/** The githubPicker Remote namespace's strict invocation descriptors. */
export const GH_ISSUE_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: 'dsh-github-picker#githubPicker/search',
    service: 'githubPicker',
    namespace: 'githubPicker',
    method: 'search',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'query',
        wire: 'query',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: 'string', schema: z.string() },
      },
      {
        name: 'page',
        wire: 'page',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: 'number', schema: z.number().int().min(1) },
      },
      {
        name: 'agent',
        wire: 'agentId',
        source: 'lookup',
        lookup: 'agent',
        // The type symbol must equal the agent lookup provider's wire identity
        // exactly — the gateway's strict path rejects a mismatched symbol.
        codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-session/types#SessionId', schema: z.string().min(1) },
      },
    ],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-github-picker#GitHubSearchResult',
      schema: gitHubSearchResultSchema,
    },
  },
  {
    id: 'dsh-github-picker#githubPicker/getSettings',
    service: 'githubPicker',
    namespace: 'githubPicker',
    method: 'getSettings',
    invocation: { kind: 'direct' },
    parameters: [],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-github-picker#GhIssueSettings',
      schema: ghIssueSettingsSchema,
    },
  },
  {
    id: 'dsh-github-picker#githubPicker/updateSettings',
    service: 'githubPicker',
    namespace: 'githubPicker',
    method: 'updateSettings',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'update',
        wire: 'update',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-github-picker#GhIssueSettingsUpdate',
          schema: ghIssueSettingsUpdateSchema,
        },
      },
    ],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-github-picker#GhIssueSettings',
      schema: ghIssueSettingsSchema,
    },
  },
  {
    id: 'dsh-github-picker#githubPicker/getGhAuthStatus',
    service: 'githubPicker',
    namespace: 'githubPicker',
    method: 'getGhAuthStatus',
    invocation: { kind: 'direct' },
    parameters: [],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-github-picker#GhAuthStatus',
      schema: ghAuthStatusSchema,
    },
  },
]