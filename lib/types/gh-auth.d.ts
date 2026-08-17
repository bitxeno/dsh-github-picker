/**
 * gh CLI account-connection status for the Web settings page. The plugin only
 * ever uses gh (no device flow, no stored tokens): `gh auth status --json
 * hosts` reports every logged-in account with its host, login, active flag,
 * and scopes — the connection snapshot the settings card renders. No token
 * material is read or kept; the same subprocess seam the search provider
 * uses keeps this unit-testable.
 */
import type { GhCommand } from './providers/gh.ts';
/** One logged-in gh account (only connection facts, never the token). */
export interface GhAuthAccount {
    /** The host the account is logged into (e.g. github.com). */
    readonly host: string;
    /** The gh/account login name. */
    readonly login: string;
    /** Whether this is the active account for git operations. */
    readonly active: boolean;
    /** The comma-separated token scopes the account holds ('' when unknown). */
    readonly scopes: string;
}
/** The gh account-connection status surfaced to the browser. */
export interface GhAuthStatus {
    /** Every logged-in account, in gh's reported order; empty when none. */
    readonly accounts: readonly GhAuthAccount[];
    /** Stable failure kind when the status could not be read (search-style). */
    readonly error?: 'gh-missing' | 'not-authenticated' | 'unknown';
}
/** Classify a `gh auth status` subprocess failure (gh missing vs. other). */
export declare function classifyAuthError(error: unknown): 'gh-missing' | 'unknown';
/**
 * Read the gh account-connection status through the subprocess seam.
 * @param command - the gh command runner (defaults to the real one).
 * @param timeoutMs - subprocess timeout.
 * @returns the account list, plus a stable error kind when the read failed.
 */
export declare function readGhAuthStatus(command: GhCommand, timeoutMs: number, signal: AbortSignal): Promise<GhAuthStatus>;
