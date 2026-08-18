import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { GitHubEntry, GitHubRepoRef, GitHubSearchResult, GhIssueSettings } from '../contract.ts';
import type { SearchErrorKind } from './search.ts';
import type { NS, GhIssueKey } from './locales.ts';
/** The locale key of the hint row for one search failure kind. */
export declare const ERROR_HINT_KEY: Record<SearchErrorKind, GhIssueKey>;
/** The injected business face (the reserved hooks compartment binds `useSettings`). */
export interface PickerInjected {
    hooks: {
        settings: ObservableSnapshot<GhIssueSettings>;
    };
    /** The Remote-backed search seam (per-session cache, host-owned data). */
    search(query: string, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult>;
}
/** Full component props: owner InputZone + session kit + injected face + locale seat. */
export type PickerProps = PropsRuntime<'conversation.input.right'> & InjectFace<PickerInjected> & PropsLocale<typeof NS>;
/**
 * The pick text for one entry under the configured insert format (stays
 * within the mention grammar the Host's pre-step scanner recognizes).
 */
export declare function pickText(entry: GitHubEntry, repo: GitHubRepoRef, settings: GhIssueSettings): string;
/** The composer picker control: the icon button and its searchable popup. */
export declare function GhIssuePickerButton(props: PickerProps): React.ReactElement;
