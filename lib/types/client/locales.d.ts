/**
 * `github-picker` locale namespace: the composer picker button and popup copy
 * (search, loading, empty, the localized failure hint rows) plus the
 * settings section copy (title, insert format, the gh account-connection
 * card). Chinese is the product copy; English mirrors it. There is no enable
 * switch — the picker is always on.
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    nav: string;
    'picker.open': string;
    'picker.search': string;
    'picker.loading': string;
    'picker.loadingMore': string;
    'picker.empty': string;
    'picker.no-repo': string;
    'picker.error.gh-missing': string;
    'picker.error.not-authenticated': string;
    'picker.error.rate-limited': string;
    'picker.error.network': string;
    'picker.error.repo-not-found': string;
    'picker.error.unknown': string;
    'settings.title': string;
    'settings.subtitle': string;
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
/** The `github-picker` namespace key union. */
export type GhIssueKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    nav: string;
    'picker.open': string;
    'picker.search': string;
    'picker.loading': string;
    'picker.loadingMore': string;
    'picker.empty': string;
    'picker.no-repo': string;
    'picker.error.gh-missing': string;
    'picker.error.not-authenticated': string;
    'picker.error.rate-limited': string;
    'picker.error.network': string;
    'picker.error.repo-not-found': string;
    'picker.error.unknown': string;
    'settings.title': string;
    'settings.subtitle': string;
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
export declare const NS = "github-picker";
/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export declare function fmt(template: string, params?: Record<string, string>): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The composer picker and settings copy. */
        [NS]: GhIssueKey;
    }
}
