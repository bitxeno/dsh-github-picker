/**
 * Referenced-issue dock: one chip per `#number` token currently in the draft,
 * rendered above the composer (the 'conversation.input.dock' strip). Clicking
 * the chip opens the GitHub URL in a new tab; the × removes the token from
 * the draft. The draft holds plain-text `#number` tokens, so the dock parses
 * them directly. All dsh imports are type-only.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { GitHubEntry } from '../contract.ts';
import type { NS } from './locales.ts';
/** One parsed mention token in the draft, with its span for precise removal. */
export interface DraftMention {
    readonly number: number;
    readonly start: number;
    readonly end: number;
}
/** Parse the draft's `#number` tokens in order, deduplicating by number. */
export declare function draftMentions(draft: string): readonly DraftMention[];
/** Draft text with one token span removed. */
export declare function withoutToken(draft: string, start: number, end: number): string;
/** Injected business face: the number→entry map and the draft remove action. */
export interface HashDockInjected {
    /** Resolve one mention number to its last-known entry (undefined when unknown). */
    entryOf(number: number): GitHubEntry | undefined;
}
/** Full dock entry props: input zone owner share + injected face + locale seat. */
export type HashDockProps = PropsRuntime<'conversation.input.dock'> & InjectFace<HashDockInjected> & PropsLocale<typeof NS>;
/**
 * Render the referenced-issue chips; null while the draft has no # tokens.
 * @param props - runtime (input currency + actions), inject, and locale shares.
 * @returns the dock strip, or null.
 */
export declare function HashDock({ input, inputActions, entryOf, t }: HashDockProps): import("react").JSX.Element | null;
