import type { GitHubEntry, GitHubRepoRef } from '../contract.ts';
import type { SearchProvider } from './contract.ts';
/** Stable error categories surfaced by the picker. */
export type GhSearchErrorKind = 'gh-missing' | 'not-authenticated' | 'rate-limited' | 'network' | 'repo-not-found' | 'unknown';
/** A classified provider failure with a user-facing message. */
export interface GhSearchError extends Error {
    readonly kind: GhSearchErrorKind;
}
/** One raw search-API item before projection. */
interface RawSearchItem {
    readonly number: number;
    readonly title: string;
    readonly state: string;
    readonly html_url: string;
    readonly pull_request?: {
        readonly draft?: boolean;
        readonly merged_at?: string | null;
    } | null;
    readonly draft?: boolean;
}
/** The `gh api` subprocess seam (unit tests stub this). */
export interface GhCommand {
    run(args: readonly string[], signal: AbortSignal, timeoutMs: number): Promise<string>;
}
/** Real gh subprocess seam over `gh api`. */
export declare const ghCommand: GhCommand;
/** Build the `q` parameter for one search round-trip. */
export declare function buildQuery(repo: GitHubRepoRef, query: string): string;
/** Project one raw search-API item into a picker entry. */
export declare function projectItem(item: RawSearchItem): GitHubEntry | undefined;
/** Classify a gh subprocess failure into a stable category. */
export declare function classifyGhError(error: unknown): GhSearchErrorKind;
/** Turn one classified failure into the picker-facing error. */
export declare function searchError(kind: GhSearchErrorKind, message: string): GhSearchError;
/** Options for one gh provider search. */
export interface GhSearchOptions {
    readonly command?: GhCommand;
    /** Entries per search page. */
    readonly perPage: number;
    readonly timeoutMs: number;
}
/** The gh CLI search provider. */
export declare class GhProvider implements SearchProvider {
    private readonly options;
    /** The wire source label. */
    readonly source: "gh";
    /**
     * @param options - limit, timeout, and the subprocess seam.
     */
    constructor(options: GhSearchOptions);
    /**
     * Search one repository page through the gh CLI.
     * @param repo - the resolved repository identity.
     * @param query - the typed # query ('' lists recently updated).
     * @param page - the 1-based page of the result set.
     * @param signal - caller lifetime.
     * @returns the bounded page entries.
     */
    search(repo: GitHubRepoRef, query: string, page: number, signal: AbortSignal): Promise<GitHubEntry[]>;
}
export {};
