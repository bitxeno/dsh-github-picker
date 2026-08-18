/**
 * The gh CLI data source: search issues and pull requests of one repository
 * through `gh api search/issues`. The single GitHub search endpoint returns
 * both kinds (a pull request is an issue carrying a `pull_request` key), so
 * one call serves the # picker for both. Errors are classified into stable
 * categories the browser menu can render as hints (gh missing, not
 * authenticated, rate limited, network).
 */
import { execFile } from 'node:child_process'
import type { GitHubEntry, GitHubRepoRef } from '../contract.ts'
import type { SearchProvider } from './contract.ts'

/** Stable error categories surfaced by the picker. */
export type GhSearchErrorKind =
  | 'gh-missing'
  | 'not-authenticated'
  | 'rate-limited'
  | 'network'
  | 'repo-not-found'
  | 'unknown'

/** A classified provider failure with a user-facing message. */
export interface GhSearchError extends Error {
  readonly kind: GhSearchErrorKind
}

/** One raw search-API item before projection. */
interface RawSearchItem {
  readonly number: number
  readonly title: string
  readonly state: string
  readonly html_url: string
  readonly pull_request?: { readonly draft?: boolean; readonly merged_at?: string | null } | null
  readonly draft?: boolean
}

/** The JSON the gh CLI emits for one search round-trip. */
interface GhSearchPayload {
  readonly items?: readonly RawSearchItem[]
  readonly total_count?: number
}

/** The `gh api` subprocess seam (unit tests stub this). */
export interface GhCommand {
  run(args: readonly string[], signal: AbortSignal, timeoutMs: number): Promise<string>
}

/** Real gh subprocess seam over `gh api`. */
export const ghCommand: GhCommand = {
  run(args, signal, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = execFile('gh', [...args], { encoding: 'utf8' }, (error, stdout) => {
        if (error !== null) {
          reject(error)
          return
        }
        resolve(stdout)
      })
      const onAbort = (): void => { child.kill('SIGTERM') }
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
      /* v8 ignore start -- requires a live child stalling past abort/timeout; the pre-aborted arm above pins the abort behavior. */
      const timer = setTimeout(() => { child.kill('SIGTERM') }, timeoutMs)
      child.on('close', () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
      })
      /* v8 ignore stop */
    })
  },
}

/** Build the `q` parameter for one search round-trip. */
export function buildQuery(repo: GitHubRepoRef, query: string): string {
  const trimmed = query.trim()
  const repoClause = `repo:${repo.owner}/${repo.name}`
  if (trimmed === '') return `${repoClause} sort:updated-desc`
  return `${repoClause} ${trimmed} in:title,body`
}

/** Project one raw search-API item into a picker entry. */
export function projectItem(item: RawSearchItem): GitHubEntry | undefined {
  if (!Number.isInteger(item.number) || item.number <= 0) return undefined
  const title = item.title?.trim()
  if (typeof title !== 'string' || title === '') return undefined
  const state = item.state === 'closed' ? 'closed' : 'open'
  const kind = item.pull_request === undefined || item.pull_request === null ? 'issue' : 'pr'
  const draft = kind === 'pr' && (item.pull_request?.draft === true || item.draft === true)
  // A closed PR is merged when its pull_request object carries a merged_at.
  const merged = kind === 'pr' && typeof item.pull_request?.merged_at === 'string' && item.pull_request.merged_at !== ''
  return {
    number: item.number,
    title,
    kind,
    state,
    url: item.html_url,
    ...(draft ? { draft: true } : {}),
    ...(merged ? { merged: true } : {}),
  }
}

/** Classify a gh subprocess failure into a stable category. */
export function classifyGhError(error: unknown): GhSearchErrorKind {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (code === 'ENOENT') return 'gh-missing'
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/not logged in|auth required|authentication required|401/iu.test(message)) return 'not-authenticated'
  if (/api rate limit exceeded|403/iu.test(message)) return 'rate-limited'
  if (/not found|404/iu.test(message)) return 'repo-not-found'
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|fetch failed/iu.test(message)) return 'network'
  return 'unknown'
}

/** Turn one classified failure into the picker-facing error. */
export function searchError(kind: GhSearchErrorKind, message: string): GhSearchError {
  return Object.assign(new Error(message), { kind })
}

/** Options for one gh provider search. */
export interface GhSearchOptions {
  readonly command?: GhCommand
  /** Entries per search page. */
  readonly perPage: number
  readonly timeoutMs: number
}

/** The gh CLI search provider. */
export class GhProvider implements SearchProvider {
  /** The wire source label. */
  readonly source = 'gh' as const

  /**
   * @param options - limit, timeout, and the subprocess seam.
   */
  constructor(private readonly options: GhSearchOptions) {}

  /**
   * Search one repository page through the gh CLI.
   * @param repo - the resolved repository identity.
   * @param query - the typed # query ('' lists recently updated).
   * @param page - the 1-based page of the result set.
   * @param signal - caller lifetime.
   * @returns the bounded page entries.
   */
  async search(repo: GitHubRepoRef, query: string, page: number, signal: AbortSignal): Promise<GitHubEntry[]> {
    const command = this.options.command ?? ghCommand
    const args = [
      'api',
      '-X', 'GET',
      'search/issues',
      '-f', `q=${buildQuery(repo, query)}`,
      '-f', `per_page=${this.options.perPage}`,
      '-f', `page=${page}`,
      '--jq', '.items[] | {number, title, state, html_url, pull_request, draft}',    ]
    let stdout: string
    try {
      stdout = await command.run(args, signal, this.options.timeoutMs)
    } catch (error) {
      signal.throwIfAborted()
      // An already-classified provider error (e.g. from a chained source)
      // keeps its category; raw failures are classified from the message.
      if (error instanceof Error && 'kind' in error) throw error
      throw searchError(classifyGhError(error), error instanceof Error ? error.message : String(error))
    }
    let items: readonly RawSearchItem[]
    try {
      // `gh api --jq '.items[]'` emits newline-delimited JSON: one item per
      // line (the CLI's --jq pretty-prints each array element as NDJSON).
      const parsed = stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as unknown)
      items = parsed as readonly RawSearchItem[]
    } catch (error) {
      /* v8 ignore next -- gh emits valid NDJSON on success; a parse failure means an unexpected shape. */
      throw searchError('unknown', `gh returned unparsable output: ${String(error)}`)
    }
    const entries: GitHubEntry[] = []
    for (const item of items) {
      const entry = projectItem(item)
      if (entry !== undefined) entries.push(entry)
      if (entries.length >= this.options.perPage) break
    }
    return entries
  }
}
