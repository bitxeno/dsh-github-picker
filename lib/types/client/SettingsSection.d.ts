import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { GhAuthStatus, GhPickerSettings, GhPickerSettingsUpdate } from '../contract.ts';
import type { NS } from './locales.ts';
/**
 * The injected business face. The reserved `hooks` compartment must carry
 * HostObservable sources only: the slot system binds each into a `use<Name>`
 * selector hook (`hooks.settings` → `useSettings`) and REMOVES `hooks` from
 * the component props — so the component never reads `hooks` directly.
 */
export interface SettingsSectionInjected {
    hooks: {
        settings: ObservableSnapshot<GhPickerSettings>;
    };
    update(update: GhPickerSettingsUpdate): Promise<void>;
    getGhAuthStatus(): Promise<GhAuthStatus>;
}
/** Full card props: runtime share (view) + injected face + locale seat. */
export type SettingsSectionProps = PropsRuntime<'plugins.item'> & InjectFace<SettingsSectionInjected> & PropsLocale<typeof NS>;
/**
 * The plugin-configuration card component.
 * `view: 'summary'` is the Plugins-list one-liner; `view: 'page'` is the
 * entry's own page (the shell draws the title/crumb, so the card renders only
 * its body).
 */
export declare function GhPickerSection(props: SettingsSectionProps): string | React.JSX.Element;
