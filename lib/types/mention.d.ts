/**
 * The Host-side # reference marker: recognizes `#number` tokens in the
 * outgoing user message at each agent's pre-step boundary and injects a
 * reference-only marker with the resolved repository identity. The plugin
 * never fetches issue bodies; the agent chooses if and how to inspect a
 * reference with its available tools. Only `source.kind === 'user'` text is
 * scanned, so external text cannot forge the gesture.
 */
import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { PreStepDecision } from '@deepseek-ai/dsh-agent';
import type { GitHubRepoRef } from './contract.ts';
/** One recognized mention: the number token and its kind. */
export interface HashMention {
    readonly number: number;
}
/** The source tag the injected reference carries (transcript consumers use it). */
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'gh-issue-mention': {
            kind: 'gh-issue-mention';
            number: number;
        };
    }
}
/** One recognized mention with its repository and number. */
export interface Mention {
    readonly owner: string;
    readonly name: string;
    readonly number: number;
}
/**
 * Scan one text block for GitHub references in first-seen order: URLs,
 * `@owner/repo#number` forms, and plain `#number` tokens (the latter resolve
 * against the passed workspace repo).
 * @param text - the message text block.
 * @param repo - the workspace repository (for bare `#number` tokens).
 * @returns unique mentions.
 */
export declare function scanMentions(text: string, repo: GitHubRepoRef): readonly Mention[];
/**
 * Expand every GitHub reference into a marker, in first-seen order. A bare
 * `#number` token resolves against the workspace repo; URL and
 * `@owner/repo#number` forms carry their own repository. The plugin has no
 * enable switch — references are always marked.
 * @param messages - the assembled step messages.
 * @param repo - the workspace repository identity (undefined = no bare-# resolution).
 * @returns the injected user messages (empty when nothing matched).
 */
export declare function expandMentions(messages: readonly UserMessage[], repo: GitHubRepoRef | undefined): UserMessage[];
/** The minimal agent face the pre-step handler reads. */
export interface MentionAgent {
    session: {
        header: {
            cwd?: string;
        };
    };
}
/** The repository resolver seam the boundary uses (the runtime's resolver). */
export interface MentionRepoResolver {
    resolve(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined>;
}
/**
 * The `agent/pre-step` listener body: expand mentions in the claimed user
 * messages and append the injections to the downstream decision. The repo is
 * resolved once per step (cached host-side by the resolver).
 * @param agent - the addressed agent (its session header owns the cwd).
 * @param resolver - the repository resolver seam.
 * @param messages - the claimed messages (the user's own words).
 * @param signal - caller lifetime.
 * @param next - the downstream waterfall.
 * @returns the decision with injections appended, or the downstream decision.
 */
export declare function mentionPreStep(agent: MentionAgent, resolver: MentionRepoResolver, messages: readonly UserMessage[], signal: AbortSignal, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>;
