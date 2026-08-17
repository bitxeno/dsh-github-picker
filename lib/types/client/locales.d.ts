/**
 * `gh-issue` locale namespace: the # picker menu, the referenced-issue dock,
 * and the settings section copy. Chinese is the product copy; English
 * mirrors it.
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    nav: string;
    'menu.aria': string;
    'menu.repo': string;
    'menu.loading': string;
    'menu.empty': string;
    'menu.error': string;
    'menu.error.gh-missing': string;
    'menu.error.not-authenticated': string;
    'menu.error.rate-limited': string;
    'menu.error.network': string;
    'menu.error.repo-not-found': string;
    'menu.error.unknown': string;
    'menu.no-repo': string;
    'settings.title': string;
    'settings.subtitle': string;
    'settings.enabled': string;
    'settings.enabledDesc': string;
    'settings.insertFormat': string;
    'settings.insertFormat.url': string;
    'settings.insertFormat.ref': string;
    'settings.insertFormatDesc': string;
    'settings.authStatus.title': string;
    'settings.authStatus.via': string;
    'settings.authStatus.cli': string;
    'settings.authStatus.period': string;
    'settings.authStatus.loading': string;
    'settings.authStatus.connected': string;
    'settings.authStatus.notConnected': string;
    'settings.authStatus.none': string;
    'settings.authStatus.failed': string;
    'settings.authStatus.error': string;
};
/** The `gh-issue` namespace key union. */
export type GhIssueKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    nav: string;
    'menu.aria': string;
    'menu.repo': string;
    'menu.loading': string;
    'menu.empty': string;
    'menu.error': string;
    'menu.error.gh-missing': string;
    'menu.error.not-authenticated': string;
    'menu.error.rate-limited': string;
    'menu.error.network': string;
    'menu.error.repo-not-found': string;
    'menu.error.unknown': string;
    'menu.no-repo': string;
    'settings.title': string;
    'settings.subtitle': string;
    'settings.enabled': string;
    'settings.enabledDesc': string;
    'settings.insertFormat': string;
    'settings.insertFormat.url': string;
    'settings.insertFormat.ref': string;
    'settings.insertFormatDesc': string;
    'settings.authStatus.title': string;
    'settings.authStatus.via': string;
    'settings.authStatus.cli': string;
    'settings.authStatus.period': string;
    'settings.authStatus.loading': string;
    'settings.authStatus.connected': string;
    'settings.authStatus.notConnected': string;
    'settings.authStatus.none': string;
    'settings.authStatus.failed': string;
    'settings.authStatus.error': string;
};
/** Locale namespace id registered under ctx.locale. */
export declare const NS = "gh-issue";
/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export declare function fmt(template: string, params?: Record<string, string>): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The # reference, dock, and settings copy. */
        [NS]: GhIssueKey;
    }
}
