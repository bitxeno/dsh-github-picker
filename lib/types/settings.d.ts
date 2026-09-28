/**
 * The `dsh-github-picker` settings identity: the loader entry id doubles as
 * the settings namespace in DSH >= 0.1.7 (volatile Config fields are served
 * automatically — there is no `ctx.settings.register` anymore). The insert
 * format lives in the plugin Config as a volatile field and reaches the
 * browser through `ctx.configForms`; the Host never reads it.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { GhPickerSettings } from './contract.ts';
/**
 * Loader entry id (cordis.patch.yml) — also the settings namespace the Host
 * serves to `ctx.configForms.get()` in the browser.
 */
export declare const GH_PICKER_ENTRY_ID = "dsh-github-picker";
/**
 * Legacy namespace id used before the DSH 0.1.7 settings rework
 * (`ctx.settings.register('github-picker', …)`). Kept for the wire-contract
 * test and any profile patch still addressing it; the live namespace is
 * {@link GH_PICKER_ENTRY_ID}.
 */
export declare const GH_PICKER_NAMESPACE = "github-picker";
/** Schemastery schema of the insert-format section (client decode + tests). */
export declare const GhPickerSettingsSchema: z<GhPickerSettings>;
/**
 * Suppress the auto-generated settings page: the browser ships its own
 * `plugins.item` card for this entry.
 * @param ctx - the plugin context carrying the settings provider.
 * @returns the disposer ending the presentation policy.
 */
export declare function configureGhPickerSettings(ctx: Context): () => void;
