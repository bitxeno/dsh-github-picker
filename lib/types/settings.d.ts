/**
 * The `github-picker` settings namespace: the durable insert format and
 * result cap managed from the Web settings page. Registered with the settings
 * provider at plugin load; the runtime reads the owner scope's live value on
 * every call, so a change takes effect without a restart. There is no enable
 * switch — the picker is always on. The data source is always the gh CLI and
 * the repository always resolves from the workspace git remote — there is no
 * device flow, no stored token, no override field.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { SettingsScope } from '@deepseek-ai/dsh-settings';
import type { GhPickerSettings } from './contract.ts';
/**
 * The namespace name as a bare string: DSH 0.1.2-alpha.2 dropped the
 * `settingsNamespace` runtime helper and `register()` validates the namespace
 * shape at compile time (SettingsNamespaceInput) instead.
 */
export declare const GH_PICKER_NAMESPACE = "github-picker";
/** Schemastery schema of the `github-picker` namespace section. */
export declare const GhPickerSettingsSchema: z<GhPickerSettings>;
/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context carrying the settings provider.
 * @returns the owner scope backing the runtime's live reads.
 */
export declare function registerGhPickerSettings(ctx: Context): SettingsScope<GhPickerSettings>;
