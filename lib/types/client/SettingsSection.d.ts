import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate } from '../contract.ts';
import type { NS } from './locales.ts';
/**
 * The injected business face. The reserved `hooks` compartment must carry
 * HostObservable sources only: the slot system binds each into a `use<Name>`
 * selector hook (`hooks.settings` → `useSettings`) and REMOVES `hooks` from
 * the component props — so the component never reads `hooks` directly.
 */
export interface SettingsSectionInjected {
    hooks: {
        settings: ObservableSnapshot<GhIssueSettings>;
    };
    update(update: GhIssueSettingsUpdate): Promise<void>;
    getGhAuthStatus(): Promise<GhAuthStatus>;
}
/** Full section props: runtime share + injected face + locale seat. */
export type SettingsSectionProps = PropsRuntime<'settings.section'> & InjectFace<SettingsSectionInjected> & PropsLocale<typeof NS>;
/** The settings section component. */
export declare function GhIssueSection({ useSettings, update, getGhAuthStatus, t }: SettingsSectionProps): import("react").JSX.Element;
