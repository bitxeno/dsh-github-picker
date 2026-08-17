/**
 * The `@` input-trigger source for GitHub issue/PR search: registered under
 * the STANDARD pipeline (the same trigger as dsh-at-file's path picker), so
 * trigger detection, the grouped menu, keyboard navigation, and per-session
 * wiring are all framework-owned. The source only supplies candidates (the
 * existing host search through the session cache) and the pick text (the
 * configured insert format). A search failure is rendered as one localized
 * hint row — the framework's `source-failed` path silently closes the menu,
 * which would hide "gh is not installed" behind a console log.
 */
import type { InputTriggerCandidate, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { GitHubEntry, GitHubRepoRef, GhIssueSettings } from '../contract.ts';
import type { SearchErrorKind } from './search.ts';
/** Owner source name (the menu group label and routing key). */
export declare const SOURCE_NAME = "github";
/** Menu group order relative to the other @ sources (at-file is 0). */
export declare const SOURCE_ORDER = 20;
/** Design cap on visible picker rows (mirrors dsh-at-file). */
export declare const MAX_CANDIDATES = 12;
declare module '@deepseek-ai/dsh-client-ui-input-trigger/client' {
    interface InputTriggerCandidate {
        /** The issue/PR kind for the icon. */
        readonly ghKind?: GitHubEntry['kind'];
        /** The entry number. */
        readonly ghNumber?: number;
        /** The GitHub URL (the default insert format). */
        readonly ghUrl?: string;
        /** The repository identity (for the @owner/repo#number format). */
        readonly ghRepo?: GitHubRepoRef;
        /** Marks the search-failure hint row: rendered, never pickable. */
        readonly ghError?: boolean;
    }
}
/** The search seam the wiring layer injects (Remote-backed, cached). */
export interface GhSearch {
    (query: string, sessionId: SessionId, signal: AbortSignal): Promise<{
        entries: readonly GitHubEntry[];
        repo: GitHubRepoRef;
    }>;
}
/** The source's injected deps. */
export interface GhSourceDeps {
    search: GhSearch;
    /** Live settings read (insert format + enable gate). */
    settings(): GhIssueSettings;
    /** Localized copy lookup for the hint row (e.g. `ctx.locale.bind(NS)`). */
    t(key: string): string;
}
/** The locale key of the hint row for one search failure kind. */
export declare const ERROR_HINT_KEY: Record<SearchErrorKind, string>;
/** Project one search entry into a menu candidate carrying the pick data. */
export declare function toCandidate(entry: GitHubEntry, repo: GitHubRepoRef): InputTriggerCandidate;
/** The pick text for one entry under the configured insert format. */
export declare function pickText(entry: GitHubEntry, repo: GitHubRepoRef, settings: GhIssueSettings): string;
/**
 * Build the `@` trigger source over the injected deps.
 * @param deps - the search seam, live settings, and the localized copy.
 * @returns the source to register with `inputTriggers.registerSource`.
 */
export declare function createGhSource(deps: GhSourceDeps): InputTriggerSource;
