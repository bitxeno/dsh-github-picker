import type { GitHubRepoRef } from './contract.ts';
/** One git remote URL form the parser understands. */
export type RemoteUrlForm = 'https' | 'ssh' | 'git-at' | 'git-protocol';
/** The parsed identity of one git remote URL, or undefined when it is not GitHub. */
export interface ParsedRemote {
    readonly owner: string;
    readonly name: string;
}
/** Parse one git remote URL into the owner/repo pair (GitHub only). */
export declare function parseRemoteUrl(url: string): ParsedRemote | undefined;
/** The `git remote get-url` seam (unit tests stub this). */
export interface RepoCommand {
    run(url: string, cwd: string): Promise<string>;
}
/** Real git subprocess seam over `git remote get-url <name>` (runs in the workspace). */
export declare const gitRemoteCommand: RepoCommand;
/** Resolve the workspace repository, honoring the settings override. */
export declare class RepoResolver {
    private readonly command;
    private readonly now;
    private readonly ttlMs;
    private readonly remoteName;
    private readonly cache;
    /**
     * @param command - the git subprocess seam.
     * @param now - monotonic clock (default Date.now).
     * @param ttlMs - how long one resolution stays cached.
     * @param remoteName - the git remote to query (default 'origin').
     */
    constructor(command?: RepoCommand, now?: () => number, ttlMs?: number, remoteName?: string);
    /** Drop every cached resolution (host restart / settings change). */
    invalidate(): void;
    /**
     * Resolve the repository for one workspace directory.
     * @param cwd - the workspace root (agent session header cwd).
     * @param override - settings override ('' = auto).
     * @param signal - caller lifetime.
     * @returns the owner/name pair, or undefined when nothing resolves.
     */
    resolve(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined>;
}
