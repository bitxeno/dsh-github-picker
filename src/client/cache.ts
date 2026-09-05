/**
 * Per-session search result cache for the # picker. One fetch per session is
 * shared across keystrokes (a fast typer never stacks provider calls), the
 * settled list is served for a short TTL, and the whole cache dies on
 * connection reset or settings invalidation. The cache is keyed by the
 * session id plus the exact query, so the menu can serve previous results
 * while a new query settles.
 */
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { GitHubSearchResult } from '../contract.ts'

/** How long one settled result stays hot before the next keystroke refetches. */
export const RESULT_TTL_MS = 30_000

/** The search seam the wiring layer injects (the Remote wrapper). */
export interface HashSearch {
  (query: string, page: number, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult>
}

/** One cached query result. */
interface CacheEntry {
  readonly settled?: GitHubSearchResult
  readonly at: number
}

/** The per-session cache controller. */
export class HashCache {
  private readonly bySession = new Map<SessionId, Map<string, CacheEntry>>()

  /**
   * @param search - the Remote-backed search seam.
   * @param now - monotonic clock (default Date.now).
   */
  constructor(
    private readonly search: HashSearch,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Drop every session cache (connection reset / settings change). */
  invalidateAll(): void {
    this.bySession.clear()
  }

  /** Cache key: the exact query and page (pages accumulate on scroll). */
  private static key(query: string, page: number): string {
    return `${query}\u0000${page}`
  }

  /** The settled result for one query page, or undefined when cold. */
  settled(sessionId: SessionId, query: string, page: number): GitHubSearchResult | undefined {
    const entry = this.bySession.get(sessionId)?.get(HashCache.key(query, page))
    if (entry === undefined || entry.settled === undefined) return undefined
    return entry.settled
  }

  /**
   * Resolve one query page: serve the hot settled result or fetch once,
   * sharing the in-flight promise across concurrent callers.
   * @param query - the typed # query.
   * @param page - the 1-based page of the result set.
   * @param sessionId - the addressed session.
   * @param signal - per-keystroke lifetime (superseded queries yield early).
   */
  resolve(query: string, page: number, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult> {
    const sessions = this.bySession
    let queries = sessions.get(sessionId)
    if (queries === undefined) {
      queries = new Map()
      sessions.set(sessionId, queries)
    }
    const key = HashCache.key(query, page)
    const now = this.now()
    const existing = queries.get(key)
    if (existing !== undefined && existing.settled !== undefined && now - existing.at < RESULT_TTL_MS) {
      return Promise.resolve(existing.settled)
    }
    if (existing !== undefined && now - existing.at >= RESULT_TTL_MS) {
      queries.delete(key)
    }
    const promise = this.search(query, page, sessionId, signal).then(result => {
      queries?.set(key, { settled: result, at: this.now() })
      return result
    })
    // A superseded keystroke just yields early; the shared fetch stays warm.
    return promise.then(result => (signal.aborted ? Promise.reject(signal.reason) : result))
  }
}
