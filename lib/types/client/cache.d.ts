/**
 * Per-session search result cache for the # picker. One fetch per session is
 * shared across keystrokes (a fast typer never stacks provider calls), the
 * settled list is served for a short TTL, and the whole cache dies on
 * connection reset or settings invalidation. The cache is keyed by the
 * session id plus the exact query, so the menu can serve previous results
 * while a new query settles.
 */
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { GitHubSearchResult } from '../contract.ts';
/** How long one settled result stays hot before the next keystroke refetches. */
export declare const RESULT_TTL_MS = 30000;
/** The search seam the wiring layer injects (the Remote wrapper). */
export interface HashSearch {
    (query: string, page: number, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult>;
}
/** The per-session cache controller. */
export declare class HashCache {
    private readonly search;
    private readonly now;
    private readonly bySession;
    /**
     * @param search - the Remote-backed search seam.
     * @param now - monotonic clock (default Date.now).
     */
    constructor(search: HashSearch, now?: () => number);
    /** Drop every session cache (connection reset / settings change). */
    invalidateAll(): void;
    /** Cache key: the exact query and page (pages accumulate on scroll). */
    private static key;
    /** The settled result for one query page, or undefined when cold. */
    settled(sessionId: SessionId, query: string, page: number): GitHubSearchResult | undefined;
    /**
     * Resolve one query page: serve the hot settled result or fetch once,
     * sharing the in-flight promise across concurrent callers.
     * @param query - the typed # query.
     * @param page - the 1-based page of the result set.
     * @param sessionId - the addressed session.
     * @param signal - per-keystroke lifetime (superseded queries yield early).
     */
    resolve(query: string, page: number, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult>;
}
