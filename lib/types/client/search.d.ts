/**
 * Pure ranking for the # picker menu. A query that is (or starts with) a
 * number ranks matching numbers first — GitHub's # autocomplete favors the
 * exact/prefix number — then falls back to title substring matching. The
 * empty query keeps the provider's recency order unchanged.
 */
import type { GitHubEntry } from '../contract.ts';
/** Ranked top-N entries matching `query` (ties by number desc, then title). */
export declare function rankEntries(entries: readonly GitHubEntry[], query: string, limit: number): readonly GitHubEntry[];
/** Search failure kinds the menu hint row can display (host-side mirror). */
export type SearchErrorKind = 'no-repo' | 'gh-missing' | 'not-authenticated' | 'rate-limited' | 'repo-not-found' | 'network' | 'unknown';
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
export declare function classifySearchError(code: string, message: string): SearchErrorKind;
