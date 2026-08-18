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
import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
/** One searchable GitHub issue or pull request entry. */
export interface GitHubEntry {
    readonly number: number;
    readonly title: string;
    readonly kind: 'issue' | 'pr';
    readonly state: 'open' | 'closed';
    /** The issue's html_url (opened in the browser by the picker). */
    readonly url: string;
    /** True for pull requests still in draft state. */
    readonly draft?: boolean;
    /** True for pull requests merged into their base branch. */
    readonly merged?: boolean;
}
/** The repository identity a search resolved against. */
export interface GitHubRepoRef {
    readonly owner: string;
    readonly name: string;
}
/** One search round-trip: the bounded entry list plus the resolved repo. */
export interface GitHubSearchResult {
    readonly entries: readonly GitHubEntry[];
    readonly repo: GitHubRepoRef;
    /** The data source that produced the entries (always the gh CLI). */
    readonly source: 'gh';
    /** True when the provider capped the result list. */
    readonly truncated: boolean;
}
/** The `github-picker` settings namespace's durable shape (host and client share it). */
export interface GhIssueSettings {
    /** Inserted reference format: the @owner/repo#number form (default) or the plain GitHub URL. */
    readonly insertFormat: 'url' | 'ref';
    /** Hard cap on entries per search round-trip. */
    readonly defaultLimit: number;
}
/** One field update sent through the plugin-owned settings Remote. */
export type GhIssueSettingsUpdate = {
    readonly field: 'insertFormat';
    readonly value: 'url' | 'ref';
} | {
    readonly field: 'defaultLimit';
    readonly value: number;
};
/** One logged-in gh account (connection facts only; tokens never cross the wire). */
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
/** The gh account-connection status surfaced to the settings page. */
export interface GhAuthStatus {
    /** Every logged-in account, in gh's reported order; empty when none. */
    readonly accounts: readonly GhAuthAccount[];
    /** Stable failure kind when the status could not be read. */
    readonly error?: 'gh-missing' | 'not-authenticated' | 'unknown';
}
/** Wire codec: one GitHub issue/PR entry. */
export declare const gitHubEntrySchema: z.ZodReadonly<z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    kind: z.ZodEnum<{
        issue: "issue";
        pr: "pr";
    }>;
    state: z.ZodEnum<{
        open: "open";
        closed: "closed";
    }>;
    url: z.ZodString;
    draft: z.ZodOptional<z.ZodBoolean>;
    merged: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
/** Wire codec: the resolved repository identity. */
export declare const gitHubRepoRefSchema: z.ZodReadonly<z.ZodObject<{
    owner: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>>;
/** Wire codec: one search round-trip result. */
export declare const gitHubSearchResultSchema: z.ZodReadonly<z.ZodObject<{
    entries: z.ZodArray<z.ZodReadonly<z.ZodObject<{
        number: z.ZodNumber;
        title: z.ZodString;
        kind: z.ZodEnum<{
            issue: "issue";
            pr: "pr";
        }>;
        state: z.ZodEnum<{
            open: "open";
            closed: "closed";
        }>;
        url: z.ZodString;
        draft: z.ZodOptional<z.ZodBoolean>;
        merged: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    repo: z.ZodReadonly<z.ZodObject<{
        owner: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>>;
    source: z.ZodLiteral<"gh">;
    truncated: z.ZodBoolean;
}, z.core.$strip>>;
/** Wire codec: the resolved github-picker settings section. */
export declare const ghIssueSettingsSchema: z.ZodReadonly<z.ZodObject<{
    insertFormat: z.ZodEnum<{
        url: "url";
        ref: "ref";
    }>;
    defaultLimit: z.ZodNumber;
}, z.core.$strip>>;
/** Wire codec: one field update. */
export declare const ghIssueSettingsUpdateSchema: z.ZodDiscriminatedUnion<[z.ZodReadonly<z.ZodObject<{
    field: z.ZodLiteral<"insertFormat">;
    value: z.ZodEnum<{
        url: "url";
        ref: "ref";
    }>;
}, z.core.$strip>>, z.ZodReadonly<z.ZodObject<{
    field: z.ZodLiteral<"defaultLimit">;
    value: z.ZodNumber;
}, z.core.$strip>>], "field">;
/** Wire codec: one logged-in gh account. */
export declare const ghAuthAccountSchema: z.ZodReadonly<z.ZodObject<{
    host: z.ZodString;
    login: z.ZodString;
    active: z.ZodBoolean;
    scopes: z.ZodString;
}, z.core.$strip>>;
/** Wire codec: the gh account-connection status. */
export declare const ghAuthStatusSchema: z.ZodReadonly<z.ZodObject<{
    accounts: z.ZodArray<z.ZodReadonly<z.ZodObject<{
        host: z.ZodString;
        login: z.ZodString;
        active: z.ZodBoolean;
        scopes: z.ZodString;
    }, z.core.$strip>>>;
    error: z.ZodOptional<z.ZodEnum<{
        "gh-missing": "gh-missing";
        "not-authenticated": "not-authenticated";
        unknown: "unknown";
    }>>;
}, z.core.$strip>>;
/** The githubPicker Remote namespace's strict invocation descriptors. */
export declare const GH_ISSUE_INVOCATIONS: readonly InvocationDescriptor[];
