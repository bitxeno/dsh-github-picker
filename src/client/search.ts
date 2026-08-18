/**
 * Pure ranking for the # picker menu. A query that is (or starts with) a
 * number ranks matching numbers first — GitHub's # autocomplete favors the
 * exact/prefix number — then falls back to title substring matching. The
 * empty query keeps the provider's recency order unchanged. Every loaded
 * entry is ranked (matches are never capped — the popup scrolls through all
 * pages the provider returns).
 */
import type { GitHubEntry } from '../contract.ts'

/** All entries matching `query`, ranked (ties by number desc, then title). */
export function rankEntries(
  entries: readonly GitHubEntry[],
  query: string,
): readonly GitHubEntry[] {
  const q = query.trim()
  if (q === '') {
    return [...entries]
  }
  const numeric = /^\d+$/u.test(q)
  const scored = entries
    .map(entry => ({ entry, score: scoreEntry(entry, q, numeric) }))
    .filter(candidate => candidate.score >= 0)
  scored.sort((a, b) => b.score - a.score
    || b.entry.number - a.entry.number
    || (a.entry.title < b.entry.title ? -1 : 1))
  return scored.map(candidate => candidate.entry)
}

/** Score one entry: number exact > number prefix > title contains > title prefix. */
function scoreEntry(entry: GitHubEntry, q: string, numeric: boolean): number {
  const numberText = String(entry.number)
  if (numeric) {
    if (numberText === q) return 10_000
    if (numberText.startsWith(q)) return 5000 - (numberText.length - q.length) * 10
    // A pure-number query never falls through to title matching.
    return -1
  }
  const lowerTitle = entry.title.toLowerCase()
  const lowerQuery = q.toLowerCase()
  if (lowerTitle === lowerQuery) return 4000
  if (lowerTitle.startsWith(lowerQuery)) return 3000
  const at = lowerTitle.indexOf(lowerQuery)
  if (at >= 0) return 2000 - at * 10
  return -1
}

/** Search failure kinds the menu hint row can display (host-side mirror). */
export type SearchErrorKind =
  | 'no-repo'
  | 'gh-missing'
  | 'not-authenticated'
  | 'rate-limited'
  | 'repo-not-found'
  | 'network'
  | 'unknown'

/**
 * Classify a search failure from the host's wire envelope so the picker can
 * show a localized hint row instead of closing silently. The wire `code` for
 * a thrown host Error is generic, so the message text — which the provider
 * owns verbatim — carries the distinction; the patterns mirror the host's
 * `classifyGhError` and the api provider's own messages.
 * @param code - the wire error code.
 * @param message - the classified host failure message.
 * @returns the stable hint kind.
 */
export function classifySearchError(code: string, message: string): SearchErrorKind {
  if (message.includes('no GitHub repository detected')) return 'no-repo'
  if (/gh ENOENT|ENOENT/iu.test(message)) return 'gh-missing'
  if (/not logged in|auth required|authentication required|401|invalid or expired/iu.test(message)) return 'not-authenticated'
  if (/api rate limit exceeded|403/iu.test(message)) return 'rate-limited'
  if (/not found|404/iu.test(message)) return 'repo-not-found'
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|fetch failed/iu.test(message)) return 'network'
  return 'unknown'
}
